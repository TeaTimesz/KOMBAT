package Parser;

public record LiteralExpression(long val) implements Expression {

    @Override
    public long eval(EvaluationContext ctx) {
        return val;
    }
}
