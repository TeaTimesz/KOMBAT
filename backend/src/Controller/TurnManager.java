package Controller;

import GameState.GameConfig;
import GameState.GameEnvironment;
import GameState.Minion;
import GameState.Hex;
import GameState.HexGrid;
import GameState.Strategy;
import GameState.Player;

import Parser.Parser;
import Parser.Statement;
import Parser.DoneException;
import Parser.StrategyEvaluator;
import Parser.Direction;

import java.util.List;
import java.util.Map;
import java.util.Random;

public class TurnManager {
    private final GameConfig config;
    private final GameMode mode;

    private final GameEnvironment env;

    private final StrategyEvaluator evaluator;
    private final Random random;
    private final Statement defaultStrategy;
    private final List<Map<String, Object>> kinds;

    // Bot minion types (choose different stats/behaviors)
    private static class BotMinionType {
        final String name;
        final long hp;
        final long defense;
        final String strategyCode;

        BotMinionType(String name, long hp, long defense, String strategyCode) {
            this.name = name;
            this.hp = hp;
            this.defense = defense;
            this.strategyCode = strategyCode;
        }
    }

    private final BotMinionType[] botTypes;

    public TurnManager(GameEnvironment env, GameMode mode, List<Map<String, Object>> kinds) {
        this.env = env;
        this.config = GameConfig.getInstance();
        this.botTypes = new BotMinionType[] {
            new BotMinionType("Aggressive", config.init_hp, Math.max(1, config.init_hp / 15), "if (Budget - 100) then { move down; shoot down 50 } else { done }"),
            new BotMinionType("Defensive", config.init_hp, Math.max(1, config.init_hp / 4), "done"),
            new BotMinionType("Cautious", config.init_hp, Math.max(1, config.init_hp / 8), "if (Budget - 30) then { move down; shoot down 10 } else { move down }")
        };
        this.mode = mode;
        this.kinds = kinds;
        this.evaluator = new StrategyEvaluator(env);
        this.random = new Random();

        Statement temp = null;
        try {
            temp = new Parser("done").parseStatement();
        } catch (Exception ignored) {
        }
        this.defaultStrategy = temp;
    }

    public boolean isBot(int playerIndex) {
        if (mode == GameMode.AUTO) {
            return true;
        }
        if (mode == GameMode.SOLITAIRE && playerIndex == 2) {
            return true;
        }
        return false;
    }

    public List<String> startTurn(Player currentPlayer, int playerIndex) {
        double budgetBefore = currentPlayer.getBudget();
        applyEconomy(currentPlayer);
        long gained = Math.round(currentPlayer.getBudget() - budgetBefore);

        List<String> logs = new java.util.ArrayList<>();
        logs.add("Budget: +" + gained + " → " + (long) currentPlayer.getBudget());

        if (isBot(playerIndex)) {
            logs.addAll(handleBotTurn(currentPlayer, playerIndex));
        }
        return logs;
    }

    public void endTurn() {
        env.switchTurn();
    }

    private void applyEconomy(Player player) {
        player.editBudget(config.turn_budget);

        // r = b * log10(m) * ln(t)
        double m = player.getBudget();
        if (m >= 1) {
            double b = config.interest_pct;
            double t = env.getTurnCount();
            if (t < 1) {
                t = 1;
            }
            double r = b * Math.log10(m) * Math.log(t);
            if (r < 0) r = 0;
            double interest = m * r / 100.0;
            player.editBudget(interest);
        }

        if (player.getBudget() > config.max_budget) {
            player.setBudget(config.max_budget);
        }
    }

    private List<String> handleBotTurn(Player player, int playerIndex) {
        List<String> logs = new java.util.ArrayList<>();

        if (random.nextBoolean()) { // coin flip 50/50 random
            String buyLog = maybeBuyHexBot(player, playerIndex);
            if (buyLog != null) logs.add(buyLog);
        }

        // Snapshot existing minions BEFORE spawning so new spawns don't execute this turn
        List<Minion> minionsToEvaluate = List.copyOf(player.getMinions());

        if (player.getMinions().isEmpty()) {
            String spawnLog = maybeSpawnBot(player, playerIndex);
            if (spawnLog != null) logs.add(spawnLog);
        } else if (random.nextBoolean()) {
            String spawnLog = maybeSpawnBot(player, playerIndex);
            if (spawnLog != null) logs.add(spawnLog);
        }

        Player opponent = (playerIndex == 1) ? env.getPlayer2() : env.getPlayer1();

        // Snapshot opponent state (keyed by stable ID) before any evaluation
        java.util.Map<String, int[]> oppPosBefore = new java.util.HashMap<>();
        java.util.Map<String, Long>  oppHpBefore  = new java.util.HashMap<>();
        List<Minion> oppSnapshot = List.copyOf(opponent.getMinions());
        for (Minion opp : oppSnapshot) {
            if (opp.getLocation() != null)
                oppPosBefore.put(opp.getId(), new int[]{opp.getLocation().getRow(), opp.getLocation().getCol()});
            oppHpBefore.put(opp.getId(), opp.getHp());
        }

        for (Minion m : minionsToEvaluate) {
            if (m.getStrategy() == null || m.getLocation() == null) continue;

            int[] prevPos = { m.getLocation().getRow(), m.getLocation().getCol() };

            try {
                evaluator.evaluate(m);
            } catch (DoneException ignored) {
            }

            if (m.getLocation() != null) {
                int r = m.getLocation().getRow(), c = m.getLocation().getCol();
                if (prevPos[0] != r || prevPos[1] != c) {
                    logs.add("  Minion (" + prevPos[0] + "," + prevPos[1] + ") moved → (" + r + "," + c + ")");
                }
            }
        }

        for (Minion opp : oppSnapshot) {
            Long hpBefore = oppHpBefore.get(opp.getId());
            if (hpBefore == null) continue;
            if (!opponent.getMinions().contains(opp)) {
                int[] pos = oppPosBefore.get(opp.getId());
                String posStr = pos != null ? pos[0] + "," + pos[1] : "?";
                logs.add("  Eliminated enemy at (" + posStr + ")!");
            } else if (opp.getHp() < hpBefore) {
                logs.add("  Shot enemy at (" + opp.getLocation().getRow() + "," + opp.getLocation().getCol()
                    + "): " + hpBefore + " → " + opp.getHp() + " HP");
            }
        }

        if (logs.isEmpty()) {
            logs.add("Bot " + playerIndex + ": no action this turn.");
        }
        return logs;
    }

    BotMinionType chooseBotMinionType(Player player, int playerIndex) {
        if (kinds != null && !kinds.isEmpty()) {
            Map<String, Object> kind = kinds.get(random.nextInt(kinds.size()));
            long hp = config.init_hp;
            Object defObj = kind.get("defense");
            long defense;
            if (defObj instanceof Number) {
                defense = ((Number) defObj).longValue();
            } else if (defObj != null) {
                try { defense = Long.parseLong(defObj.toString()); } catch (NumberFormatException e) { defense = Math.max(1, hp / 10); }
            } else {
                defense = Math.max(1, hp / 10);
            }
            String strategyCode = (String) kind.get("strategy");
            return new BotMinionType((String) kind.get("name"), hp, defense, strategyCode);
        }

        Player opponent = (playerIndex == 1) ? env.getPlayer2() : env.getPlayer1();

        int ownCount = player.getMinions().size();
        int oppCount = opponent.getMinions().size();

        if (ownCount < oppCount) {
            return botTypes[0]; // Aggressive to catch up
        }
        if (player.getBudget() < opponent.getBudget()) {
            return botTypes[1]; // Defensive when budget is weaker
        }

        return botTypes[random.nextInt(botTypes.length)];
    }

    private Strategy parseBotStrategy(String code) {
        if (code == null || code.isBlank()) {
            return defaultStrategy == null ? null : new Strategy(defaultStrategy);
        }
        try {
            return new Strategy(new Parser(code).parse());
        } catch (Exception e) {
            return defaultStrategy == null ? null : new Strategy(defaultStrategy);
        }
    }

    private String maybeBuyHexBot(Player player, int playerIndex) {
        if (player.getBudget() < config.hex_purchase_cost) {
            return null;
        }

        Hex hexToBuy = findRandomAdjacentEmptyHexForPlayer(player);
        if (hexToBuy == null) {
            return null;
        }

        if (buyHex(player, hexToBuy)) {
            return "Bot " + playerIndex + " bought hex (" + hexToBuy.getRow() + "," + hexToBuy.getCol() + ")";
        }
        return null;
    }

    private String maybeSpawnBot(Player player, int playerIndex) {
        if (!player.canSpawn() || player.getBudget() < config.spawn_cost) {
            return null;
        }

        Hex spawnHex = pickRandomEmptyHexForPlayer(playerIndex);
        if (spawnHex == null) {
            return null;
        }

        BotMinionType botType = chooseBotMinionType(player, playerIndex);
        Strategy strat = parseBotStrategy(botType.strategyCode);

        spawnHex.setTerritory(player);
        new Minion(botType.hp, botType.defense, spawnHex, player, strat);
        return "Bot " + playerIndex + " spawned " + botType.name + " at (" + spawnHex.getRow() + "," + spawnHex.getCol() + ")";
    }

    private Hex findRandomAdjacentEmptyHexForPlayer(Player player) {
        HexGrid grid = env.getGrid();
        List<Hex> candidates = new java.util.ArrayList<>();

        for (int r = 1; r <= 8; r++) {
            for (int c = 1; c <= 8; c++) {
                Hex h = grid.getHex(r, c);
                if (!h.isEmpty() || h.getTerritory() != null) {
                    continue;
                }
                if (isAdjacentToTerritory(h, player)) {
                    candidates.add(h);
                }
            }
        }

        if (candidates.isEmpty()) {
            return null;
        }
        return candidates.get(random.nextInt(candidates.size()));
    }

    private boolean isAdjacentToTerritory(Hex hex, Player player) {
        HexGrid grid = env.getGrid();
        for (Direction dir : Direction.values()) {
            Hex neighbor = grid.getNeighbour(hex, dir);
            if (neighbor != null && neighbor.getTerritory() == player) {
                return true;
            }
        }
        return false;
    }

    private Hex pickRandomEmptyHexForPlayer(int playerIndex) {
        HexGrid grid = env.getGrid();
        Player owner = (playerIndex == 1) ? env.getPlayer1() : env.getPlayer2();
        List<Hex> empties = new java.util.ArrayList<>();

        for (int r = 1; r <= 8; r++) {
            for (int c = 1; c <= 8; c++) {
                Hex h = grid.getHex(r, c);
                if (h.isEmpty() && h.getTerritory() == owner) {
                    empties.add(h);
                }
            }
        }
        if (empties.isEmpty()) {
            return null;
        }
        return empties.get(0);
    }

    public boolean buyHex(Player player, Hex hex) {
        if (player.getBudget() < config.hex_purchase_cost) {
            return false;
        }
        // A hex can be bought even if a minion is standing on it — only territory matters
        if (hex == null || hex.getTerritory() != null) {
            return false;
        }
        if (!isAdjacentToTerritory(hex, player)) {
            return false;
        }
        hex.setTerritory(player);
        player.editBudget(-config.hex_purchase_cost);
        return true;
    }

    public boolean spawnMinion(Player player, Hex hex, long hp, long def, Strategy strategy) {
        if (!player.canSpawn() || player.getBudget() < config.spawn_cost) {
            return false;
        }
        if (hex == null || !hex.isEmpty()) {
            return false;
        }
        if(hex.getTerritory() != player) {
            return false;
        }
        hex.setTerritory(player);
        new Minion(hp, def, hex, player, strategy);
        return true;
    }

    public boolean spawnFreeMinion(Player player, Hex hex, long hp, long def, Strategy strategy) {
        if (!player.canSpawn()) {
            return false;
        }
        if (hex == null || !hex.isEmpty()) {
            return false;
        }
        if (hex.getTerritory() != player) {
            return false;
        }
        new Minion(hp, def, hex, player, strategy, true);
        return true;
    }

    public GameEnvironment getEnvironment() {
        return env;
    }

    public void executeStrategies(Player player) {
        System.out.println("Executing strategies for " + player.getMinions().size() + " minions...");
        for (Minion m : List.copyOf(player.getMinions())) {
            if (m.getStrategy() == null) {
                System.out.println("  Minion at " + m.getLocation() + " has no strategy, skipping.");
                continue;
            }
            System.out.println("  Minion at " + m.getLocation() + " executing strategy root: " + m.getStrategy().getRootNode().getClass().getSimpleName());
            System.out.println("    Budget before: " + player.getBudget());
            try {
                evaluator.evaluate(m);
            } catch (DoneException e) {
                System.out.println("    Strategy finished with: " + e.getMessage());
            }
            System.out.println("    Minion now at " + m.getLocation() + ", Budget after: " + player.getBudget());
        }
    }

    public int getWinner() {
        if (!env.isGameOver()) {
            return 0;
        }

        Player current = env.getCurrentPlayer();
        Player opponent = env.getOpponentPlayer();
        
        int currMinions = current.getMinions().size();
        int oppMinions = opponent.getMinions().size();

        // Condition 1: One player has 0 minions (game ended due to elimination)
        if (currMinions == 0 && oppMinions > 0) {
            return (current == env.getPlayer1()) ? 2 : 1;
        }
        if (oppMinions == 0 && currMinions > 0) {
            return (current == env.getPlayer1()) ? 1 : 2;
        }
        if (currMinions == 0 && oppMinions == 0) {
            return 0;
        }

        // Condition 2: Max turns reached, both players still have minions
        
        // Rule 2a: More minions wins
        if (currMinions > oppMinions) {
            return (current == env.getPlayer1()) ? 1 : 2;
        }
        if (oppMinions > currMinions) {
            return (current == env.getPlayer1()) ? 2 : 1;
        }

        // Rule 2b: Compare sum of HP
        long currTotalHP = current.getMinions().stream().mapToLong(Minion::getHp).sum();
        long oppTotalHP = opponent.getMinions().stream().mapToLong(Minion::getHp).sum();

        if (currTotalHP > oppTotalHP) {
            return (current == env.getPlayer1()) ? 1 : 2;
        }
        if (oppTotalHP > currTotalHP) {
            return (current == env.getPlayer1()) ? 2 : 1;
        }

        // Rule 2c: Compare budgets
        double currBudget = current.getBudget();
        double oppBudget = opponent.getBudget();

        if (currBudget > oppBudget) {
            return (current == env.getPlayer1()) ? 1 : 2;
        }
        if (oppBudget > currBudget) {
            return (current == env.getPlayer1()) ? 2 : 1;
        }

        // All tied
        return 0;
    }

    public void handleBotFreeSpawn(Player botPlayer, int botPlayerIndex) {
        if (!botPlayer.canSpawn()) {
            return;
        }

        java.util.List<Hex> ownedEmpty = new java.util.ArrayList<>();
        for (int r = 1; r <= 8; r++) {
            for (int c = 1; c <= 8; c++) {
                Hex h = env.getGrid().getHex(r, c);
                if (h != null && h.isEmpty() && h.getTerritory() == botPlayer) {
                    ownedEmpty.add(h);
                }
            }
        }

        if (ownedEmpty.isEmpty()) {
            return;
        }

        Hex spawnHex = ownedEmpty.get(random.nextInt(ownedEmpty.size()));

        BotMinionType botType = chooseBotMinionType(botPlayer, botPlayerIndex);
        Strategy strat = parseBotStrategy(botType.strategyCode);

        spawnFreeMinion(botPlayer, spawnHex, botType.hp, botType.defense, strat);
    }
}