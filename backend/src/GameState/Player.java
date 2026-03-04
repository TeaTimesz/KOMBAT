package GameState;
import lombok.Getter;
import lombok.Setter;

import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;

@Getter
@Setter
public class Player {
    private double budget;
    private long spawnsLeft;
    private List<Minion> minions;
    private HashMap<String,Long> globalVariables;
    public Player() {
        this.budget = GameConfig.getInstance().init_budget;
        this.spawnsLeft = GameConfig.getInstance().max_spawns;
        minions = new ArrayList<>();
        globalVariables = new HashMap<>();
    }

    public void editBudget(double amount) {
        if(budget + amount < 1 ){
            budget = 1;
            return;
        } else if(budget + amount > GameConfig.getInstance().max_budget){
            budget = GameConfig.getInstance().max_budget;
            return;
        }
        this.budget += amount;
    }
    public boolean canSpawn(){
        if(this.spawnsLeft == 0){
            return false;
        }
        return true;
    }
    public void addMinion(Minion minion){
        minions.add(minion);
        spawnsLeft -= 1;
        editBudget(-GameConfig.getInstance().spawn_cost);
    }
    public void addMinionFree(Minion minion){
        minions.add(minion);
        spawnsLeft -= 1;
    }
    public void removeMinion(Minion minion){
        minions.remove(minion);
    }

    public long getGlobalVariable(String name){
        if(globalVariables.containsKey(name)){
            return globalVariables.get(name);
        }
        return 0;
    }

    public void setGlobalVariable(String name,long value){
        globalVariables.put(name,value);
    }

}
