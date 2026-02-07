package Parser;

import static java.lang.Character.isDigit;
import static java.lang.Character.isLetter;

public class ExprFactory {
    //Singleton
    private static ExprFactory instance;
    private ExprFactory() {}
    public static ExprFactory getInstance() {
        if (instance == null) {
            instance = new ExprFactory();
        }
        return instance;
    }

    //Factory Method
    public Expression expr(String token) {

        if (isDigit(token.charAt(0))) {
            return new LiteralExpression(Long.parseLong(token));
        }

        if (isLetter(token.charAt(0))) {
            return new VariableExpression(token);
        }
        throw new IllegalArgumentException("unknown: " + token);
    }

    public Expression binary(Expression left, String op, Expression right) {
        return new BinaryExpression(left, op, right);
    }

    public Expression ally() {
        return new InfoExpr("ally", null);
    }

    public Expression opponent() {
        return new InfoExpr("opponent", null);
    }

    public Expression nearby(String direction) {
        return new InfoExpr("nearby", direction);
    }
}
