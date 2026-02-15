package GameState;

import java.util.List;
import Parser.Direction;

public class GameEnvironment {
    private int turnCount;
    private final Player player1,player2;
    private final HexGrid grid;
    private final GameConfig config;
    private Player currentPlayer;

    public GameEnvironment () {
        player1 = new Player();
        player2 = new Player();
        currentPlayer = player1;
        grid = new HexGrid();
        config = GameConfig.getInstance();
    }

    public Player getCurrentPlayer() {
        return currentPlayer;
    }
    public Player getOpponentPlayer() {
        return (currentPlayer == player1) ? player2 : player1;
    }
    public void switchTurn() {
        if(currentPlayer == player1){
            currentPlayer = player2;
        }else{
            currentPlayer = player1;
        }
        turnCount++;
    }
    public boolean isGameOver() {
        Player curr = getCurrentPlayer();
        Player opp = getOpponentPlayer();
        List<Minion> currMinions = curr.getMinions();
        List<Minion> oppMinions = opp.getMinions();

        if(currMinions.isEmpty()||oppMinions.isEmpty()){
            return true;
        }
        if(turnCount > GameConfig.getInstance().max_turns){
            return true;
        }
        return false;
    }

    public void moveMinion(Minion minion,Direction direction) {
        Hex curretnHex = minion.getLocation();
        Hex targetHex = grid.getNeighbour(curretnHex,direction);
        if(targetHex == null){
            return;
        }
        if(!targetHex.isEmpty()){
            return;
        }
        minion.moveTo(targetHex);
    }

    public void shootHex(Minion minion,Direction direction,long expenditure) {
        Hex targetHex = grid.getNeighbour(minion.getLocation(), direction);
        if(targetHex.getOccupant() != null){
            targetHex.getOccupant().takeDamage(expenditure);
        }
    }

    public HexGrid getGrid() {
        return grid;
    }

    public long getClosestOpponent(Minion minion){
        return findClosest(minion,getOpponentPlayer());
    }

    public long getClosestAlly(Minion minion){
        return findClosest(minion,getCurrentPlayer());
    }

    private long findClosest(Minion minion,Player target){
        long bestValue = 0;
        int minDistance = Integer.MAX_VALUE;
        int bestDirection = Integer.MAX_VALUE;

        for(Direction dir:Direction.values()){
            Minion found = scanForMinionInDirection(minion.getLocation(),dir,target);
            if(found != null){
                int dist = getGrid().getDistance(minion.getLocation(), found.getLocation());

                if(dist < minDistance){
                    minDistance = dist;
                    bestDirection = dir.ordinal()+1;
                }else if(dist == minDistance){
                    if((dir.ordinal() + 1) < bestDirection){
                        bestDirection = dir.ordinal()+1;
                    }
                }
            }
        }

        if(minDistance == Integer.MAX_VALUE){ return 0;}
        return (long) minDistance * 10 + bestDirection;
    }

    public long getNearby(Minion minion,Direction direction){
        Minion found = scanForAnyInDirection(minion.getLocation(),direction);

        if(found == null){return 0;}

        long dist = getGrid().getDistance(minion.getLocation(), found.getLocation());
        long hpDigits = String.valueOf(found.getHp()).length();
        long defDigits = String.valueOf(found.getDefense()).length();

        long value = 100 * hpDigits + 10 * defDigits + dist;

        if(found.getOwner() == minion.getOwner()){
            return -value;
        }
        return value;
    }

    private Minion scanForMinionInDirection(Hex start,Direction direction,Player target) {
        Hex current = start;
        List<Minion> minions = target.getMinions();
        while(true){
            current = grid.getNeighbour(current,direction);
            if(current == null){return null;}
            if(current.getOccupant() != null && minions.contains(current.getOccupant())){
                return current.getOccupant();
            }
        }
    }

    private Minion scanForAnyInDirection(Hex start,Direction direction){
        Hex current = start;
        while(true){
            current = grid.getNeighbour(current,direction);
            if(current == null){return null;}
            if(current.getOccupant() != null){
                return current.getOccupant();
            }
        }
    }


}
