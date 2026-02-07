package Parser;

import java.util.Map;

public record LiteralExpression(long val) implements Expression {

    @Override
    public long eval(EvaluationContext ctx) {
        return val;
    }
}
