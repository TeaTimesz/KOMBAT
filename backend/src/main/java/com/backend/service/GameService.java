package com.backend.service;

import Controller.GameMode;
import Controller.TurnManager;
import GameState.GameConfig;
import GameState.GameEnvironment;
import GameState.Hex;
import GameState.Minion;
import GameState.Player;
import GameState.Strategy;
import Parser.Parser;

import com.backend.dto.GameStateDTO;
import com.backend.dto.HexDTO;
import com.backend.dto.MinionDTO;
import com.backend.dto.PlayerDTO;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GameService {

    private final Map<String, GameSession> sessions = new ConcurrentHashMap<>();

    public static class GameSession {
        public final String gameId;
        public final GameEnvironment env;
        public final TurnManager manager;
        public final GameMode mode;
        public final String p1Token;
        public String p2Token;
        public String phase; // "SETUP" | "PLAYING"

        public GameSession(String gameId, GameEnvironment env, TurnManager manager,
                           GameMode mode, String p1Token) {
            this.gameId = gameId;
            this.env = env;
            this.manager = manager;
            this.mode = mode;
            this.p1Token = p1Token;
            this.phase = "SETUP";
        }
    }

    public Map<String, Object> createGame(String modeStr) {
        String gameId = UUID.randomUUID().toString().substring(0, 8);
        String p1Token = UUID.randomUUID().toString();

        GameMode mode = GameMode.valueOf(modeStr.toUpperCase());
        GameEnvironment env = new GameEnvironment();
        TurnManager manager = new TurnManager(env, mode);

        GameSession session = new GameSession(gameId, env, manager, mode, p1Token);
        sessions.put(gameId, session);

        Map<String, Object> result = new HashMap<>();
        result.put("gameId", gameId);
        result.put("p1Token", p1Token);
        result.put("state", toStateDTO(session));
        return result;
    }

    public Map<String, Object> joinGame(String gameId) {
        GameSession session = getSession(gameId);
        String p2Token = UUID.randomUUID().toString();
        session.p2Token = p2Token;

        Map<String, Object> result = new HashMap<>();
        result.put("p2Token", p2Token);
        result.put("state", toStateDTO(session));
        return result;
    }

    public GameStateDTO getState(String gameId) {
        return toStateDTO(getSession(gameId));
    }

    public GameStateDTO spawnFree(String gameId, String playerToken, int row, int col) {
        GameSession session = getSession(gameId);
        Player player = resolvePlayer(session, playerToken);

        Hex hex = session.env.getGrid().getHex(row, col);
        long hp = GameConfig.getInstance().init_hp;
        long def = Math.max(1, hp / 10);
        Strategy strategy = makeDefaultStrategy();

        session.manager.spawnFreeMinion(player, hex, hp, def, strategy);
        return toStateDTO(session);
    }

    public GameStateDTO startGame(String gameId, String playerToken) {
        GameSession session = getSession(gameId);
        resolvePlayer(session, playerToken);
        session.phase = "PLAYING";

        session.manager.startTurn(session.env.getPlayer1(), 1);
        return toStateDTO(session);
    }

    public GameStateDTO buyHex(String gameId, String playerToken, int row, int col) {
        GameSession session = getSession(gameId);
        Player player = resolvePlayer(session, playerToken);

        Hex hex = session.env.getGrid().getHex(row, col);
        session.manager.buyHex(player, hex);
        return toStateDTO(session);
    }

    public GameStateDTO spawnMinion(String gameId, String playerToken, int row, int col,
                                    String strategyStr) {
        GameSession session = getSession(gameId);
        Player player = resolvePlayer(session, playerToken);

        Hex hex = session.env.getGrid().getHex(row, col);
        long hp = GameConfig.getInstance().init_hp;
        long def = Math.max(1, hp / 10);
        Strategy strategy = makeStrategy(strategyStr);

        session.manager.spawnMinion(player, hex, hp, def, strategy);
        return toStateDTO(session);
    }

    public GameStateDTO endTurn(String gameId, String playerToken) {
        GameSession session = getSession(gameId);
        Player currentPlayer = resolvePlayer(session, playerToken);

        session.manager.executeStrategies(currentPlayer);
        session.manager.endTurn();

        while (!session.env.isGameOver()) {
            Player nextPlayer = session.env.getCurrentPlayer();
            int nextPlayerIndex = (nextPlayer == session.env.getPlayer1()) ? 1 : 2;
            session.manager.startTurn(nextPlayer, nextPlayerIndex);

            if (!session.manager.isBot(nextPlayerIndex)) {
                break;
            }
            session.manager.endTurn();
        }

        return toStateDTO(session);
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    public GameSession getSession(String gameId) {
        GameSession session = sessions.get(gameId);
        if (session == null) {
            throw new RuntimeException("Game not found: " + gameId);
        }
        return session;
    }

    private Player resolvePlayer(GameSession session, String token) {
        if (token != null && token.equals(session.p1Token)) return session.env.getPlayer1();
        if (token != null && token.equals(session.p2Token)) return session.env.getPlayer2();
        throw new RuntimeException("Invalid player token");
    }

    private Strategy makeDefaultStrategy() {
        try {
            return new Strategy(new Parser("done").parseStatement());
        } catch (Exception e) {
            return null;
        }
    }

    private Strategy makeStrategy(String strategyStr) {
        if (strategyStr == null || strategyStr.isBlank()) {
            return makeDefaultStrategy();
        }
        try {
            return new Strategy(new Parser(strategyStr).parse());
        } catch (Exception e) {
            return makeDefaultStrategy();
        }
    }

    // ── DTO serialization ───────────────────────────────────────────────────────

    public GameStateDTO toStateDTO(GameSession session) {
        GameEnvironment env = session.env;

        GameStateDTO dto = new GameStateDTO();
        dto.setGameId(session.gameId);
        dto.setPhase(session.phase);
        dto.setTurnCount(env.getTurnCount());
        dto.setCurrentPlayer(env.getCurrentPlayer() == env.getPlayer1() ? 1 : 2);
        dto.setGameOver(env.isGameOver());
        dto.setWinner(env.isGameOver() ? session.manager.getWinner() : 0);
        dto.setPlayer1(toPlayerDTO(env.getPlayer1(), 1, env));
        dto.setPlayer2(toPlayerDTO(env.getPlayer2(), 2, env));

        List<HexDTO> hexList = new ArrayList<>();
        for (int r = 1; r <= 8; r++) {
            for (int c = 1; c <= 8; c++) {
                hexList.add(toHexDTO(env.getGrid().getHex(r, c), env));
            }
        }
        dto.setGrid(hexList);
        return dto;
    }

    private PlayerDTO toPlayerDTO(Player player, int id, GameEnvironment env) {
        PlayerDTO dto = new PlayerDTO();
        dto.setId(id);
        dto.setBudget(player.getBudget());
        dto.setSpawnsLeft(player.getSpawnsLeft());

        List<MinionDTO> minionDTOs = new ArrayList<>();
        for (Minion m : player.getMinions()) {
            if (m.getLocation() != null) {
                MinionDTO mDto = new MinionDTO();
                mDto.setRow(m.getLocation().getRow());
                mDto.setCol(m.getLocation().getCol());
                mDto.setHp(m.getHp());
                mDto.setDefense(m.getDefense());
                minionDTOs.add(mDto);
            }
        }
        dto.setMinions(minionDTOs);
        return dto;
    }

    private HexDTO toHexDTO(Hex hex, GameEnvironment env) {
        HexDTO dto = new HexDTO();
        dto.setRow(hex.getRow());
        dto.setCol(hex.getCol());

        Player territory = hex.getTerritory();
        if (territory == env.getPlayer1()) dto.setTerritory(1);
        else if (territory == env.getPlayer2()) dto.setTerritory(2);
        else dto.setTerritory(0);

        Minion occupant = hex.getOccupant();
        if (occupant != null) {
            dto.setHasMinion(true);
            dto.setMinionOwner(occupant.getOwner() == env.getPlayer1() ? 1 : 2);
            dto.setMinionHp(occupant.getHp());
        } else {
            dto.setHasMinion(false);
            dto.setMinionOwner(0);
            dto.setMinionHp(0);
        }
        return dto;
    }
}
