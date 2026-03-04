package GameState;
import Parser.EvalError;

import java.util.HashMap;

public class Minion {
    private long hp;
    private long defense;
    private Hex location;
    private final Player owner;
    private final Strategy strategy;
    private final HashMap<String ,Long> localVariables;
    public Minion(long hp,long defense,Hex location,Player owner,Strategy strategy) {
        this.hp = hp;
        this.defense = defense;
        this.location = location;
        this.owner = owner;
        this.strategy = strategy;
        this.localVariables = new HashMap<>();
        this.location.setOccupant(this);
        this.owner.addMinion(this);
    }

    public Minion(long hp,long defense,Hex location,Player owner,Strategy strategy, boolean free) {
        this.hp = hp;
        this.defense = defense;
        this.location = location;
        this.owner = owner;
        this.strategy = strategy;
        this.localVariables = new HashMap<>();
        this.location.setOccupant(this);
        if (free) {
            this.owner.addMinionFree(this);
        } else {
            this.owner.addMinion(this);
        }
    }

    public boolean isAlive() {
        return hp > 0;
    }
    public Hex getLocation() {
        return location;
    }
    public void takeDamage(long damage) {
        hp -= Math.max(1,damage - defense);
        if(!isAlive()) {
            location.setOccupant(null);
            location = null;
            owner.removeMinion(this);
        }
    }
    public void moveTo(Hex location) {
        this.location.setOccupant(null);
        this.location = location;
        this.location.setOccupant(this);
    }
    public Player getOwner() {
        return owner;
    }
    public long getHp() {
        return hp;
    }
    public long getDefense() {return defense;}

    public long getLocalVariable(String name) {
        if(localVariables.containsKey(name)) {
            return localVariables.get(name);
        }
        return 0;
    }
    public void setLocalVariable(String name, long value) {
        localVariables.put(name, value);
    }

    public Strategy getStrategy() {
        return strategy;
    }

}
