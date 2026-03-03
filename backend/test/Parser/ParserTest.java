package Parser;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ParserTest {
    private void assertParseOK(String src) {
        Parser parser = new Parser(src);
        assertDoesNotThrow(parser::parseStrategy);
    }

    private void assertParseFail(String src) {
        Parser parser = new Parser(src);
        assertThrows(RuntimeException.class, parser::parseStrategy);
    }

    @Test
    void testDone() {
        assertParseOK("done");
    }

    @Test
    void testMove() {
        assertParseOK("move up");
    }

    @Test
    void testShoot() {
        assertParseOK("shoot down 5");
    }

    @Test
    void testAssignment() {
        assertParseOK("x = 10");
    }

    @Test
    void testExpressionPrecedence() {
        assertParseOK("x = 1 + 2 * 3 - 4");
    }

    @Test
    void testParentheses() {
        assertParseOK("x = (1 + 2) * (3 - 4)");
    }

    @Test
    void testBlock() {
        assertParseOK("""
        {
            x = 1
            y = 2
            done
        }
    """);
    }

    @Test
    void testIfStatement() {
        assertParseOK("""
        if (1) then done else done
    """);
    }

    @Test
    void testWhileStatement() {
        assertParseOK("""
        while (x) {
            move up
        }
    """);
    }

    @Test
    void testNestedStatements() {
        assertParseOK("""
        {
            x = 0
            while (x - 10) {
                if (x - 5) then
                    move up
                else {
                    shoot down 3
                    done
                }
                x = x + 1
            }
        }
    """);
    }

    @Test
    void testInfoExpressions() {
        assertParseOK("x = ally");
        assertParseOK("x = opponent");
        assertParseOK("x = nearby up");
    }

    @Test
    void testInvalidDirection() {
        assertParseFail("move north");
        assertParseFail("shoot left 3");
        assertParseFail("x = nearby nowhere");
    }

    @Test
    void testMissingEquals() {
        assertParseFail("x 10");
    }

    @Test
    void testMissingExpression() {
        assertParseFail("x =");
    }

    @Test
    void testUnmatchedParenthesis() {
        assertParseFail("x = (1 + 2");
    }

    @Test
    void testIfMissingElse() {
        assertParseFail("if (1) then done");
    }

    @Test
    void testWhileMissingParen() {
        assertParseFail("while 1 move up");
    }

    @Test
    void testUnclosedBlock() {
        assertParseFail("{ x = 1 ");
    }

}
