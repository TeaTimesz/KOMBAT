package Parser;

public record InfoExpr(String type, Direction direction) implements Expression {

    @Override
    public long eval(EvaluationContext ctx) {
        return 0;
    }
}
