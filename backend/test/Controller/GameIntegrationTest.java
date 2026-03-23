package Controller;

import GameState.*;
import Parser.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class GameIntegrationTest {
//    private GameEnvironment env;
//    private TurnManager tm;
//    private HexGrid grid;
//
//    @BeforeEach
//    void setUp() {
//        env = new GameEnvironment();
//        tm = new TurnManager(env, GameMode.AUTO);
//        grid = env.getGrid();
//
//        for (int r = 1; r <= 8; r++) {
//            for (int c = 1; c <= 8; c++) {
//                grid.getHex(r, c).setOccupant(null);
//                grid.getHex(r, c).setTerritory(null);
//            }
//        }
//    }
//
//    private void printGameState() {
//        Player p1 = env.getCurrentPlayer();
//        Player p2 = env.getOpponentPlayer();
//        System.out.println("\n--- Game State (Turn " + env.getTurnCount() + ") ---");
//        System.out.println("Current: Player " + (p1.getMinions().isEmpty() ? "2" : "1"));
//        System.out.println("P1: " + p1.getMinions().size() + " minions, Budget: " + (long)p1.getBudget());
//        System.out.println("P2: " + p2.getMinions().size() + " minions, Budget: " + (long)p2.getBudget());
//    }
//
//    @Test
//    void testFullGameSimulation() {
//        // Give both players substantial budget for spawning
//        Player p1 = env.getCurrentPlayer();
//        Player p2 = env.getOpponentPlayer();
//        p1.setBudget(50000);
//        p2.setBudget(50000);
//
//        int turnCount = 0;
//        int maxTurnsBeforeFail = 500; // safety limit
//
//        // Run game until it's over or we exceed safety limit
//        while (!env.isGameOver() && turnCount < maxTurnsBeforeFail) {
//            Player current = env.getCurrentPlayer();
//            int playerIndex = (current == p1) ? 1 : 2;
//
//            // Start the turn (economy, bot actions, minion execution)
//            tm.startTurn(current, playerIndex);
//
//            // End the turn to switch to the other player
//            tm.endTurn();
//
//            turnCount++;
//        }
//
//        // Verify the game ended
//        assertTrue(env.isGameOver(), "Game should have ended");
//
//        // Determine winner
//        int winner = tm.getWinner();
//
//        System.out.println("=== GAME RESULTS ===");
//        System.out.println("Turns played: " + turnCount);
//        System.out.println("P1 minions remaining: " + p1.getMinions().size());
//        System.out.println("P2 minions remaining: " + p2.getMinions().size());
//
//        switch (winner) {
//            case 1:
//                System.out.println("WINNER: Player 1");
//                assertTrue(!p1.getMinions().isEmpty(), "P1 should have minions to win");
//                break;
//            case 2:
//                System.out.println("WINNER: Player 2");
//                assertTrue(!p2.getMinions().isEmpty(), "P2 should have minions to win");
//                break;
//            case 0:
//                System.out.println("GAME RESULT: Tie or Ongoing");
//                break;
//        }
//    }
//
//    @Test
//    void testDuelWithSimpleStrategies() {
//        // Switch to DUEL mode
//        env = new GameEnvironment();
//        tm = new TurnManager(env, GameMode.DUEL);
//        grid = env.getGrid();
//
//        Player p1 = env.getCurrentPlayer();
//        Player p2 = env.getOpponentPlayer();
//        p1.setBudget(10000);
//        p2.setBudget(10000);
//
//        // Create simple strategies for testing
//        try {
//            Statement p1Strategy = new Parser("move down").parseStatement();
//            Strategy strat1 = new Strategy(p1Strategy);
//
//            Statement p2Strategy = new Parser("shoot up 10").parseStatement();
//            Strategy strat2 = new Strategy(p2Strategy);
//
//            Hex hex1 = grid.getHex(2, 4);
//            Minion m1 = new Minion(100, 10, hex1, p1, strat1);
//
//            Hex hex2 = grid.getHex(7, 4);
//            Minion m2 = new Minion(100, 10, hex2, p2, strat2);
//
//            for (int i = 0; i < 10; i++) {
//                Player current = env.getCurrentPlayer();
//                int idx = (current == p1) ? 1 : 2;
//
//                for (Minion m : List.copyOf(current.getMinions())) {
//                    if (m.getStrategy() != null) {
//                        try {
//                            StrategyEvaluator evaluator = new StrategyEvaluator(env);
//                            evaluator.evaluate(m);
//                        } catch (DoneException ignored) {
//                        }
//                    }
//                }
//
//                env.switchTurn();
//            }
//
//            System.out.println("After manual execution:");
//            System.out.println("P1 minion HP: " + m1.getHp());
//            System.out.println("P2 minion HP: " + m2.getHp());
//
//            assertTrue(m1.isAlive() || m2.isAlive(), "At least one should survive");
//
//        } catch (Exception e) {
//            fail("Strategy parsing failed: " + e.getMessage());
//        }
//    }
//
//    @Test
//    void testGameOverCondition() {
//        Player p1 = env.getCurrentPlayer();
//        Player p2 = env.getOpponentPlayer();
//
//        assertTrue(p1.getMinions().isEmpty());
//        assertTrue(p2.getMinions().isEmpty());
//
//        boolean gameOver = env.isGameOver();
//        assertTrue(gameOver, "Game is over when either player has no minions (both empty counts)");
//
//        Hex hex1 = grid.getHex(1, 1);
//        Minion m1 = new Minion(100, 10, hex1, p1, null);
//        Hex hex2 = grid.getHex(2,2);
//        Minion m2 = new Minion(100, 10, hex2, p2, null);
//        assertFalse(env.isGameOver(), "Game should not be over with both having minions");
//
//        env.shootHex(m1,Direction.downright,500);
//        assertTrue(env.isGameOver(), "Game should be over when p2 has no minions");
//    }
//
//    @Test
//    void testMaxTurnGameOver() {
//        Player p1 = env.getCurrentPlayer();
//        Player p2 = env.getOpponentPlayer();
//
//        // Add minions to both sides
//        Hex hex1 = grid.getHex(1, 1);
//        Hex hex2 = grid.getHex(8, 8);
//        new Minion(100, 10, hex1, p1, null);
//        new Minion(100, 10, hex2, p2, null);
//
//        assertFalse(env.isGameOver(), "Game should not be over yet");
//
//        long maxTurns = GameConfig.getInstance().max_turns;
//        for (int i = 0; i <= maxTurns; i++) {
//            env.switchTurn();
//        }
//
//        assertTrue(env.isGameOver(), "Game should be over after exceeding max turns");
//    }
//
//    @Test
//    void testSolitaireMode() {
//        env = new GameEnvironment();
//        tm = new TurnManager(env, GameMode.SOLITAIRE);
//        grid = env.getGrid();
//
//        Player p1 = env.getCurrentPlayer();
//        Player p2 = env.getOpponentPlayer();
//
//        p1.setBudget(5000);
//        p2.setBudget(5000);
//
//        assertFalse(tm.isBot(1));
//        assertTrue(tm.isBot(2));
//
//        int turnCount = 0;
//        while (!env.isGameOver() && turnCount < 50) {
//            Player current = env.getCurrentPlayer();
//            int idx = (current == p1) ? 1 : 2;
//
//            tm.startTurn(current, idx);
//            tm.endTurn();
//
//            turnCount++;
//        }
//
//        System.out.println("Solitaire test completed in " + turnCount + " turns");
//        System.out.println("Game over: " + env.isGameOver());
//
//        assertTrue(env.isGameOver());
//    }
//
//    @Test
//    void testSimpleMinionCombat() {
//        env = new GameEnvironment();
//        tm = new TurnManager(env, GameMode.DUEL);
//        grid = env.getGrid();
//
//        Player p1 = env.getCurrentPlayer();
//        Player p2 = env.getOpponentPlayer();
//
//        try {
//            Statement p1Strat = new Parser("done").parseStatement();
//            Strategy strat1 = new Strategy(p1Strat);
//
//            Statement p2Strat = new Parser("done").parseStatement();
//            Strategy strat2 = new Strategy(p2Strat);
//
//            Hex hex1 = grid.getHex(2, 4);
//            Hex hex2 = grid.getHex(7, 4);
//            Minion m1 = new Minion(100, 10, hex1, p1, strat1);
//            Minion m2 = new Minion(100, 10, hex2, p2, strat2);
//
//            assertFalse(env.isGameOver());
//
//            m2.takeDamage(500);
//            assertTrue(!m2.isAlive());
//
//            assertTrue(env.isGameOver());
//            assertEquals(1, tm.getWinner(), "P1 should win after P2 is eliminated");
//
//        } catch (Exception e) {
//            fail("Strategy setup failed: " + e.getMessage());
//        }
//    }
//
//    @Test
//    void testVictoryConditions() {
//        Player p1 = env.getCurrentPlayer();
//        Player p2 = env.getOpponentPlayer();
//
//        // Create minions for both
//        Hex hex1 = grid.getHex(1, 1);
//        Hex hex2 = grid.getHex(8, 8);
//        Minion m1 = new Minion(100, 10, hex1, p1, null);
//        Minion m2 = new Minion(100, 10, hex2, p2, null);
//
//        assertFalse(env.isGameOver());
//        assertEquals(0, tm.getWinner());
//
//        m2.takeDamage(500);
//        assertTrue(env.isGameOver());
//        assertEquals(1, tm.getWinner(), "P1 should win");
//
//        setUp();
//        p1 = env.getCurrentPlayer();
//        p2 = env.getOpponentPlayer();
//        m1 = new Minion(100, 10, grid.getHex(1, 1), p1, null);
//        m2 = new Minion(100, 10, grid.getHex(8, 8), p2, null);
//
//        m1.takeDamage(500);
//        assertTrue(env.isGameOver());
//        assertEquals(2, tm.getWinner(), "P2 should win");
//    }
//
//    @Test
//    void testTieBreakerMinionCount() {
//        Player p1 = env.getCurrentPlayer();
//        Player p2 = env.getOpponentPlayer();
//
//        for (int i = 0; i < 3; i++) {
//            new Minion(100, 10, grid.getHex(1 + i, 1), p1, null);
//        }
//        for (int i = 0; i < 2; i++) {
//            new Minion(100, 10, grid.getHex(7 + i, 8), p2, null);
//        }
//
//        long maxTurns = GameConfig.getInstance().max_turns;
//        for (int i = 0; i <= maxTurns; i++) {
//            env.switchTurn();
//        }
//
//        assertTrue(env.isGameOver());
//        assertEquals(1, tm.getWinner(), "P1 should win (more minions)");
//    }
//
//    @Test
//    void testTieBreakerHPSum() {
//        Player p1 = env.getCurrentPlayer();
//        Player p2 = env.getOpponentPlayer();
//
//        Minion m1a = new Minion(150, 10, grid.getHex(1, 1), p1, null);
//        Minion m1b = new Minion(150, 10, grid.getHex(2, 1), p1, null);
//
//        Minion m2a = new Minion(100, 10, grid.getHex(7, 8), p2, null);
//        Minion m2b = new Minion(100, 10, grid.getHex(8, 8), p2, null);
//
//        assertEquals(300, m1a.getHp() + m1b.getHp());
//        assertEquals(200, m2a.getHp() + m2b.getHp());
//
//        long maxTurns = GameConfig.getInstance().max_turns;
//        for (int i = 0; i <= maxTurns; i++) {
//            env.switchTurn();
//        }
//
//        assertTrue(env.isGameOver());
//        assertEquals(1, tm.getWinner(), "P1 should win (more total HP)");
//    }
//
//    @Test
//    void testTieBreakerBudget() {
//        Player p1 = env.getCurrentPlayer();
//        Player p2 = env.getOpponentPlayer();
//
//        // Both have 2 minions with same total HP
//        new Minion(100, 10, grid.getHex(1, 1), p1, null);
//        new Minion(100, 10, grid.getHex(2, 1), p1, null);
//
//        new Minion(100, 10, grid.getHex(7, 8), p2, null);
//        new Minion(100, 10, grid.getHex(8, 8), p2, null);
//
//        p1.setBudget(5000);
//        p2.setBudget(3000);
//
//        long maxTurns = GameConfig.getInstance().max_turns;
//        for (int i = 0; i <= maxTurns; i++) {
//            env.switchTurn();
//        }
//
//        assertTrue(env.isGameOver());
//        assertEquals(1, tm.getWinner(), "P1 should win (more budget)");
//    }
//
//    @Test
//    void testCompleteTie() {
//        Player p1 = env.getCurrentPlayer();
//        Player p2 = env.getOpponentPlayer();
//
//        new Minion(100, 10, grid.getHex(1, 1), p1, null);
//        new Minion(100, 10, grid.getHex(7, 8), p2, null);
//
//        p1.setBudget(5000);
//        p2.setBudget(5000);
//
//        long maxTurns = GameConfig.getInstance().max_turns;
//        for (int i = 0; i <= maxTurns; i++) {
//            env.switchTurn();
//        }
//
//        assertTrue(env.isGameOver());
//        assertEquals(0, tm.getWinner(), "Should be a tie (all metrics equal)");
//    }
}
