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


}
