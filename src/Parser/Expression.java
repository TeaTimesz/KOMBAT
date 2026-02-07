package Parser;

import java.util.Map;

public interface Expression {
    long eval(EvaluationContext ctx);
}
