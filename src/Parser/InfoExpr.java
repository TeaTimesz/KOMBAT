package Parser;

public record InfoExpr(String type, String direction) implements Expression {

    @Override
    public long eval(EvaluationContext ctx) {
        return 0;
    }
}
