package GameState;

public class Hex {
    private final int row,col;
    private Minion occupant;
    private Player territory;
    public Hex(int row, int col) {
        this.row = row;
        this.col = col;
    }
    public boolean isEmpty(){
        if(occupant == null){
            return true;
        }else{
            return false;
        }
    }
    public int getRow() {
        return row;
    }
    public int getCol() {
        return col;
    }
    public Minion getOccupant() {
        return occupant;
    }
    public void setOccupant(Minion occupant) {
        this.occupant = occupant;
    }
    public Player getTerritory() {
        return territory;
    }
    public void setTerritory(Player territory) {
        this.territory = territory;
    }
}
