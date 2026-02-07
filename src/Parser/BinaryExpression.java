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
                if (rv == 0) throw new ArithmeticException("Divide by zero");
                yield lv / rv;
            }
            case "%" -> {
                if (rv == 0) throw new ArithmeticException("Mod by zero");
                yield lv % rv;
            }
            case "^" -> (long) Math.pow(lv, rv);
            default -> throw new EvalError("unknown op: " + op);
        };
    }

}
