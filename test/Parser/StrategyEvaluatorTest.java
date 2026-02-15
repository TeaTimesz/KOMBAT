package Parser;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.util.Arrays;
import java.util.List;

// Imports
import GameState.*;

class StrategyEvaluatorTest {

    private GameEnvironment env;
    private Player p1;
    private StrategyEvaluator evaluator;
    private HexGrid grid;

    @BeforeEach
    void setUp() {

        // 2. Initialize Game Environment
        env = new GameEnvironment();
        p1 = env.getCurrentPlayer();
        evaluator = new StrategyEvaluator(env);
        grid = env.getGrid();

        // 3. Clear Grid (Important because HexGrid is a Singleton)
        for(int r=1; r<=8; r++) {
            for(int c=1; c<=8; c++) {
                if(grid.getHex(r, c) != null) grid.getHex(r, c).setOccupant(null);
            }
        }
    }

    /**
     * Scenario 1: The "Rich Walker"
     * Strategy: move down
     * Verification:
     * - DoneException is thrown (Move ends turn)
     * - Budget decreases by 1
     * - Minion location changes
     */
    @Test
    void testMoveStrategy() {
        // AST: move down
        Statement moveNode = new MoveCommand(Direction.down);
        Strategy strategy = new Strategy(moveNode);

        // Setup Minion at (1,1)
        Hex startHex = grid.getHex(1, 1);
        Minion minion = new Minion(100, 10, startHex, p1, strategy);
        startHex.setOccupant(minion);

        // Pre-check
        assertEquals(1000, p1.getBudget());

        // Execute & Assert Exception
        assertThrows(DoneException.class, () -> {
            evaluator.evaluate(minion);
        });

        // Verify Side Effects
        assertEquals(999, p1.getBudget(), "Budget should decrease by 1 for move");

        // Check Grid Position (assuming down from 1,1 goes to 2,1 in your grid logic)
        // Adjust coordinates based on your specific hex grid skew logic
        assertNull(startHex.getOccupant(), "Old hex should be empty");
        assertNotEquals(startHex, minion.getLocation(), "Minion should have updated its internal location");
        assertNotNull(minion.getLocation().getOccupant(), "New hex should occupy the minion");
    }

    /**
     * Scenario 2: The "Variable Calculator"
     * Strategy:
     * counter = 10
     * result = counter + 5
     * Verification:
     * - Local variables are updated
     * - No DoneException (Assignments don't end turn)
     */
    @Test
    void testAssignmentAndMath() throws DoneException {
        // AST:
        // 1. counter = 10
        // 2. result = counter + 5

        // Note: You'll need your Expression implementations here.
        // I am assuming standard naming.
        Statement stmt1 = new AssignmentStatement("counter", new LiteralExpression(10));

        Expression addition = new BinaryExpression(
                new VariableExpression("counter"),
                "+",
                new LiteralExpression(5)
        );
        Statement stmt2 = new AssignmentStatement("result", addition);

        Statement block = new BlockStatement(Arrays.asList(stmt1, stmt2));
        Strategy strategy = new Strategy(block);

        // Setup
        Hex hex = grid.getHex(1, 1);
        Minion minion = new Minion(100, 10, hex, p1, strategy);

        // Execute
        evaluator.evaluate(minion);

        // Verify Local Memory
        assertEquals(10, minion.getLocalVariable("counter"));
        assertEquals(15, minion.getLocalVariable("result"));
    }

    /**
     * Scenario 3: The "Budget Conscious" (If-Statement)
     * Strategy:
     * if (Budget > 500) then { move down } else { done }
     * Case A: Budget is 1000 (Expect Move)
     * Case B: Budget is 100 (Expect Done command)
     */
    @Test
    void testConditionalLogic() {
        // AST Construction
        Expression condition = new BinaryExpression(
                new VariableExpression("Budget"),
                "-",
                new LiteralExpression(500)
        );
        Statement thenBranch = new MoveCommand(Direction.down);
        Statement elseBranch = new DoneCommand();

        Statement ifStmt = new IfStatement(condition, thenBranch, elseBranch);
        Strategy strategy = new Strategy(ifStmt);
        Hex hex = grid.getHex(1, 1);
        Minion minion = new Minion(100, 10, hex, p1, strategy);

        // --- CASE A: Rich (1000) ---
        assertThrows(DoneException.class, () -> evaluator.evaluate(minion));
        assertEquals(999, p1.getBudget(), "Should have moved (cost 1)");

        // --- CASE B: Poor (100) ---
        p1.editBudget(-899);
        // Reset minion position for re-run
        // (In real tests, better to create a fresh minion, but this works for logic check)
        assertThrows(DoneException.class, () -> evaluator.evaluate(minion));
        assertEquals(100, p1.getBudget(), "Should have executed 'done', costing 0");
    }

    /**
     * Scenario 4: The "Sniper"
     * Strategy: shoot down 50
     * Setup: Place enemy at (2,1)
     * Verification:
     * - Enemy HP reduced
     * - Player budget reduced by 51 (50 power + 1 cost)
     * - Turn ends
     */
    @Test
    void testShootingMechanic() {
        // AST: shoot down 50
        Expression costExpr = new LiteralExpression(50);
        Statement shootNode = new ShootCommand(Direction.down, costExpr);
        Strategy strategy = new Strategy(shootNode);

        // 1. Setup Shooter at (1,1)
        Hex shooterHex = grid.getHex(1, 1);
        Minion shooter = new Minion(100, 10, shooterHex, p1, strategy);
        shooterHex.setOccupant(shooter);

        // 2. Setup Target at (2,1) (Assuming 'down' leads here)
        Hex targetHex = grid.getHex(2, 1);
        Player p2 = env.getOpponentPlayer();
        Minion target = new Minion(100, 5, targetHex, p2, null); // 100 HP, 5 Def
        targetHex.setOccupant(target);

        // 3. Execute
        assertThrows(DoneException.class, () -> evaluator.evaluate(shooter));

        // 4. Verify Costs
        // Cost = 1 (fixed) + 50 (expenditure) = 51
        long expectedBudget = 1000 - 51;
        assertEquals(expectedBudget, p1.getBudget(), "Budget should deduct shoot cost + expenditure");

        // 5. Verify Damage
        // Damage = max(1, 50 - 5) = 45
        // New HP = 100 - 45 = 55
        assertEquals(55, target.getHp(), "Target should take correct damage");
    }

    @Test
    void testMock() throws Exception{
        Parser parser = new Parser("""
        {
            if (Budget - 500) then {
                status = 1
                move up
            } else {
                status = 2
                done
            }
        }
    """);
        Statement root = parser.parseStatement();
        Minion minion = new Minion(100,10,grid.getHex(4,4),p1,new Strategy(root));
        assertThrows(DoneException.class, () -> evaluator.evaluate(minion));
        assertEquals(1,minion.getLocalVariable("status"));
        assertEquals(999,p1.getBudget());
        p1.editBudget(-899);
        assertThrows(DoneException.class, () -> evaluator.evaluate(minion));
        assertEquals(100, p1.getBudget(), "Should have executed 'done', costing 0");
    }

    @Test
    void testInfoExpressions() throws Exception {
        // 1. Define Strategy using the Parser
        // We query all three types of information expressions
        Parser parser = new Parser("""
    {
        valally = ally
        valenemy = opponent
        scanup = nearby up
        scandown = nearby down
        scanempty = nearby upright
        done
    }
    """);
        Statement root = parser.parseStatement();

        // 2. Setup the Board
        // Place Observer (Our Minion) at (4,4)
        Hex centerHex = grid.getHex(4, 4);
        Minion observer = new Minion(100, 10, centerHex, p1, new Strategy(root));
        centerHex.setOccupant(observer);

        // --- Setup Ally (UP from observer) ---
        // We use getNeighbour to ensure we are theoretically correct regardless of grid skew
        Hex upHex = grid.getNeighbour(centerHex, Direction.up);
        // Ally Stats: HP=100 (3 digits), Def=10 (2 digits)
        Minion ally = new Minion(100, 10, upHex, p1, null);
        upHex.setOccupant(ally);

        // --- Setup Enemy (DOWN from observer) ---
        Hex downHex = grid.getNeighbour(centerHex, Direction.down);
        Player p2 = env.getOpponentPlayer();
        // Enemy Stats: HP=9 (1 digit), Def=9 (1 digit)
        Minion enemy = new Minion(9, 9, downHex, p2, null);
        downHex.setOccupant(enemy);

        // 3. Execute Strategy
        assertThrows(DoneException.class, () -> evaluator.evaluate(observer));

        // 4. Verify Calculations
        // Expected: Distance 1, Direction 1 (Up) -> 11
        assertEquals(11, observer.getLocalVariable("valally"),
                "Ally at dist 1, dir 1 should return 11");

        // Expected: Distance 1, Direction 4 (Down) -> 14
        assertEquals(14, observer.getLocalVariable("valenemy"),
                "Enemy at dist 1, dir 4 should return 14");

        // Formula: -(100*digits(HP) + 10*digits(Def) + dist)
        // HP=100 (3 digits), Def=10 (2 digits), Dist=1
        // Value = -(100*3 + 10*2 + 1) = -321
        assertEquals(-321, observer.getLocalVariable("scanup"),
                "Nearby Ally: -(300 + 20 + 1) = -321");

        // Formula: 100*digits(HP) + 10*digits(Def) + dist
        // HP=9 (1 digit), Def=9 (1 digit), Dist=1
        // Value = 100*1 + 10*1 + 1 = 111
        assertEquals(111, observer.getLocalVariable("scandown"),
                "Nearby Enemy: 100 + 10 + 1 = 111");

        // E. NEARBY EMPTY
        assertEquals(0, observer.getLocalVariable("scanempty"),
                "Nearby on empty direction should return 0");
    }

}