package com.backend.service;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LobbyService {

    public static class LobbyRoom {
        public final String lobbyId;
        public String hostSessionId;
        public String guestSessionId;
        public boolean hasGuest  = false;
        public boolean hostReady = false;
        public boolean guestReady = false;
        public boolean setupStarted = false;
        // Set after game creation so reconnecting players can still navigate
        public String gameId;
        public String p1Token;
        public String p2Token;
        public List<Map<String, Object>> kinds;

        LobbyRoom(String lobbyId, String hostSessionId) {
            this.lobbyId = lobbyId;
            this.hostSessionId = hostSessionId;
        }

        public boolean bothReady() { return hasGuest && hostReady && guestReady; }

        public boolean isGameReady() { return gameId != null; }

        /** Reset ready/setup state between games — keeps players connected. */
        public void reset() {
            hostReady   = false;
            guestReady  = false;
            setupStarted = false;
            gameId  = null;
            p1Token = null;
            p2Token = null;
            kinds   = null;
        }
    }

    // lobbyId  →  room
    private final Map<String, LobbyRoom> lobbies = new ConcurrentHashMap<>();
    // wsSessionId  →  lobbyId
    private final Map<String, String>   sessionToLobby = new ConcurrentHashMap<>();
    // wsSessionId  →  role  ("host" | "guest")
    private final Map<String, String>   sessionToRole  = new ConcurrentHashMap<>();

    // ── CRUD ──────────────────────────────────────────────────────────────────

    public LobbyRoom createLobby(String hostSessionId) {
        String lobbyId = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        LobbyRoom room = new LobbyRoom(lobbyId, hostSessionId);
        lobbies.put(lobbyId, room);
        trackSession(hostSessionId, lobbyId, "host");
        return room;
    }

    public LobbyRoom joinLobby(String lobbyId, String guestSessionId) {
        LobbyRoom room = get(lobbyId);
        if (room.hasGuest) {
            // Allow rejoin only if the previous guest's session is no longer tracked
            // (disconnect event already fired, or session expired ungracefully)
            boolean oldSessionAlive = room.guestSessionId != null
                    && sessionToLobby.containsKey(room.guestSessionId);
            if (oldSessionAlive) throw new RuntimeException("Room is full");
            // Evict the stale guest entry
            if (room.guestSessionId != null) untrackSession(room.guestSessionId);
            room.hasGuest  = false;
            room.guestReady = false;
        }
        room.guestSessionId = guestSessionId;
        room.hasGuest = true;
        trackSession(guestSessionId, lobbyId, "guest");
        return room;
    }

    /** Toggle ready by role — client always sends its role so no session lookup needed. */
    public LobbyRoom toggleReady(String lobbyId, String role) {
        LobbyRoom room = get(lobbyId);
        if ("host".equals(role))  room.hostReady  = !room.hostReady;
        if ("guest".equals(role)) room.guestReady = !room.guestReady;
        return room;
    }

    public LobbyRoom markSetupStarted(String lobbyId) {
        LobbyRoom room = get(lobbyId);
        room.setupStarted = true;
        return room;
    }

    public LobbyRoom reset(String lobbyId) {
        LobbyRoom room = get(lobbyId);
        room.reset();
        return room;
    }

    public LobbyRoom setGameReady(String lobbyId, String gameId, String p1Token, String p2Token,
                                   List<Map<String, Object>> kinds) {
        LobbyRoom room = get(lobbyId);
        room.gameId  = gameId;
        room.p1Token = p1Token;
        room.p2Token = p2Token;
        room.kinds   = kinds;
        return room;
    }

    /** Update WS session ID for a role (handles page refresh / reconnect). */
    public LobbyRoom syncSession(String lobbyId, String sessionId, String role) {
        LobbyRoom room = get(lobbyId);
        if ("host".equals(role)) {
            if (room.hostSessionId != null) untrackSession(room.hostSessionId);
            room.hostSessionId = sessionId;
        } else {
            if (room.guestSessionId != null) untrackSession(room.guestSessionId);
            room.guestSessionId = sessionId;
        }
        trackSession(sessionId, lobbyId, role);
        return room;
    }

    /**
     * Handle WebSocket disconnect.
     * @return the updated room (host changed / guest left), or null if lobby is gone.
     */
    public DisconnectResult handleDisconnect(String sessionId) {
        String lobbyId = sessionToLobby.remove(sessionId);
        if (lobbyId == null) return null;
        String role = sessionToRole.remove(sessionId);
        LobbyRoom room = lobbies.get(lobbyId);
        if (room == null) return null;

        if ("host".equals(role)) {
            if (room.hasGuest && room.guestSessionId != null) {
                // Promote guest to host
                sessionToRole.put(room.guestSessionId, "host");
                room.hostSessionId  = room.guestSessionId;
                room.guestSessionId = null;
                room.hasGuest       = false;
                room.hostReady      = room.guestReady;
                room.guestReady     = false;
                room.setupStarted   = false;
                return new DisconnectResult(room, "HOST_CHANGED");
            } else {
                // No guest present — keep lobby so host can reconnect (page refresh).
                // The lobby will be re-claimed when the host calls sync again.
                room.hostSessionId = null;
                return null; // nothing useful to broadcast
            }
        } else {
            // Guest left
            room.guestSessionId = null;
            room.hasGuest  = false;
            room.guestReady = false;
            return new DisconnectResult(room, "PLAYER_LEFT");
        }
    }

    public record DisconnectResult(LobbyRoom room, String event) {}

    // ── Lookup helpers ────────────────────────────────────────────────────────

    public LobbyRoom get(String lobbyId) {
        LobbyRoom room = lobbies.get(lobbyId);
        if (room == null) throw new RuntimeException("Lobby not found: " + lobbyId);
        return room;
    }

    public String getLobbyIdBySession(String sessionId) {
        return sessionToLobby.get(sessionId);
    }

    public String getRoleBySession(String sessionId) {
        return sessionToRole.get(sessionId);
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private void trackSession(String sessionId, String lobbyId, String role) {
        sessionToLobby.put(sessionId, lobbyId);
        sessionToRole.put(sessionId, role);
    }

    private void untrackSession(String sessionId) {
        sessionToLobby.remove(sessionId);
        sessionToRole.remove(sessionId);
    }
}
