package GameState;
import java.util.HashMap;

interface Strategy{

}

public class Minion {
    private long hp;
    private long defense;
    private Hex location;
    private Player owner;
    private Strategy strategy;
    private HashMap<String ,Long> localVariables;
    public Minion(long hp,long defense,Hex location,Player owner,Strategy strategy) {
        this.hp = hp;
        this.defense = defense;
        this.location = location;
        this.owner = owner;
        this.strategy = strategy;
    }
    public boolean isAlive() {
        return hp < 1;
    }
    public Hex getLocation() {
        return location;
    }
    public void takeDamage(long damage) {
        hp -= Math.max(1,damage - defense);
        if(isAlive()) {
            location.setOccupant(null);
            location = null;
            owner.removeMinion(this);
        }
    }
    public void moveTo(Hex location) {
        this.location = location;
        location.setOccupant(this);
    }
    public Player getOwner() {
        return owner;
    }
    public long getHp() {
        return hp;
    }

}
