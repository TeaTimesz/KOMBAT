package GameState;

import java.util.List;

public class GameEnvironment {
    private int turnCount;
    private final Player player1,player2;
    private final HexGrid grid;
    private final GameConfig config;
    private Player currentPlayer;

    public GameEnvironment () {
        this.player1 = new Player(GameConfig.getInstance().init_hp,GameConfig.getInstance().max_spawns);
        this.player2 = new Player(GameConfig.getInstance().init_hp,GameConfig.getInstance().max_spawns);
        grid = HexGrid.getInstance();
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
        if(GameConfig.getInstance().max_turns > turnCount){
            return true;
        }
        return false;
    }

}
