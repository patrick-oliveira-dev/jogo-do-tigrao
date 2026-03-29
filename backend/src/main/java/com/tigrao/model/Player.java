package com.tigrao.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
public class Player {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private Integer balance = 50;

    private Boolean isHost = false;

    private Boolean isBankrupt = false;
    private Boolean isInactive = false;
    private Integer maxBalanceRecord = 50; // Maior saldo atingido na vida do player

    @ManyToOne
    @JoinColumn(name = "room_code")
    @JsonIgnore
    private GameRoom room;

    public Player() {}

    public Player(String name) {
        this.name = name;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getBalance() { return balance; }
    public void setBalance(Integer balance) { this.balance = balance; }

    public Boolean getIsHost() { return isHost; }
    public void setIsHost(Boolean isHost) { this.isHost = isHost; }

    public Boolean getIsBankrupt() { return isBankrupt != null && isBankrupt; }
    public void setIsBankrupt(Boolean isBankrupt) { this.isBankrupt = isBankrupt; }

    public Boolean getIsInactive() { return isInactive != null && isInactive; }
    public void setIsInactive(Boolean isInactive) { this.isInactive = isInactive; }

    public Integer getMaxBalanceRecord() { return maxBalanceRecord != null ? maxBalanceRecord : balance; }
    public void setMaxBalanceRecord(Integer maxBalanceRecord) { this.maxBalanceRecord = maxBalanceRecord; }

    public GameRoom getRoom() { return room; }
    public void setRoom(GameRoom room) { this.room = room; }
}
