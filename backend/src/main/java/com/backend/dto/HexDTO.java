package com.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class HexDTO {
    private int row;
    private int col;
    private int territory;   // 0 = neutral, 1 = player1, 2 = player2
    private boolean hasMinion;
    private int minionOwner; // 0 if no minion
    private long minionHp;

}
