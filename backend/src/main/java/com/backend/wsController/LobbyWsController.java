package com.backend.wsController;

import com.backend.service.GameService;
import com.backend.service.LobbyService;
import com.backend.service.LobbyService.LobbyRoom;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
public class LobbyWsController {

    @Autowired private LobbyService lobbyService;
    @Autowired private GameService  gameService;
    @Autowired private SimpMessagingTemplate messagingTemplate;

    // ── Lobby lifecycle ───────────────────────────────────────────────────────

    /** P1 creates a lobby and gets back a lobbyId via the correlationId channel. */
    @MessageMapping("/lobby/create")
    public void createLobby(Map<String, Object> payload, SimpMessageHeaderAccessor accessor) {
        String correlationId = (String) payload.get("correlationId");
        try {
            LobbyRoom room = lobbyService.createLobby(accessor.getSessionId());
            reply(correlationId, "created", Map.of("lobbyId", room.lobbyId));
        } catch (Exception e) {
            replyError(correlationId, e.getMessage());
        }
    }

    /** P2 joins an existing lobby. */
    @MessageMapping("/lobby/{lobbyId}/join")
    public void joinLobby(@DestinationVariable String lobbyId,
                          Map<String, Object> payload,
                          SimpMessageHeaderAccessor accessor) {
        String correlationId = (String) payload.get("correlationId");
        try {
            LobbyRoom room = lobbyService.joinLobby(lobbyId, accessor.getSessionId());
            reply(correlationId, "joined", Map.of("lobbyId", lobbyId, "role", "guest"));
            broadcast(lobbyId, buildStatus(room, "PLAYER_JOINED"));
        } catch (Exception e) {
            replyError(correlationId, e.getMessage());
        }
    }

    /** Either player toggles their ready state. */
    @MessageMapping("/lobby/{lobbyId}/ready")
    public void toggleReady(@DestinationVariable String lobbyId,
                            Map<String, Object> payload,
                            SimpMessageHeaderAccessor accessor) {
        try {
            // Client always sends its role; fall back to session lookup if missing
            String role = (String) payload.get("role");
            if (role == null) role = lobbyService.getRoleBySession(accessor.getSessionId());
            LobbyRoom room = lobbyService.toggleReady(lobbyId, role);
            broadcast(lobbyId, buildStatus(room, "READY_CHANGED"));
        } catch (Exception e) {
            broadcast(lobbyId, Map.of("event", "ERROR", "message",
                    e.getMessage() != null ? e.getMessage() : "Ready toggle failed"));
        }
    }

    /** Host signals that setup (minion creation) is starting. */
    @MessageMapping("/lobby/{lobbyId}/start")
    public void startSetup(@DestinationVariable String lobbyId,
                           Map<String, Object> payload,
                           SimpMessageHeaderAccessor accessor) {
        try {
            String role = (String) payload.get("role");
            if (role == null) role = lobbyService.getRoleBySession(accessor.getSessionId());
            if (!"host".equals(role)) return;
            lobbyService.markSetupStarted(lobbyId);
            broadcast(lobbyId, Map.of("event", "SETUP_STARTING"));
        } catch (Exception ignored) {}
    }

    /** Host sends the completed minion kinds → server creates the game and notifies everyone. */
    @MessageMapping("/lobby/{lobbyId}/setup-done")
    @SuppressWarnings("unchecked")
    public void setupDone(@DestinationVariable String lobbyId, Map<String, Object> payload) {
        try {
            List<Map<String, Object>> kinds =
                    (List<Map<String, Object>>) payload.get("kinds");

            Map<String, Object> created = gameService.createGame("DUEL", kinds);
            String gameId  = (String) created.get("gameId");
            String p1Token = (String) created.get("p1Token");
            String p2Token = (String) gameService.joinGame(gameId).get("p2Token");

            // Persist in lobby so reconnecting players can recover via sync
            lobbyService.setGameReady(lobbyId, gameId, p1Token, p2Token, kinds);

            Map<String, Object> msg = new HashMap<>();
            msg.put("event",   "GAME_READY");
            msg.put("gameId",  gameId);
            msg.put("p1Token", p1Token);
            msg.put("p2Token", p2Token);
            msg.put("kinds",   kinds);
            broadcast(lobbyId, msg);
        } catch (Exception e) {
            broadcast(lobbyId, Map.of("event", "ERROR", "message",
                    e.getMessage() != null ? e.getMessage() : "Setup failed"));
        }
    }

    /** Sync: re-register a reconnected client's WS session and broadcast current state. */
    @MessageMapping("/lobby/{lobbyId}/sync")
    public void sync(@DestinationVariable String lobbyId,
                     Map<String, Object> payload,
                     SimpMessageHeaderAccessor accessor) {
        try {
            String role = (String) payload.get("role");
            LobbyRoom room = lobbyService.syncSession(lobbyId, accessor.getSessionId(), role);
            broadcast(lobbyId, buildStatus(room, "SYNC"));
        } catch (Exception ignored) {}
    }

    /** Reset ready states for a rematch. */
    @MessageMapping("/lobby/{lobbyId}/reset")
    public void reset(@DestinationVariable String lobbyId) {
        try {
            LobbyRoom room = lobbyService.reset(lobbyId);
            broadcast(lobbyId, buildStatus(room, "RESET"));
        } catch (Exception ignored) {}
    }

    // ── Disconnect handling ───────────────────────────────────────────────────

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        String lobbyId   = lobbyService.getLobbyIdBySession(sessionId);
        if (lobbyId == null) return;

        LobbyService.DisconnectResult result = lobbyService.handleDisconnect(sessionId);
        if (result == null) return;

        if (result.room() != null) {
            broadcast(lobbyId, buildStatus(result.room(), result.event()));
        } else {
            broadcast(lobbyId, Map.of("event", result.event()));
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Map<String, Object> buildStatus(LobbyRoom room, String event) {
        Map<String, Object> m = new HashMap<>();
        m.put("event",      event);
        m.put("hasGuest",   room.hasGuest);
        m.put("hostReady",  room.hostReady);
        m.put("guestReady", room.guestReady);
        m.put("bothReady",  room.bothReady());
        // Include game info so reconnecting players can navigate immediately
        if (room.isGameReady()) {
            m.put("gameId",  room.gameId);
            m.put("p1Token", room.p1Token);
            m.put("p2Token", room.p2Token);
            m.put("kinds",   room.kinds);
        }
        return m;
    }

    private void broadcast(String lobbyId, Map<String, Object> payload) {
        messagingTemplate.convertAndSend(
                "/topic/lobby/" + lobbyId + "/status", (Object) payload);
    }

    private void reply(String correlationId, String key, Map<String, Object> payload) {
        messagingTemplate.convertAndSend(
                "/topic/lobby/" + correlationId + "/" + key, (Object) payload);
    }

    private void replyError(String correlationId, String message) {
        messagingTemplate.convertAndSend(
                "/topic/lobby/" + correlationId + "/error",
                (Object) Map.of("message", message != null ? message : "Error"));
    }
}
