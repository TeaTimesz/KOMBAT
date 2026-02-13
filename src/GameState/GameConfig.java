package GameState;
import java.nio.charset.Charset;
import java.nio.file.*;
import java.io.*;

public class GameConfig {
    private static GameConfig instance;
    public final int spawn_cost,hex_purchase_cost,init_budget,init_hp,
                turn_budget,max_budget,interest_pct,max_turns,max_spawns;
    private GameConfig() {
        this.spawn_cost = 100;
        this.hex_purchase_cost = 1000;
        this.init_budget = 1000;
        this.init_hp = 100;
        this.turn_budget = 100;
        this.max_budget = 23456;
        this.interest_pct = 6;
        this.max_turns = 69;
        this.max_spawns = 47;
    }
    public static GameConfig getInstance() {
        if (instance == null) {
            instance = new GameConfig();
            //readFromFile();
        }
        return instance;
    }
//    public static void readFromFile() {
//        Path inputPath = Paths.get("../../config.txt");
//        Charset charset = Charset.forName("UTF-8");
//        try(BufferedReader reader = Files.newBufferedReader(inputPath,charset);){
//            String line = null;
//            while ((line = reader.readLine()) != null) {
//                if(line.trim().isEmpty()){
//                    continue;
//                }
//                evaluateConfiguration(line);
//            }
//        }catch(IOException x){
//            System.err.format("File System Error: %s%n",x);
//        }
//    }
//
//    public static void evaluateConfiguration(String line){
//        String processed = line.replaceAll("="," $1 ");
//        String[] tokens = processed.trim().split("\\s+");
//
//        if(tokens.length % 2 == 0){
//            throw new IllegalArgumentException("Incomplete or empty configuration");
//        }
//
//        String key = tokens[0].trim();
//        long value = Long.parseLong(tokens[2].trim());
//
//        switch (key){
//            case "spawn_cost":
//                spawn_cost = value;
//            case "hex_purchase_cost":
//            case "init_budget":
//            case "init_hp":
//            case "turn_budget":
//            case "max_budget":
//            case "interest_pct":
//            case "max_turns":
//            case "max_spawns":
//        }
//    }
}
