package Parser;

import java.util.Map;

public record VariableExpression(String name) implements Expression {
    @Override
    public long eval(EvaluationContext ctx) {
        return ctx.getVariable(name);
    }
}
