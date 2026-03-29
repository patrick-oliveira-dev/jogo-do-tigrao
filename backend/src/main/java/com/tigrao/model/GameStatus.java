package com.tigrao.model;

public enum GameStatus {
    WAITING_PLAYERS, // Sala criada, esperando jogadores aceitarem ou host iniciar
    IN_PROGRESS,     // Jogo rolando
    FINISHED,        // Banca quebrou ou todos os jogadores quebraram
    CLOSED           // Sala encerrada pelo Host (oculta do Lobby, mas mantida p/ Ranking)
}
