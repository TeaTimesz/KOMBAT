package Controller;

import GameState.GameConfig;
import GameState.GameEnvironment;
import GameState.Hex;
import GameState.Player;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TurnManagerTest {
    private GameEnvironment env;
    private TurnManager tm;

    @BeforeEach
    void setUp() {
        env = new GameEnvironment();
        for (int r = 1; r <= 8; r++) {
            for (int c = 1; c <= 8; c++) {
                env.getGrid().getHex(r, c).setOccupant(null);
            }
        }
    }

    @Test
    void testIsBotLogic() {
        tm = new TurnManager(env, GameMode.DUEL);
        assertFalse(tm.isBot(1));
        assertFalse(tm.isBot(2));

        tm = new TurnManager(env, GameMode.SOLITAIRE);
        assertFalse(tm.isBot(1));
        assertTrue(tm.isBot(2));

        tm = new TurnManager(env, GameMode.AUTO);
        assertTrue(tm.isBot(1));
        assertTrue(tm.isBot(2));
    }

    @Test
    void testInterestFormula() {
        tm = new TurnManager(env, GameMode.DUEL);
        Player p = env.getCurrentPlayer();

        p.setBudget(100);
        env.switchTurn();
        env.switchTurn();

        double base = p.getBudget();
        tm.startTurn(p, 1);
        double after = p.getBudget();

        double turnBudget = GameConfig.getInstance().turn_budget;
        double m = base + turnBudget;
        double b = GameConfig.getInstance().interest_pct;
        double t = env.getTurnCount();
        double r = b * Math.log10(m) * Math.log(t);
        if (r < 0) r = 0;
        double expectedInterest = m * r / 100.0;
        double expected = m + expectedInterest;

        assertEquals(expected, after, 0.0001, "Interest should match formula");
    }

    @Test
    void testInitialTerritories() {
        Hex p1hex = env.getGrid().getHex(GameEnvironment.SPAWN_AREA_P1[0][0],
                                         GameEnvironment.SPAWN_AREA_P1[0][1]);
        assertEquals(env.getCurrentPlayer(), p1hex.getTerritory(),
                     "Top‑left spawn hex should belong to Player 1");

        env.switchTurn();
        Hex p2hex = env.getGrid().getHex(GameEnvironment.SPAWN_AREA_P2[0][0],
                                         GameEnvironment.SPAWN_AREA_P2[0][1]);
        assertEquals(env.getCurrentPlayer(), p2hex.getTerritory(),
                     "Bottom‑right spawn hex should belong to Player 2");
    }

    @Test
    void testBuyHex() {
        tm = new TurnManager(env, GameMode.DUEL);
        Player p = env.getCurrentPlayer();
        p.setBudget(10000);
        Hex candidate = env.getGrid().getHex(2, 3);
        assertTrue(candidate.isEmpty());
        boolean bought = tm.buyHex(p, candidate);
        assertTrue(bought, "Buy should succeed when hex is adjacent to spawn area");
        assertEquals(p, candidate.getTerritory(), "Territory should be assigned to player");
        
        Hex far = env.getGrid().getHex(5, 5);
        assertFalse(tm.buyHex(p, far));
        
    }

    @Test
    void testBotSpawnAndAction() {
        tm = new TurnManager(env, GameMode.AUTO);
        env.switchTurn();
        Player p = env.getCurrentPlayer();

        p.setBudget(10000);

        assertTrue(p.getMinions().isEmpty());

        tm.startTurn(p, 2);

        assertFalse(p.getMinions().isEmpty(), "Bot should have spawned at least one minion");

        Hex loc = p.getMinions().get(0).getLocation();
        assertTrue(loc.getRow() >= 7, "Bot spawn row should be more than 7 (designated area)");
        assertTrue(loc.getCol() >= 6, "Bot spawn column should be more than 6 (designated area)");

        assertEquals(p, loc.getTerritory(), "Spawn hex territory should be assigned to player");
    }
}