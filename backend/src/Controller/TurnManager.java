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
import java.util.Random;

public class TurnManager {
    private final GameConfig config;
    private final GameMode mode;

    private final GameEnvironment env;

    private final StrategyEvaluator evaluator;
    private final Random random;
    private final Statement defaultStrategy;

    public TurnManager(GameEnvironment env, GameMode mode) {
        this.env = env;
        this.config = GameConfig.getInstance();
        this.mode = mode;
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

    public void startTurn(Player currentPlayer , int playerIndex) {
        applyEconomy(currentPlayer);

        if (isBot(playerIndex)) {
            handleBotTurn(currentPlayer, playerIndex);
        }
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

    private void handleBotTurn(Player player, int playerIndex) {
        if (random.nextBoolean()) { // coin flip 50/50 random
            maybeBuyHexBot(player, playerIndex);
        }

        if (player.getMinions().isEmpty()) {
            maybeSpawnBot(player, playerIndex);
        } else if (random.nextBoolean()) {
            maybeSpawnBot(player, playerIndex);
        }
        // Strategy execution is handled explicitly by GameService, not here.
    }

    private void maybeBuyHexBot(Player player, int playerIndex) {
        if (player.getBudget() < config.hex_purchase_cost) {
            return;
        }

        Hex hexToBuy = findRandomAdjacentEmptyHexForPlayer(player);
        if (hexToBuy == null) {
            return;
        }

        buyHex(player, hexToBuy);
    }

    private void maybeSpawnBot(Player player, int playerIndex) {
        if (!player.canSpawn() || player.getBudget() < config.spawn_cost) {
            return;
        }

        Hex spawnHex = pickRandomEmptyHexForPlayer(playerIndex);
        if (spawnHex == null) {
            return;
        }

        long hp = config.init_hp;
        long def = Math.max(1, config.init_hp / 10);
        // Inherit strategy from an existing minion so bot-spawned minions also act
        Strategy strat = defaultStrategy == null ? null : new Strategy(defaultStrategy);
        for (Minion m : player.getMinions()) {
            if (m.getStrategy() != null) {
                strat = m.getStrategy();
                break;
            }
        }
        spawnHex.setTerritory(player);
        new Minion(hp, def, spawnHex, player, strat);
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
        long hp = config.init_hp;
        long def = Math.max(1, config.init_hp / 10);
        Strategy strat = new Strategy(new Parser("done").parseStatement());

        spawnFreeMinion(botPlayer, spawnHex, hp, def, strat);
    }
}