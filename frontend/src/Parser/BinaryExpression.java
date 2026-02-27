package Parser;


public record BinaryExpression (Expression left, String op, Expression right) implements Expression{
    @Override
    public long eval(EvaluationContext ctx) {
        long lv =  left.eval(ctx);
        long rv =  right.eval(ctx);

        return switch(op){
            case "+" -> lv + rv;
            case "-" -> lv - rv;
            case "*" -> lv * rv;
            case "/" -> {
                if (rv == 0) throw new DoneException("Division by zero");
                yield lv / rv;
            }
            case "%" -> {
                if (rv == 0) throw new DoneException("Mod by zero");
                yield lv % rv;
            }
            case "^" -> {
                if (rv < 0) yield 0;
                long result = 1;
                for (int i = 0; i < rv; i++) result *= lv;
                yield result;
            }
            default -> throw new EvalError("unknown op: " + op);
        };
    }

}
