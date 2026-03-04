package com.backend.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Setter
@Getter
public class PlayerDTO {
    private int id;
    private double budget;
    private long spawnsLeft;
    private List<MinionDTO> minions;

}
