package com.tigrao.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
public class GameRoom {
    @Id
    private String roomCode;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "VARCHAR(255)")
    private GameStatus status = GameStatus.WAITING_PLAYERS;

    private Integer bankBalance = 0; // Vai receber 1000 * numPlayers no inicio do jogo

    private Integer currentPlayerIndex = 0;

    private Integer lastDiceResult = 1;

    @Column(length = 1000)
    private String lastMessage = "Boa sorte!";
    private Integer turnCounter = 0;

    private Long pendingLoanRequesterId;
    private Long pendingLoanLenderId;
    private Integer pendingLoanAmount;

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<Player> players = new ArrayList<>();

    public GameRoom() {}

    public GameRoom(String roomCode) {
        this.roomCode = roomCode;
    }

    public String getRoomCode() { return roomCode; }
    public void setRoomCode(String roomCode) { this.roomCode = roomCode; }

    public GameStatus getStatus() { return status; }
    public void setStatus(GameStatus status) { this.status = status; }

    public Integer getBankBalance() { return bankBalance; }
    public void setBankBalance(Integer bankBalance) { this.bankBalance = bankBalance; }

    public Integer getCurrentPlayerIndex() { return currentPlayerIndex; }
    public void setCurrentPlayerIndex(Integer currentPlayerIndex) { this.currentPlayerIndex = currentPlayerIndex; }

    public Integer getLastDiceResult() { return lastDiceResult; }
    public void setLastDiceResult(Integer lastDiceResult) { this.lastDiceResult = lastDiceResult; }
    
    public String getLastMessage() { return lastMessage; }
    public void setLastMessage(String lastMessage) { this.lastMessage = lastMessage; }
    
    public Integer getTurnCounter() { return turnCounter; }
    public void setTurnCounter(Integer turnCounter) { this.turnCounter = turnCounter; }

    public Long getPendingLoanRequesterId() { return pendingLoanRequesterId; }
    public void setPendingLoanRequesterId(Long pendingLoanRequesterId) { this.pendingLoanRequesterId = pendingLoanRequesterId; }

    public Long getPendingLoanLenderId() { return pendingLoanLenderId; }
    public void setPendingLoanLenderId(Long pendingLoanLenderId) { this.pendingLoanLenderId = pendingLoanLenderId; }

    public Integer getPendingLoanAmount() { return pendingLoanAmount; }
    public void setPendingLoanAmount(Integer pendingLoanAmount) { this.pendingLoanAmount = pendingLoanAmount; }

    public List<Player> getPlayers() { return players; }
    public void setPlayers(List<Player> players) { this.players = players; }

    public void addPlayer(Player player) {
        players.add(player);
        player.setRoom(this);
    }
}
