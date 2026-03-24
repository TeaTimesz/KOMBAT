package com.backend.controller;

import com.backend.service.LobbyService;
import com.backend.service.LobbyService.LobbyRoom;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/lobby")
public class LobbyController {

    @Autowired
    private LobbyService lobbyService;

    /** Poll endpoint so the frontend can reliably detect when a game is ready
     *  without relying solely on the WebSocket subscription being alive. */
    @GetMapping("/{lobbyId}/status")
    public ResponseEntity<?> getStatus(@PathVariable String lobbyId) {
        try {
            LobbyRoom room = lobbyService.get(lobbyId);
            Map<String, Object> result = new HashMap<>();
            result.put("hasGuest",     room.hasGuest);
            result.put("hostReady",    room.hostReady);
            result.put("guestReady",   room.guestReady);
            result.put("bothReady",    room.bothReady());
            result.put("setupStarted", room.setupStarted);
            if (room.isGameReady()) {
                result.put("gameId",  room.gameId);
                result.put("p1Token", room.p1Token);
                result.put("p2Token", room.p2Token);
                result.put("kinds",   room.kinds);
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
