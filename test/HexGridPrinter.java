import GameState.*;

public class HexGridPrinter {

    public static void printHexMap(HexGrid grid) {
        System.out.println("=== HexGrid Map (Odd-Q | High Spacing) ===\n");

        int rows = 8;
        int cols = 8;

        // --- 1. Print Column Headers ---
        System.out.print("      "); // Margin for row numbers
        for (int c = 1; c <= cols; c++) {
            // Align column number with the center of the hex
            System.out.printf("   %d    ", c);
        }
        System.out.println();

        // --- 2. Print Grid Rows ---
        for (int r = 1; r <= rows; r++) {

            // We build 4 horizontal lines of text for every 1 row of hexes
            // Line 1: Top of Even Cols (High)
            // Line 2: Mid of Even Cols (High)
            // Line 3: Bot of Even Cols (High) + Top of Odd Cols (Low)
            // Line 4: Mid of Odd Cols (Low)
            // (The Bottom of Odd Cols is drawn by the Top of the next row's Even Cols)

            StringBuilder l1 = new StringBuilder("      "); // Line 1
            StringBuilder l2 = new StringBuilder("      "); // Line 2
            StringBuilder l3 = new StringBuilder(String.format("  %d   ", r)); // Line 3 (Row Label)
            StringBuilder l4 = new StringBuilder("      "); // Line 4

            for (int c = 1; c <= cols; c++) {
                boolean isOdd = (c % 2 != 0); // Col 1, 3, 5...

                if (!isOdd) {
                    // --- EVEN COLUMN (High) ---
                    // Visually sits "above" the row line
                    l1.append("  _____ ");
                    l2.append(" /     \\");
                    l3.append("/       \\"); // Connects with Odd top
                    l4.append("\\_______/"); // Connects with Odd mid
                } else {
                    // --- ODD COLUMN (Low) ---
                    // Visually sits "below" the even column
                    l1.append("        "); // Empty space above
                    l2.append("        ");
                    l3.append("  _____ "); // Top of Odd hex
                    l4.append(" /     \\");
                }
            }

            // Print the lines for this row strip
            System.out.println(l1);
            System.out.println(l2);
            System.out.println(l3);
            System.out.println(l4);
        }

        // --- 3. Close the bottom of the last Odd Columns ---
        StringBuilder lastLine = new StringBuilder("      ");
        for (int c = 1; c <= cols; c++) {
            if (c % 2 != 0) { // Odd
                lastLine.append(" \\_____/");
            } else {          // Even
                lastLine.append("        ");
            }
        }
        System.out.println(lastLine);
    }
}
