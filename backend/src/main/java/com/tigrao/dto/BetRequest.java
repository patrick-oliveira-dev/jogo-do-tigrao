package com.tigrao.dto;

public class BetRequest {
    private Long playerId;
    private String roomCode;
    private String choice; // "HIGH" ou "LOW"
    private Integer luckyNumber; // 1 a 6
    private Integer amount;

    // Getters and setters
    public Long getPlayerId() { return playerId; }
    public void setPlayerId(Long playerId) { this.playerId = playerId; }
    public String getRoomCode() { return roomCode; }
    public void setRoomCode(String roomCode) { this.roomCode = roomCode; }
    public String getChoice() { return choice; }
    public void setChoice(String choice) { this.choice = choice; }
    public Integer getLuckyNumber() { return luckyNumber; }
    public void setLuckyNumber(Integer luckyNumber) { this.luckyNumber = luckyNumber; }
    public Integer getAmount() { return amount; }
    public void setAmount(Integer amount) { this.amount = amount; }
}
