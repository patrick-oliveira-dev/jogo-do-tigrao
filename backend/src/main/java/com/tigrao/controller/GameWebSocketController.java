package com.tigrao.controller;

import com.tigrao.dto.BetRequest;
import com.tigrao.dto.GameEvent;
import com.tigrao.dto.LoanRequest;
import com.tigrao.service.GameEngineService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class GameWebSocketController {

    @Autowired
    private GameEngineService gameEngine;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Recebe chamadas do cliente em /app/bet
    @MessageMapping("/bet")
    public void handleBet(BetRequest betRequest) {
        try {
            gameEngine.processBet(betRequest);
        } catch (Exception e) {
            String topic = "/topic/room/" + betRequest.getRoomCode();
            messagingTemplate.convertAndSend(topic, new GameEvent("ERROR", e.getMessage(), null));
        }
    }

    // Recebe chamadas do cliente em /app/loan
    @MessageMapping("/loan")
    public void handleLoan(LoanRequest loanRequest) {
        try {
            gameEngine.processLoan(loanRequest);
        } catch (Exception e) {
            String topic = "/topic/room/" + loanRequest.getRoomCode();
            messagingTemplate.convertAndSend(topic, new GameEvent("ERROR", e.getMessage(), null));
        }
    }
}
