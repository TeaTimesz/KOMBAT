package GameState;

public class HexGrid {
    public enum Direction {
        up,down,upleft,downleft,upright,downright
    }
    private static HexGrid instance;
    private HexGrid() {
        for (int i = 0; i < grid.length; i++) {
            for (int j = 0; j < grid[i].length; j++) {
                grid[i][j] = new Hex(i+1, j+1);
            }
        }
    }
    public static HexGrid getInstance() {
        if (instance == null) {
            instance = new HexGrid();
        }
        return instance;
    }
    private Hex[][] grid = new Hex[8][8];


    public Hex getHex(int row, int col) {
        return grid[row+1][col+1];
    }

    public boolean isInside(int row, int col) {
        return row >= 0 && row <= 8 && col >= 0 && col <= 8;
    }

    public int getDistance(Hex hex1,Hex hex2) {
        if(hex1 == null || hex2 == null) {
            return -1;
        }

        //convert both hex to Cube coordinate
        int[] cube1 = offsetToCube(hex1.getRow(),hex1.getCol());
        int[] cube2 = offsetToCube(hex2.getRow(),hex2.getCol());
        //calculate distance by (|dx|+|dy|+|dz|) / 2
        int dx = Math.abs(cube1[0] - cube2[0]);
        int dy = Math.abs(cube1[1] - cube2[1]);
        int dz = Math.abs(cube1[2] - cube2[2]);
        return (dx + dy +dz) / 2;
    }

    private int[] offsetToCube(int row, int col) {
        //in offset coordinate (even-q)
        int x = col;
        int z = row - (col + (col&1)) / 2;
        int y = -x -z;
        return new int[]{x,y,z};
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
            return grid[targetRow][targetCol];
        }
        return null;
    }
}
