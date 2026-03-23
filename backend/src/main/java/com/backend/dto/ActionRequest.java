package com.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class ActionRequest {
    private String playerToken;
    private String type;
    private Integer row;
    private Integer col;
    private String strategy;
    private Long defenseFactor;

}
