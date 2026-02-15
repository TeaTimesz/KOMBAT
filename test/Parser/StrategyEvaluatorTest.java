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

        // Pre-check: 1000 (Init) - 100 (Spawn) = 900
        assertEquals(900, p1.getBudget());

        // Execute & Assert Exception
        assertThrows(DoneException.class, () -> {
            evaluator.evaluate(minion);
        });

        // Verify Side Effects: 900 - 1 (Move Cost) = 899
        assertEquals(899, p1.getBudget(), "Budget should decrease by 1 for move");

        // Check Grid Position
        assertNull(startHex.getOccupant(), "Old hex should be empty");
        assertNotEquals(startHex, minion.getLocation(), "Minion should have updated its internal location");
        assertNotNull(minion.getLocation().getOccupant(), "New hex should occupy the minion");
    }

    @Test
    void testAssignmentAndMath() throws DoneException {
        // AST: counter = 10; result = counter + 5
        Statement stmt1 = new AssignmentStatement("counter", new LiteralExpression(10));

        Expression addition = new BinaryExpression(
                new VariableExpression("counter"), "+", new LiteralExpression(5)
        );
        Statement stmt2 = new AssignmentStatement("result", addition);

        Statement block = new BlockStatement(Arrays.asList(stmt1, stmt2));
        Strategy strategy = new Strategy(block);

        // Setup
        Hex hex = grid.getHex(1, 1);
        Minion minion = new Minion(100, 10, hex, p1, strategy);


        // Execute
        evaluator.evaluate(minion);

        // Verify Local Memory (Budget not affected by assignment)
        assertEquals(10, minion.getLocalVariable("counter"));
        assertEquals(15, minion.getLocalVariable("result"));
        assertEquals(900, p1.getBudget()); // 1000 - 100
    }

    @Test
    void testConditionalLogic() {
        // AST: if (Budget - 500) then { move down } else { done }
        Expression condition = new BinaryExpression(
                new VariableExpression("Budget"), "-", new LiteralExpression(500)
        );
        Statement thenBranch = new MoveCommand(Direction.down);
        Statement elseBranch = new DoneCommand();

        Statement ifStmt = new IfStatement(condition, thenBranch, elseBranch);
        Strategy strategy = new Strategy(ifStmt);
        Hex hex = grid.getHex(1, 1);
        Minion minion = new Minion(100, 10, hex, p1, strategy);


        // --- CASE A: Rich (Start 1000 - 100 = 900) ---
        // Condition: 900 - 500 = 400 (True)
        assertThrows(DoneException.class, () -> evaluator.evaluate(minion));

        // Expected: 900 - 1 (Move) = 899
        assertEquals(899, p1.getBudget(), "Should have moved (cost 1)");

        // --- CASE B: Poor (Target 100) ---
        // Current is 899. To get to 100, we subtract 799.
        p1.editBudget(-799);
        assertEquals(100, p1.getBudget()); // Verify we are at 100

        // Reset minion loop logic? (Depends on evaluator state, assuming fresh evaluation)
        // Condition: 100 - 500 = -400 (False)
        assertThrows(DoneException.class, () -> evaluator.evaluate(minion));

        // Expected: 100 (No change, 'done' costs 0)
        assertEquals(100, p1.getBudget(), "Should have executed 'done', costing 0");
    }

    @Test
    void testShootingMechanic() {
        // AST: shoot down 50
        Expression costExpr = new LiteralExpression(50);
        Statement shootNode = new ShootCommand(Direction.down, costExpr);
        Strategy strategy = new Strategy(shootNode);

        // 1. Setup Shooter
        Hex shooterHex = grid.getHex(1, 1);
        Minion shooter = new Minion(100, 10, shooterHex, p1, strategy);

        // 2. Setup Target (Opponent)
        Hex targetHex = grid.getHex(2, 1);
        Player p2 = env.getOpponentPlayer();
        Minion target = new Minion(100, 5, targetHex, p2, null);
        targetHex.setOccupant(target);
        // (Optional: p2.editBudget(-100) if verifying p2's budget, but we focus on p1)

        // 3. Execute
        assertThrows(DoneException.class, () -> evaluator.evaluate(shooter));

        // 4. Verify Costs
        // Initial: 1000
        // Spawn: -100 (Current 900)
        // Shoot: -1 (Base) - 50 (Expenditure) = -51
        // Final: 849
        assertEquals(849, p1.getBudget(), "Budget should deduct spawn(100) + shoot(51)");

        // 5. Verify Damage (Unchanged)
        assertEquals(55, target.getHp(), "Target should take correct damage");
    }

    @Test
    void testMock() throws Exception {
        // 1. Setup Strategy
        // Logic: If (Budget - 500) is positive, Move Up. Else, Done.
        String code = """
    {
        if (Budget - 500) then { 
            status = 1
            move up
        } else {
            status = 2
            done
        }
        # this is a comment
    }
    """;

        // 2. Parse & Init
        Parser parser = new Parser(code);
        Statement root = parser.parseStatement(); // Use your actual parser method

        // Place Minion at (4,4) -> Even Column (Low position)
        Hex startHex = grid.getHex(4, 4);
        Minion minion = new Minion(100, 10, startHex, p1, new Strategy(root));

        // --- VISUALIZATION: BEFORE ---
        System.out.println("--- STATE 1: BEFORE MOVE (Budget: " + p1.getBudget() + ") ---");
        HexGridPrinter.printHexMap(grid);

        // 4. Execute Turn
        // 900 - 500 = 400 (Positive/True) -> Enters 'move up'
        assertThrows(DoneException.class, () -> evaluator.evaluate(minion));

        // --- VISUALIZATION: AFTER ---
        // Budget should be 899 (900 - 1 move cost)
        System.out.println("--- STATE 2: AFTER MOVE (Budget: " + p1.getBudget() + ") ---");
        HexGridPrinter.printHexMap(grid);

        // 5. Verification
        assertEquals(1, minion.getLocalVariable("status"));
        assertEquals(899, p1.getBudget());

        // Verify Position: Moved from (4,4) to (3,4)
        // (3,4) is directly "above" (4,4) in the hex grid logic usually
        Hex expectedHex = grid.getHex(3, 4);

        assertNull(startHex.getOccupant(), "Start hex (4,4) should be empty");
        assertNotNull(expectedHex.getOccupant(), "Target hex (3,4) should be occupied");
        assertEquals(minion, expectedHex.getOccupant());
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