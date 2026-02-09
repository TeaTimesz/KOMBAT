package GameState;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;

public class Player {
    private double budget;
    private int spawnsLeft;
    private List<Minion> minions;
    private HashMap<String,Long> globalVariables;
    public Player(double budget,int spawnsLeft) {
        this.budget = budget;
        this.spawnsLeft = spawnsLeft;
        minions = new ArrayList<>();
    }
    public double getBudget() {
        return budget;
    }
    public void addBudget(double amount) {
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
        budget -= GameConfig.getInstance().spawn_cost;
    }
    public void removeMinion(Minion minion){
        minions.remove(minion);
    }
    public List<Minion> getMinions(){
        return minions;
    }

}
