package Parser;


public record VariableExpression(String name) implements Expression {
    @Override
    public long eval(EvaluationContext ctx) {
        return ctx.getVariable(name);
    }
}
