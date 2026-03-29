package com.tigrao.dto;

import com.tigrao.model.GameRoom;

public class GameEvent {
    private String type; // "ROOM_UPDATE", "DICE_ROLLED", "ERROR", "GAME_OVER"
    private String message;
    private GameRoom room;
    private Integer diceResult;
    private Long previousPlayerId;

    public GameEvent(String type, String message, GameRoom room) {
        this.type = type;
        this.message = message;
        this.room = room;
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public GameRoom getRoom() { return room; }
    public void setRoom(GameRoom room) { this.room = room; }
    public Integer getDiceResult() { return diceResult; }
    public void setDiceResult(Integer diceResult) { this.diceResult = diceResult; }
    public Long getPreviousPlayerId() { return previousPlayerId; }
    public void setPreviousPlayerId(Long previousPlayerId) { this.previousPlayerId = previousPlayerId; }
}
