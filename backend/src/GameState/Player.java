package GameState;
import Parser.EvalError;

import java.lang.module.Configuration;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;

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
    public double getBudget() {
        return budget;
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
        // add the minion and consume a spawn slot without charging budget
        minions.add(minion);
        spawnsLeft -= 1;
    }
    public void removeMinion(Minion minion){
        minions.remove(minion);
    }
    public List<Minion> getMinions(){
        return minions;
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

    public long getSpawnsLeft(){
        return spawnsLeft;
    }

    public void setBudget(double budget){
        this.budget = budget;
    }

}
