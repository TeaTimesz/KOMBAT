package com.backend.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Setter
@Getter
public class GameStateDTO {
    private String gameId;
    private String phase;
    private int turnCount;
    private int currentPlayer;
    private boolean gameOver;
    private int winner;
    private PlayerDTO player1;
    private PlayerDTO player2;
    private List<HexDTO> grid;

}
