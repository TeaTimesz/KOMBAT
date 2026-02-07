package Parser;

public class InfoExpr implements Expression {
    private final String type;
    private final String direction;

    public InfoExpr(String type, String direction) {
        this.type = type;
        this.direction = direction;
    }


    @Override
    public long eval(EvaluationContext ctx) {
        return 0;
    }
}
