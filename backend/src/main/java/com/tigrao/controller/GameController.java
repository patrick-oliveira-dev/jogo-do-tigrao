package com.tigrao.controller;

import com.tigrao.dto.BetRequest;
import com.tigrao.model.GameRoom;
import com.tigrao.model.GameStatus;
import com.tigrao.repository.GameRoomRepository;
import com.tigrao.repository.PlayerRepository;
import com.tigrao.service.GameEngineService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/game")
@CrossOrigin(origins = "*") 
public class GameController {

    @Autowired
    private GameEngineService gameEngine;

    @Autowired
    private GameRoomRepository roomRepo;

    @Autowired
    private PlayerRepository playerRepo;

    @PostMapping("/create")
    public ResponseEntity<GameRoom> createRoom(@RequestBody com.tigrao.dto.JoinRoomRequest req) {
        GameRoom room = gameEngine.createRoom(req.getRoomCode(), req.getPlayerName());
        return ResponseEntity.ok(room);
    }

    @PostMapping("/join")
    public ResponseEntity<GameRoom> joinRoom(@RequestBody com.tigrao.dto.JoinRoomRequest req) {
        GameRoom room = gameEngine.joinRoom(req.getRoomCode(), req.getPlayerName());
        return ResponseEntity.ok(room);
    }

    @PostMapping("/start/{roomCode}")
    public ResponseEntity<GameRoom> startGame(@PathVariable String roomCode) {
        GameRoom room = gameEngine.startGame(roomCode);
        return ResponseEntity.ok(room);
    }

    @PostMapping("/bet")
    public ResponseEntity<?> doBet(@RequestBody BetRequest betRequest) {
        gameEngine.processBet(betRequest);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/loan")
    public ResponseEntity<?> doLoan(@RequestBody com.tigrao.dto.LoanRequest loanReq) {
        gameEngine.processLoan(loanReq);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/loan/respond")
    public ResponseEntity<?> respondToLoan(@RequestParam String roomCode, @RequestParam boolean accepted) {
        gameEngine.resolveLoan(roomCode, accepted);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/room/{roomCode}")
    public ResponseEntity<GameRoom> getRoomInfo(@PathVariable String roomCode) {
        return roomRepo.findById(roomCode)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/rooms")
    public ResponseEntity<List<GameRoom>> getRooms() {
        return ResponseEntity.ok(roomRepo.findAll().stream()
                .filter(r -> r.getStatus() != GameStatus.CLOSED)
                .toList());
    }

    @GetMapping("/ranking")
    public ResponseEntity<java.util.Map<String, List<com.tigrao.dto.RankingDTO>>> getRanking() {
        java.util.Map<String, List<com.tigrao.dto.RankingDTO>> result = new java.util.HashMap<>();
        result.put("winners", playerRepo.findTopWinners());
        result.put("gold", playerRepo.findTopBalances());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/replay/{roomCode}")
    public ResponseEntity<?> replayRoom(@PathVariable String roomCode, @RequestParam Long requesterId) {
        GameRoom room = gameEngine.replayRoom(roomCode, requesterId);
        return ResponseEntity.ok(room);
    }

    @PostMapping("/close/{roomCode}")
    public ResponseEntity<?> closeRoom(@PathVariable String roomCode, @RequestParam Long requesterId) {
        gameEngine.closeRoom(roomCode, requesterId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/leave/{roomCode}/{playerName}")
    public ResponseEntity<?> leaveRoom(@PathVariable String roomCode, @PathVariable String playerName) {
        gameEngine.leaveRoom(roomCode, playerName);
        return ResponseEntity.ok().build();
    }
}
