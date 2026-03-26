package com.backend.wsController;

import com.backend.dto.ActionRequest;
import com.backend.dto.GameStateDTO;
import com.backend.service.GameService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class GameWsController {

    @Autowired
    private GameService gameService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/game/{gameId}/action")
    public void handleAction(@DestinationVariable String gameId, ActionRequest request) {
        if (request.getType() == null) return;

        try {
            GameStateDTO state = switch (request.getType()) {
                case "SPAWN_FREE" -> gameService.spawnFree(
                        gameId, request.getPlayerToken(), request.getRow(), request.getCol(),
                        request.getStrategy(), request.getDefenseFactor());
                case "START_GAME" -> gameService.startGame(gameId, request.getPlayerToken());
                case "BUY_HEX"   -> gameService.buyHex(
                        gameId, request.getPlayerToken(), request.getRow(), request.getCol());
                case "SPAWN"     -> gameService.spawnMinion(
                        gameId, request.getPlayerToken(), request.getRow(), request.getCol(),
                        request.getStrategy(), request.getDefenseFactor());
                case "END_TURN"  -> gameService.endTurn(gameId, request.getPlayerToken());
                case "BOT_MOVE"         -> gameService.botStep(gameId);
                case "BOT_BUY_HEX"     -> gameService.botBuyHex(gameId);
                case "BOT_SPAWN_MINION"-> gameService.botSpawnMinion(gameId);
                default -> null;
            };

            if (state != null) {
                messagingTemplate.convertAndSend("/topic/game/" + gameId + "/state", state);
            }
        } catch (Exception e) {
            messagingTemplate.convertAndSend(
                    "/topic/game/" + gameId + "/error",
                    (Object) Map.of("action", request.getType(),
                           "message", e.getMessage() != null ? e.getMessage() : "Unknown error"));
        }
    }
}
