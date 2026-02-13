package GameState;

import Parser.Direction;

public class HexGrid {
    private Hex[][] grid = new Hex[8][8];

    public HexGrid() {
        for (int i = 0; i < grid.length; i++) {
            for (int j = 0; j < grid[i].length; j++) {
                grid[i][j] = new Hex(i+1, j+1);
            }
        }
    }


    public Hex getHex(int row, int col) {
        return grid[row-1][col-1];
    }

    public boolean isInside(int row, int col) {
        return row >= 1 && row <= 8 && col >= 1 && col <= 8;
    }

    public Hex getNeighbour(Hex hex, Direction direction) {
        if(hex == null){
            return null;
        }

        int col = hex.getCol();
        int row = hex.getRow();
        //bitwise and operator to check if the col is odd(parity = 1) or even(parity = 0)
        int parity = col & 1;
        int dCol = 0;
        int dRow = 0;

        switch (direction) {
            case up:    dRow = -1; break;
            case down:  dRow = 1; break;

            // ODD-Q LOGIC:
            // Odd Cols (1,3) are visually LOWER.
            // Even Cols (2,4) are visually HIGHER.

            case upleft:
                dCol = -1;
                // If I am Odd (Low), neighbor is Same Row.
                // If I am Even (High), neighbor is Row-1.
                dRow = (parity == 1) ? 0 : -1;
                break;
            case downleft:
                dCol = -1;
                // If I am Odd (Low), neighbor is Row+1.
                // If I am Even (High), neighbor is Same Row.
                dRow = (parity == 1) ? 1 : 0;
                break;
            case upright:
                dCol = 1;
                dRow = (parity == 1) ? 0 : -1;
                break;
            case downright:
                dCol = 1;
                dRow = (parity == 1) ? 1 : 0;
                break;
        }

        int targetRow = row + dRow;
        int targetCol = col + dCol;
        if(isInside(targetRow,targetCol)){
            return getHex(targetRow,targetCol);
        }
        return null;
    }
}
