package Parser;

import GameState.*;

public class HexGridPrinter {

    public static void printHexMap(HexGrid grid) {
        System.out.println("=== KOMBAT Territory (Skewed View) ===\n");

        int rows = 8;
        int cols = 8;

        // Print Column Headers
        System.out.print("       ");
        for (int c = 1; c <= cols; c++) {
            System.out.printf(" %d     ", c);
        }
        System.out.println("\n");

        for (int r = 1; r <= rows; r++) {
            StringBuilder upperLine = new StringBuilder(); // Odd Columns (High)
            StringBuilder lowerLine = new StringBuilder(); // Even Columns (Low)

            // Row Label
            upperLine.append(String.format(" %d    ", r));
            lowerLine.append("      ");

            for (int c = 1; c <= cols; c++) {
                Hex hex = grid.getHex(r, c);
                String symbol = getHexSymbol(hex);

                // If symbol is empty, we just show empty brackets to keep the grid shape
                String box = String.format("[%s]", symbol);

                if (c % 2 == 0) {
                    // --- ODD COLUMN (Upper) ---
                    upperLine.append(box).append("   ");
                    lowerLine.append("       "); // Spacer
                } else {
                    // --- EVEN COLUMN (Lower) ---
                    upperLine.append("       "); // Spacer
                    lowerLine.append(box).append("   ");
                }
            }

            // Print the staggered lines
            System.out.println(upperLine);
            System.out.println(lowerLine);
            System.out.println(); // Gap between rows
        }
    }

    private static String getHexSymbol(Hex hex) {
        if (hex == null) return "XX";

        Minion m = hex.getOccupant();
        if (m != null) {
            return " * ";
        }

        // EMPTY SLOT: Return 3 spaces so the brackets look like [   ]
        return "   ";
    }
}