package com.backend.dto;

import lombok.Getter;
import lombok.Setter;
import java.util.List;
import java.util.Map;

@Setter
@Getter
public class GameCreateRequest {
    private String mode;
    private List<Map<String, Object>> kinds;

}
