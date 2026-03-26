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

    public Map<String, Object> createGame(String modeStr, List<Map<String, Object>> kinds) {
        return createGame(modeStr);
    }

    public Map<String, Object> createGame(String modeStr) {
        String gameId = UUID.randomUUID().toString().substring(0, 8);
        String p1Token = UUID.randomUUID().toString();

        if (modeStr == null || modeStr.isBlank())
            throw new RuntimeException("Game mode is required (DUEL, SOLITAIRE, or AUTO)");
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

    public GameStateDTO spawnFree(String gameId, String playerToken, int row, int col,
                                  String strategyStr, Long defenseFactor) {
        GameSession session = getSession(gameId);
        Player player = resolvePlayer(session, playerToken);

        Hex hex = session.env.getGrid().getHex(row, col);
        long hp = GameConfig.getInstance().init_hp;
        long def = (defenseFactor != null && defenseFactor >= 1) ? defenseFactor : Math.max(1, hp / 10);
        Strategy strategy = makeStrategy(strategyStr);

        boolean ok = session.manager.spawnFreeMinion(player, hex, hp, def, strategy);
        if (!ok) throw new RuntimeException("Cannot spawn free minion here.");
        return toStateDTO(session);
    }

    public GameStateDTO startGame(String gameId, String playerToken) {
        GameSession session = getSession(gameId);
        resolvePlayer(session, playerToken);
        session.phase = "PLAYING";

        // Apply economy for the first player without triggering bot buy/spawn.
        // In AUTO mode the player will click BOT ACTION to perform the first bot turn.
        session.manager.applyEconomyOnly(session.env.getPlayer1());
        return toStateDTO(session);
    }

    public GameStateDTO buyHex(String gameId, String playerToken, int row, int col) {
        GameSession session = getSession(gameId);
        Player player = resolvePlayer(session, playerToken);

        Hex hex = session.env.getGrid().getHex(row, col);
        boolean ok = session.manager.buyHex(player, hex);
        if (!ok) throw new RuntimeException("Cannot buy that hex — must be unclaimed, adjacent to your territory, and you need enough budget.");
        return toStateDTO(session);
    }

    public GameStateDTO spawnMinion(String gameId, String playerToken, int row, int col,
                                    String strategyStr, Long defenseFactor) {
        GameSession session = getSession(gameId);
        Player player = resolvePlayer(session, playerToken);

        Hex hex = session.env.getGrid().getHex(row, col);
        long hp = GameConfig.getInstance().init_hp;
        long def = (defenseFactor != null && defenseFactor >= 1) ? defenseFactor : Math.max(1, hp / 10);
        Strategy strategy = makeStrategy(strategyStr);

        boolean ok = session.manager.spawnMinion(player, hex, hp, def, strategy);
        if (!ok) throw new RuntimeException("Cannot spawn here — check territory, occupancy, budget, and spawn count.");
        return toStateDTO(session);
    }

    public GameStateDTO endTurn(String gameId, String playerToken) {
        GameSession session = getSession(gameId);
        Player currentPlayer = resolvePlayer(session, playerToken);
        int currentPlayerIndex = (currentPlayer == session.env.getPlayer1()) ? 1 : 2;
        Player opponent = (currentPlayer == session.env.getPlayer1())
                ? session.env.getPlayer2() : session.env.getPlayer1();

        List<String> log = new ArrayList<>();

        // Snapshot positions before strategy execution
        java.util.IdentityHashMap<Minion, int[]> locBefore = new java.util.IdentityHashMap<>();
        for (Minion m : currentPlayer.getMinions()) {
            if (m.getLocation() != null)
                locBefore.put(m, new int[]{m.getLocation().getRow(), m.getLocation().getCol()});
        }

        // Snapshot opponent HP before
        java.util.IdentityHashMap<Minion, Long> oppHpBefore = new java.util.IdentityHashMap<>();
        List<Minion> oppMinionsBefore = List.copyOf(opponent.getMinions());
        for (Minion m : oppMinionsBefore) oppHpBefore.put(m, m.getHp());

        session.manager.executeStrategies(currentPlayer);

        // Log movements
        int actions = 0;
        for (Minion m : List.copyOf(currentPlayer.getMinions())) {
            int[] prev = locBefore.get(m);
            if (prev != null && m.getLocation() != null) {
                int r = m.getLocation().getRow(), c = m.getLocation().getCol();
                if (prev[0] != r || prev[1] != c) {
                    log.add("  Minion (" + prev[0] + "," + prev[1] + ") moved → (" + r + "," + c + ")");
                    actions++;
                }
            }
        }
        // Log shots / eliminations
        for (Minion m : oppMinionsBefore) {
            Long hpBefore = oppHpBefore.get(m);
            if (hpBefore == null) continue;
            if (!opponent.getMinions().contains(m)) {
                String pos = m.getLocation() != null
                        ? m.getLocation().getRow() + "," + m.getLocation().getCol() : "?";
                log.add("  Minion at (" + pos + ") was eliminated!");
                actions++;
            } else if (m.getHp() < hpBefore) {
                log.add("  Shot enemy (" + m.getLocation().getRow() + "," + m.getLocation().getCol()
                        + "): " + hpBefore + " → " + m.getHp() + " HP");
                actions++;
            }
        }
        if (actions == 0) log.add("  Minions took no action (done)");

        session.manager.endTurn();

        // Apply economy for the next player — bot buy/spawn and strategy execution
        // happen on the next BOT ACTION click, just like in AUTO mode.
        if (!session.env.isGameOver()) {
            Player nextPlayer = session.env.getCurrentPlayer();
            int nextPlayerIndex = (nextPlayer == session.env.getPlayer1()) ? 1 : 2;
            double budgetBefore = nextPlayer.getBudget();
            session.manager.applyEconomyOnly(nextPlayer);
            double interest = nextPlayer.getBudget() - budgetBefore;
            if (interest > 0.5) {
                log.add("P" + nextPlayerIndex + " earned +" + Math.round(interest)
                        + " interest (total: " + Math.round(nextPlayer.getBudget()) + ")");
            }
        }

        GameStateDTO dto = toStateDTO(session);
        dto.setActionLog(log);
        return dto;
    }

    public GameStateDTO botBuyHex(String gameId) {
        GameSession session = getSession(gameId);
        Player currentPlayer = session.env.getCurrentPlayer();
        int idx = (currentPlayer == session.env.getPlayer1()) ? 1 : 2;
        session.manager.doBotBuyHex(currentPlayer, idx);
        return toStateDTO(session);
    }

    public GameStateDTO botSpawnMinion(String gameId) {
        GameSession session = getSession(gameId);
        Player currentPlayer = session.env.getCurrentPlayer();
        int idx = (currentPlayer == session.env.getPlayer1()) ? 1 : 2;
        session.manager.doBotSpawnMinion(currentPlayer, idx);
        return toStateDTO(session);
    }

    public GameStateDTO botStep(String gameId) {
        GameSession session = getSession(gameId);
        Player currentPlayer = session.env.getCurrentPlayer();
        int currentPlayerIndex = (currentPlayer == session.env.getPlayer1()) ? 1 : 2;
        Player opponent = (currentPlayer == session.env.getPlayer1())
                ? session.env.getPlayer2() : session.env.getPlayer1();

        List<String> log = new ArrayList<>();

        // Bot decides to buy a hex and/or spawn a minion this turn
        session.manager.doBotBuyHex(currentPlayer, currentPlayerIndex);
        session.manager.doBotSpawnMinion(currentPlayer, currentPlayerIndex);

        // Snapshot positions and HP before strategy execution
        java.util.IdentityHashMap<Minion, int[]> locBefore = new java.util.IdentityHashMap<>();
        for (Minion m : currentPlayer.getMinions()) {
            if (m.getLocation() != null)
                locBefore.put(m, new int[]{m.getLocation().getRow(), m.getLocation().getCol()});
        }
        java.util.IdentityHashMap<Minion, Long> oppHpBefore = new java.util.IdentityHashMap<>();
        List<Minion> oppMinionsBefore = List.copyOf(opponent.getMinions());
        for (Minion m : oppMinionsBefore) oppHpBefore.put(m, m.getHp());

        session.manager.executeStrategies(currentPlayer);

        // Log movements
        int actions = 0;
        for (Minion m : List.copyOf(currentPlayer.getMinions())) {
            int[] prev = locBefore.get(m);
            if (prev != null && m.getLocation() != null) {
                int r = m.getLocation().getRow(), c = m.getLocation().getCol();
                if (prev[0] != r || prev[1] != c) {
                    log.add("  Minion (" + prev[0] + "," + prev[1] + ") moved → (" + r + "," + c + ")");
                    actions++;
                }
            }
        }
        // Log shots / eliminations
        for (Minion m : oppMinionsBefore) {
            Long hpBefore = oppHpBefore.get(m);
            if (hpBefore == null) continue;
            if (!opponent.getMinions().contains(m)) {
                String pos = m.getLocation() != null
                        ? m.getLocation().getRow() + "," + m.getLocation().getCol() : "?";
                log.add("  Minion at (" + pos + ") was eliminated!");
                actions++;
            } else if (m.getHp() < hpBefore) {
                log.add("  Shot enemy (" + m.getLocation().getRow() + "," + m.getLocation().getCol()
                        + "): " + hpBefore + " → " + m.getHp() + " HP");
                actions++;
            }
        }
        if (actions == 0) log.add("  Bot P" + currentPlayerIndex + " took no action");

        session.manager.endTurn();

        // Apply economy for the next player — buy/spawn happens on their BOT ACTION click
        if (!session.env.isGameOver()) {
            Player nextPlayer = session.env.getCurrentPlayer();
            int nextPlayerIndex = (nextPlayer == session.env.getPlayer1()) ? 1 : 2;
            double budgetBefore = nextPlayer.getBudget();
            session.manager.applyEconomyOnly(nextPlayer);
            double interest = nextPlayer.getBudget() - budgetBefore;
            if (interest > 0.5) {
                log.add("P" + nextPlayerIndex + " earned +" + Math.round(interest)
                        + " interest (total: " + Math.round(nextPlayer.getBudget()) + ")");
            }
        }

        GameStateDTO dto = toStateDTO(session);
        dto.setActionLog(log);
        return dto;
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

    public Map<String, Object> parseStrategy(String strategyStr) {
        if (strategyStr == null || strategyStr.isBlank()) {
            return Map.of("valid", false, "error", "Strategy is empty");
        }
        try {
            new Parser(strategyStr).parse();
            return Map.of("valid", true);
        } catch (Exception e) {
            return Map.of("valid", false, "error", e.getMessage() != null ? e.getMessage() : "Parse error");
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
        boolean over = session.phase.equals("PLAYING") && env.isGameOver();
        dto.setGameOver(over);
        dto.setWinner(over ? session.manager.getWinner() : 0);
        dto.setPlayer1(toPlayerDTO(env.getPlayer1(), 1, env));
        dto.setPlayer2(toPlayerDTO(env.getPlayer2(), 2, env));

        List<HexDTO> hexList = new ArrayList<>();
        for (int r = 1; r <= 8; r++) {
            for (int c = 1; c <= 8; c++) {
                hexList.add(toHexDTO(env.getGrid().getHex(r, c), env));
            }
        }
        dto.setGrid(hexList);
        GameConfig cfg = GameConfig.getInstance();
        dto.setHexPurchaseCost(cfg.hex_purchase_cost);
        dto.setSpawnCost(cfg.spawn_cost);
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
            dto.setMinionId(occupant.getId());
        } else {
            dto.setHasMinion(false);
            dto.setMinionOwner(0);
            dto.setMinionHp(0);
            dto.setMinionId(null);
        }
        return dto;
    }
}
