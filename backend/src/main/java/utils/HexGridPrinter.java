package utils;

import GameState.*;

public class HexGridPrinter {
    public static void printHexMap(GameEnvironment env) {
        printHexMap(env.getGrid(), env.getPlayer1(), env.getPlayer2());
    }

    public static void printHexMap(HexGrid grid) {
        printHexMap(grid, null, null);
    }

    private static void printHexMap(HexGrid grid, Player p1, Player p2) {
        System.out.println("=== KOMBAT TERRITORY ===\n");
        int rows = 8, cols = 8;
        System.out.print("     ");
        for (int c = 1; c <= cols; c++) System.out.printf("  %d  ", c);
        System.out.println("\n");
        for (int r = 1; r <= rows; r++) {
            StringBuilder line = new StringBuilder();
            line.append(String.format("%2d ", r));
            for (int c = 1; c <= cols; c++) {
                Hex hex = grid.getHex(r, c);
                String symbol = " ";
                if (hex != null) {
                    Minion m = hex.getOccupant();
                    if (m != null) {
                        Player owner = m.getOwner();
                        if (owner == p1) symbol = "*1";
                        else if (owner == p2) symbol = "*2";
                        else symbol = "*";
                    } else {
                        Player terr = hex.getTerritory();
                        if (terr == p1) symbol = " 1";
                        else if (terr == p2) symbol = " 2";
                        else symbol = "  ";
                    }
                }
                line.append("[" + symbol + "]");
            }
            System.out.println(line);
        }
        System.out.println();
    }
}