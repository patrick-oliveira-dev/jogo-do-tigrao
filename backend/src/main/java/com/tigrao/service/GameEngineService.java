package com.tigrao.service;

import com.tigrao.dto.BetRequest;
import com.tigrao.dto.GameEvent;
import com.tigrao.dto.LoanRequest;
import com.tigrao.model.GameRoom;
import com.tigrao.model.GameStatus;
import com.tigrao.model.Player;
import com.tigrao.repository.GameRoomRepository;
import com.tigrao.repository.PlayerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Random;

@Service
public class GameEngineService {

    @Autowired
    private GameRoomRepository roomRepo;
    
    @Autowired
    private PlayerRepository playerRepo;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private Random random = new Random();

    @Transactional
    public GameRoom createRoom(String roomCode, String hostName) {
        if (roomRepo.existsById(roomCode)) {
            throw new RuntimeException("A sala " + roomCode + " já existe!");
        }
        GameRoom room = new GameRoom(roomCode);
        Player host = new Player(hostName);
        host.setIsHost(true);
        room.addPlayer(host);
        roomRepo.save(room);
        return room;
    }

    @Transactional
    public GameRoom joinRoom(String roomCode, String playerName) {
        GameRoom room = roomRepo.findById(roomCode).orElseThrow(() -> new RuntimeException("Sala não encontrada"));
        boolean alreadyExists = room.getPlayers().stream().anyMatch(p -> p.getName().equalsIgnoreCase(playerName));
        if (alreadyExists) {
            // Reconexão: O jogador já existe na sala, então só devolvemos a sala para ele plugar a tela!
            return room;
        }
        
        if (room.getStatus() != GameStatus.WAITING_PLAYERS) {
            throw new RuntimeException("Jogo já começou. Tente usar o mesmo nome para reconectar.");
        }

        Player player = new Player(playerName);
        room.addPlayer(player);
        roomRepo.save(room);
        broadcastUpdate(room, "Jogador " + playerName + " entrou.");
        return room;
    }

    @Transactional
    public GameRoom startGame(String roomCode) {
        GameRoom room = roomRepo.findById(roomCode).orElseThrow();
        if (room.getPlayers().size() < 1) throw new RuntimeException("Poucos jogadores");
        
        room.setStatus(GameStatus.IN_PROGRESS);
        room.setBankBalance(1000 * room.getPlayers().size());
        room.setCurrentPlayerIndex(0);
        roomRepo.save(room);
        broadcastUpdate(room, "O jogo começou! A banca tem " + room.getBankBalance());
        return room;
    }

    @Transactional
    public void processBet(BetRequest betReq) {
        GameRoom room = roomRepo.findById(betReq.getRoomCode()).orElseThrow();
        Player player = playerRepo.findById(betReq.getPlayerId()).orElseThrow();

        // Validations
        if (room.getStatus() != GameStatus.IN_PROGRESS) throw new RuntimeException("Jogo não está em andamento");
        Player currentPlayer = room.getPlayers().get(room.getCurrentPlayerIndex());
        if (!currentPlayer.getId().equals(player.getId())) throw new RuntimeException("Não é sua vez");
        if (player.getBalance() < betReq.getAmount()) throw new RuntimeException("Saldo insuficiente");
        if (betReq.getAmount() < 10) throw new RuntimeException("Aposta mínima é 10");

        // Rolagem
        int diceResult = random.nextInt(6) + 1; // 1 a 6
        boolean isHigh = diceResult >= 4;
        boolean betHigh = "HIGH".equalsIgnoreCase(betReq.getChoice());
        boolean hitSide = (isHigh && betHigh) || (!isHigh && !betHigh);
        boolean hitNumber = (diceResult == betReq.getLuckyNumber());

        String resultMsg = "Dado caiu " + diceResult + ". ";

        if (hitSide && hitNumber) {
            int winnings = betReq.getAmount() * 2;
            player.setBalance(player.getBalance() + winnings);
            room.setBankBalance(room.getBankBalance() - winnings);
            resultMsg += player.getName() + " acertou lado e número! Ganhou " + winnings;
        } else if (hitSide && !hitNumber) {
            int winnings = betReq.getAmount();
            player.setBalance(player.getBalance() + winnings);
            room.setBankBalance(room.getBankBalance() - winnings);
            resultMsg += player.getName() + " acertou o lado. Ganhou " + winnings;
        } else if (!hitSide && hitNumber) {
            resultMsg += player.getName() + " errou o lado mas acertou o número da sorte. Não perde nada!";
        } else {
            player.setBalance(player.getBalance() - betReq.getAmount());
            room.setBankBalance(room.getBankBalance() + betReq.getAmount());
            resultMsg += player.getName() + " errou! Perdeu " + betReq.getAmount();
        }

        // Atualiza recorde pessoal
        if (player.getBalance() > player.getMaxBalanceRecord()) {
             player.setMaxBalanceRecord(player.getBalance());
        }

        if (player.getBalance() <= 0) {
            player.setIsBankrupt(true);
        }

        // Pass Turn e Atualiza Estado da Mesa p/ Polling HTTP
        room.setLastDiceResult(diceResult);
        room.setLastMessage(resultMsg);
        room.setTurnCounter(room.getTurnCounter() != null ? room.getTurnCounter() + 1 : 1);
        
        advanceTurn(room);
        playerRepo.save(player);
        roomRepo.save(room);

        GameEvent event = new GameEvent("DICE_ROLLED", resultMsg, room);
        event.setDiceResult(diceResult);
        event.setPreviousPlayerId(player.getId());
        
        messagingTemplate.convertAndSend("/topic/room/" + room.getRoomCode(), event);
        
        checkGameOver(room);
    }

    private void advanceTurn(GameRoom room) {
        int originalIndex = room.getCurrentPlayerIndex();
        int newIndex = (originalIndex + 1) % room.getPlayers().size();
        
        // Skip bankrupt or inactive players
        int attempts = 0;
        while ((Boolean.TRUE.equals(room.getPlayers().get(newIndex).getIsBankrupt()) || Boolean.TRUE.equals(room.getPlayers().get(newIndex).getIsInactive())) && attempts < room.getPlayers().size()) {
            newIndex = (newIndex + 1) % room.getPlayers().size();
            attempts++;
        }
        room.setCurrentPlayerIndex(newIndex);
    }

    @Transactional
    public void processLoan(LoanRequest loanReq) {
        Player requester = playerRepo.findById(loanReq.getRequesterId()).orElseThrow();
        Player lender = playerRepo.findById(loanReq.getLenderId()).orElseThrow();
        GameRoom room = roomRepo.findById(loanReq.getRoomCode()).orElseThrow();

        if (loanReq.getAmount() % 10 != 0) throw new RuntimeException("Empréstimo deve ser múltiplo de 10");
        if (requester.getBalance() > 10) throw new RuntimeException("Só pode pedir empréstimo se tiver 10 ou menos");
        if (lender.getBalance() < loanReq.getAmount() * 2) throw new RuntimeException("Lender insuficiente");

        // Apenas registra o pedido na sala
        room.setPendingLoanRequesterId(requester.getId());
        room.setPendingLoanLenderId(lender.getId());
        room.setPendingLoanAmount(loanReq.getAmount());

        room.setLastMessage(requester.getName() + " pediu R$ " + loanReq.getAmount() + " para " + lender.getName() + "... Aguardando.");
        room.setTurnCounter(room.getTurnCounter() != null ? room.getTurnCounter() + 1 : 1);
        roomRepo.save(room);

        broadcastUpdate(room, requester.getName() + " pediu emprestado para " + lender.getName());
    }

    @Transactional
    public void resolveLoan(String roomCode, boolean accepted) {
        GameRoom room = roomRepo.findById(roomCode).orElseThrow();
        if (room.getPendingLoanRequesterId() == null) return;

        Player requester = playerRepo.findById(room.getPendingLoanRequesterId()).orElseThrow();
        Player lender = playerRepo.findById(room.getPendingLoanLenderId()).orElseThrow();

        if (accepted) {
            requester.setBalance(requester.getBalance() + room.getPendingLoanAmount());
            lender.setBalance(lender.getBalance() - room.getPendingLoanAmount());
            playerRepo.save(requester);
            playerRepo.save(lender);
            room.setLastMessage(lender.getName() + " ACEITOU e emprestou R$ " + room.getPendingLoanAmount());
        } else {
            room.setLastMessage(lender.getName() + " RECUSOU o pedido de empréstimo.");
        }

        // Limpa o estado pendente
        room.setPendingLoanRequesterId(null);
        room.setPendingLoanLenderId(null);
        room.setPendingLoanAmount(null);
        room.setTurnCounter(room.getTurnCounter() != null ? room.getTurnCounter() + 1 : 1);
        
        roomRepo.save(room);
        broadcastUpdate(room, "Empréstimo resolvido");
    }

    @Transactional
    public void leaveRoom(String roomCode, String playerName) {
        GameRoom room = roomRepo.findById(roomCode).orElseThrow();
        room.getPlayers().stream()
            .filter(p -> p.getName().equalsIgnoreCase(playerName))
            .findFirst()
            .ifPresent(p -> {
                p.setIsInactive(true);
                playerRepo.save(p);
                
                // Se era a vez da pessoa que saiu, avança agora!
                Player currentPlayer = room.getPlayers().get(room.getCurrentPlayerIndex());
                if (currentPlayer.getName().equalsIgnoreCase(playerName)) {
                    advanceTurn(room);
                    room.setTurnCounter((room.getTurnCounter() != null ? room.getTurnCounter() : 0) + 1);
                }
            });
        
        roomRepo.save(room);
        broadcastUpdate(room, "Jogador " + playerName + " abandonou a partida.");
    }

    private void checkGameOver(GameRoom room) {
        boolean allBankrupt = room.getPlayers().stream().allMatch(Player::getIsBankrupt);
        boolean bankBankrupt = room.getBankBalance() <= 0;

        if (allBankrupt || bankBankrupt) {
            room.setStatus(GameStatus.FINISHED);
            String msg = bankBankrupt ? "A Banca quebrou! Fim de jogo." : "Todos os jogadores quebraram! A Banca venceu.";
            room.setLastMessage(msg);
            roomRepo.save(room);
            
            GameEvent event = new GameEvent("GAME_OVER", msg, room);
            messagingTemplate.convertAndSend("/topic/room/" + room.getRoomCode(), event);
        }
    }

    private void broadcastUpdate(GameRoom room, String message) {
        GameEvent event = new GameEvent("ROOM_UPDATE", message, room);
        messagingTemplate.convertAndSend("/topic/room/" + room.getRoomCode(), event);
    }

    @Transactional
    public GameRoom replayRoom(String roomCode, Long requesterId) {
        GameRoom room = roomRepo.findById(roomCode).orElseThrow();
        Player requester = playerRepo.findById(requesterId).orElseThrow();
        if (!requester.getIsHost()) throw new RuntimeException("Apenas o Host pode pedir revanche.");
        if (room.getStatus() != GameStatus.FINISHED) throw new RuntimeException("A sala não está finalizada.");

        room.setStatus(GameStatus.IN_PROGRESS);
        room.setBankBalance(1000 * room.getPlayers().size());
        room.setCurrentPlayerIndex(0);
        room.setLastDiceResult(1);
        room.setLastMessage("Nova partida iniciada! Que vença o melhor!");
        room.setTurnCounter(room.getTurnCounter() != null ? room.getTurnCounter() + 1 : 1);

        for (Player p : room.getPlayers()) {
            p.setBalance(50);
            p.setIsBankrupt(false);
            playerRepo.save(p);
        }
        
        roomRepo.save(room);
        broadcastUpdate(room, "Nova partida iniciada! Que vença o melhor!");
        return room;
    }

    @Transactional
    public void closeRoom(String roomCode, Long requesterId) {
        GameRoom room = roomRepo.findById(roomCode).orElseThrow();
        Player requester = playerRepo.findById(requesterId).orElseThrow();
        
        // Se o jogo está rolando, apenas o host pode fechar. 
        // Se já terminou, deixamos qualquer um fechar para limpar o lobby se o host sumir.
        if (room.getStatus() == GameStatus.IN_PROGRESS && !Boolean.TRUE.equals(requester.getIsHost())) {
             throw new RuntimeException("Apenas o Host pode fechar uma sala em andamento.");
        }

        room.setStatus(GameStatus.CLOSED);
        roomRepo.save(room);
        System.out.println("[GameLog] Sala " + roomCode + " marcada como CLOSED por " + requester.getName());
    }
}
