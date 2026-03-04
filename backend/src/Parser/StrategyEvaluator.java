package Parser;

import GameState.GameEnvironment;
import GameState.Minion;
import GameState.Player;

public class StrategyEvaluator {
    private final GameEnvironment env;

    public StrategyEvaluator(GameEnvironment env) {
        this.env = env;
    }

    public void evaluate(Minion minion) throws DoneException{
        Player player = minion.getOwner();
        EvaluationContext ctx = new EvaluationContext(env,minion,player);
        Statement root = minion.getStrategy().getRootNode();
        root.execute(ctx);
    }

}
