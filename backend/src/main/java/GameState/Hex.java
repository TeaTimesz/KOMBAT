package GameState;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
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

}
