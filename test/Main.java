import GameState.*;
import Parser.*;
import Controller.*;

void main() {
    HexGrid grid = HexGrid.getInstance();
    HexGridPrinter.printHexMap(grid);
}