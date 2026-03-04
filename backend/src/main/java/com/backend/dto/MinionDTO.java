package com.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class MinionDTO {
    private int row;
    private int col;
    private long hp;
    private long defense;

}
