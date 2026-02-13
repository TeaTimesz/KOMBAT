package Parser;

import GameState.GameConfig;
import GameState.GameEnvironment;
import GameState.Minion;
import GameState.Player;

import java.util.HashMap;
import java.util.Map;

public class EvaluationContext {
    private final GameEnvironment env;
    private final Minion minion;
    private final Player player;

    public EvaluationContext(GameEnvironment env, Minion minion, Player player) {
        this.env = env;
        this.minion = minion;
        this.player = player;
    }

    public GameEnvironment getEnv() {
        return env;
    }
    public Minion getMinion() {
        return minion;
    }
    public Player getPlayer() {
        return player;
    }


    public long getVariable(String name) {
        switch(name){
            case "Budget":
                return (long) player.getBudget();
            case "row":
                return minion.getLocation().getRow();
            case "col":
                return minion.getLocation().getCol();
            case "Int":
                return GameConfig.getInstance().interest_pct;
            case"Max_budget":
                return GameConfig.getInstance().max_budget;
            case"random":
                return (long) (Math.random()*1000);
            case"SpawnsLeft":
                return player.getSpawnsLeft();

        }
        if(Character.isUpperCase(name.charAt(0))) {
            return player.getGlobalVariable(name);
        }else{
            return minion.getLocalVariable(name);
        }

    }

    public void setVariable(String name, long value) {
        if(Character.isUpperCase(name.charAt(0))) {
            player.setGlobalVariable(name, value);
        }else {
            minion.setLocalVariable(name, value);
        }
    }
}
