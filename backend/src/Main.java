import GameState.*;
import Controller.*;
import Parser.Parser;
import Parser.Statement;
import utils.HexGridPrinter;
import java.util.Scanner;

public class Main {

    static Strategy getAggressiveStrategy() throws Exception {
        String code = """
                if(Budget - 100) then {
                    move down
                    shoot down 50
                }
                else {
                    done
                }
                """;
        Parser parser = new Parser(code);
        Statement root = parser.parseStatement();
        return new Strategy(root);
    }

    static Strategy getDefensiveStrategy() throws Exception {
        String code = "done";
        Parser parser = new Parser(code);
        Statement root = parser.parseStatement();
        return new Strategy(root);
    }

    static Strategy getCautiousStrategy() throws Exception {
        String code = "if (Budget - 30) then { move down; shoot down 10 } else { move down }";
        Parser parser = new Parser(code);
        Statement root = parser.parseStatement();
        return new Strategy(root);
    }

    public static void main(String[] args) {
        GameEnvironment env = new GameEnvironment();
        TurnManager tm = new TurnManager(env, GameMode.SOLITAIRE);
        Scanner sc = new Scanner(System.in);
        System.out.println("Starting solitaire game. Enter 'help' for commands.");

        // Pre-game: allow the human player one free minion placement
        Player human = env.getCurrentPlayer();
        System.out.print("Place one free minion before the game starts? (y/n) ");
        String freeAns = sc.nextLine().trim();
        if (freeAns.equalsIgnoreCase("y")) {
            System.out.print("Enter row col to place free minion: ");
            String[] tok = sc.nextLine().split("\\s+");
            if (tok.length >= 2) {
                try {
                    int r = Integer.parseInt(tok[0]);
                    int c = Integer.parseInt(tok[1]);
                    Hex h = env.getGrid().getHex(r, c);
                    System.out.println("Choose strategy: 1=Aggressive 2=Defensive 3=Cautious");
                    String stratChoice = sc.nextLine().trim();
                    Strategy strat = null;
                    try {
                        if (stratChoice.equals("1")) {
                            System.out.println("Creating aggressive strategy...");
                            strat = getAggressiveStrategy();
                        } else if (stratChoice.equals("2")) {
                            System.out.println("Creating defensive strategy...");
                            strat = getDefensiveStrategy();
                        } else if (stratChoice.equals("3")) {
                            System.out.println("Creating cautious strategy...");
                            strat = getCautiousStrategy();
                        } else {
                            System.out.println("Unknown choice, using defensive...");
                            strat = getDefensiveStrategy();
                        }
                        System.out.println("Strategy created successfully. Root: " + strat.getRootNode().getClass().getSimpleName());
                    } catch (Exception e) {
                        System.out.println("ERROR creating strategy: " + e.getMessage());
                        e.printStackTrace();
                        strat = getDefensiveStrategy();
                    }
                    if (tm.spawnFreeMinion(human, h, GameConfig.getInstance().init_hp,
                            Math.max(1, GameConfig.getInstance().init_hp/10), strat)) {
                        System.out.println("Free minion placed.");
                    } else {
                        System.out.println("Free placement failed.");
                    }
                } catch (Exception ignored) {}
            }
            // display board after placement
            HexGridPrinter.printHexMap(env);
        }
        tm.executeStrategies(human);
        HexGridPrinter.printHexMap(env);

        // Pre-game: bot places its free minion
        Player bot = env.getPlayer2();
        System.out.println("\nBot is placing its free minion...");
        tm.handleBotFreeSpawn(bot, 2);
        HexGridPrinter.printHexMap(env);
        while (!env.isGameOver()) {
            // display current board status before anything else
            HexGridPrinter.printHexMap(env);
            Player current = env.getCurrentPlayer();
            int playerIndex = (current == env.getPlayer1()) ? 1 : 2;
            System.out.println("\n--- Player " + playerIndex + "'s turn ---");

            // economy and interest
            tm.startTurn(current, playerIndex);
            System.out.printf("Budget after economy: %.2f\n", current.getBudget());

            if (!tm.isBot(playerIndex)) {
                // human choices: buy then spawn
                System.out.print("Do you want to buy a hex? (y/n) ");
                String ans = sc.nextLine().trim();
                if (ans.equalsIgnoreCase("y")) {
                    System.out.print("Enter row col: ");
                    String[] tok = sc.nextLine().split("\\s+");
                    if (tok.length >= 2) {
                        try {
                            int r = Integer.parseInt(tok[0]);
                            int c = Integer.parseInt(tok[1]);
                            Hex h = env.getGrid().getHex(r, c);
                            if (tm.buyHex(current, h)) {
                                System.out.println("Bought hex.");
                            } else {
                                System.out.println("Buy failed.");
                            }
                        } catch (NumberFormatException ignored) {}
                    }
                }

                System.out.print("Do you want to spawn a minion? (y/n) ");
                ans = sc.nextLine().trim();
                if (ans.equalsIgnoreCase("y")) {
                    System.out.print("Enter row col: ");
                    String[] tok = sc.nextLine().split("\\s+");
                    if (tok.length >= 2) {
                        try {
                            int r = Integer.parseInt(tok[0]);
                            int c = Integer.parseInt(tok[1]);
                            Hex h = env.getGrid().getHex(r, c);
                            System.out.println("Choose strategy: 1=Aggressive 2=Defensive 3=Cautious");
                            String stratChoice = sc.nextLine().trim();
                            Strategy strat = null;
                            try {
                                if (stratChoice.equals("1")) {
                                    System.out.println("Creating aggressive strategy...");
                                    strat = getAggressiveStrategy();
                                } else if (stratChoice.equals("2")) {
                                    System.out.println("Creating defensive strategy...");
                                    strat = getDefensiveStrategy();
                                } else if (stratChoice.equals("3")) {
                                    System.out.println("Creating cautious strategy...");
                                    strat = getCautiousStrategy();
                                } else {
                                    System.out.println("Unknown choice, using defensive...");
                                    strat = getDefensiveStrategy();
                                }
                                System.out.println("Strategy created successfully. Root: " + strat.getRootNode().getClass().getSimpleName());
                            } catch (Exception e) {
                                System.out.println("ERROR creating strategy: " + e.getMessage());
                                e.printStackTrace();
                                strat = getDefensiveStrategy();
                            }
                            if (tm.spawnMinion(current, h,
                                    GameConfig.getInstance().init_hp,
                                    Math.max(1, GameConfig.getInstance().init_hp/10),
                                    strat)) {
                                System.out.println("Spawned minion.");
                            } else {
                                System.out.println("Spawn failed.");
                            }
                        } catch (Exception ignored) {}
                    }
                }

                // execute strategies for this player
                tm.executeStrategies(current);
            } else {
                // bot turn – economy already applied inside startTurn
                // handleBotTurn invoked there as part of startTurn when isBot
            }

            // show board after actions
            HexGridPrinter.printHexMap(env);

            tm.endTurn();
        }

        System.out.println("Game over! Winner: " + tm.getWinner());
    }

    
}