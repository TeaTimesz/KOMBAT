package Parser;

import java.util.HashMap;
import java.util.Map;

public class EvaluationContext {

    private final Map<String, Long> variables = new HashMap<>();

    public long getVariable(String name) {
        if (!variables.containsKey(name)) {
            throw new EvalError("undefined variable: " + name);
        }
        return variables.get(name);
    }

    public void setVariable(String name, long value) {
        variables.put(name, value);
    }

    public boolean hasVariable(String name) {
        return variables.containsKey(name);
    }

    public boolean canShoot(){
        return true ;
    }

    public boolean canMove(){
        return true ;
    }

    public void consume(long cost){
    }
}
