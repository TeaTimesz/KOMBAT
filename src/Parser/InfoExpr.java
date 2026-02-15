package Parser;

import GameState.GameEnvironment;
import GameState.Minion;

public record InfoExpr(String type, Direction direction) implements Expression {

    @Override
    public long eval(EvaluationContext ctx) {
        GameEnvironment env = ctx.getEnv();
        Minion minion = ctx.getMinion();

        if(type.equals("opponent")){
            return env.getClosestOpponent(minion);
        }else if(type.equals("ally")){
            return env.getClosestAlly(minion);
        }else if(type.equals("nearby")){
            return env.getNearby(minion,direction);
        }else{
            return 0;
        }
    }
}
