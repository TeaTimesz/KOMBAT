package com.backend.wsController;

import com.backend.dto.ActionRequest;
import com.backend.dto.GameStateDTO;
import com.backend.service.GameService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class GameWsController {

    @Autowired
    private GameService gameService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/game/{gameId}/action")
    public void handleAction(@DestinationVariable String gameId, ActionRequest request) {
        GameStateDTO state = null;

        if (request.getType() == null) return;

        state = switch (request.getType()) {
            case "SPAWN_FREE" -> gameService.spawnFree(
                    gameId, request.getPlayerToken(), request.getRow(), request.getCol(),
                    request.getStrategy(), request.getDefenseFactor());
            case "SPAWN" -> gameService.spawnMinion(
                    gameId, request.getPlayerToken(), request.getRow(), request.getCol(),
                    request.getStrategy(), request.getDefenseFactor());
            case "BUY_HEX" -> gameService.buyHex(
                    gameId, request.getPlayerToken(), request.getRow(), request.getCol());
            case "END_TURN" -> gameService.endTurn(gameId, request.getPlayerToken());
            default -> state;
        };

        if (state != null) {
            messagingTemplate.convertAndSend("/topic/game/" + gameId + "/state", state);
        }
    }
}
