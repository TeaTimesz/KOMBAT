package GameState;
import java.nio.charset.Charset;
import java.nio.file.*;
import java.io.*;
import java.util.HashMap;
import java.util.Map;

public class GameConfig {
    private static GameConfig instance;

    public final long spawn_cost;
    public final long hex_purchase_cost;
    public final long init_budget;
    public final long init_hp;
    public final long turn_budget;
    public final long max_budget;
    public final long interest_pct;
    public final long max_turns;
    public final long max_spawns;

    private GameConfig() {
        Map<String, Long> configValues = readFromFile();

        this.spawn_cost = configValues.getOrDefault("spawn_cost", 100L);
        this.hex_purchase_cost = configValues.getOrDefault("hex_purchase_cost", 1000L);
        this.init_budget = configValues.getOrDefault("init_budget", 10000L);
        this.init_hp = configValues.getOrDefault("init_hp", 100L);
        this.turn_budget = configValues.getOrDefault("turn_budget", 90L);
        this.max_budget = configValues.getOrDefault("max_budget", 23456L);
        this.interest_pct = configValues.getOrDefault("interest_pct", 5L);
        this.max_turns = configValues.getOrDefault("max_turns", 69L);
        this.max_spawns = configValues.getOrDefault("max_spawns", 47L);
    }

    public static GameConfig getInstance() {
        if (instance == null) {
            instance = new GameConfig();
        }
        return instance;
    }

    private Map<String, Long> readFromFile() {
        Map<String, Long> map = new HashMap<>();
        Path inputPath = Paths.get("backend/src/ConfigFile.txt");

        if (!Files.exists(inputPath)) {
            System.out.println("Config file not found. Using default presets.");
            return map;
        }

        Charset charset = Charset.forName("UTF-8");
        try (BufferedReader reader = Files.newBufferedReader(inputPath, charset)) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty()) {
                    continue;
                }
                String[] tokens = line.split("=");
                if (tokens.length == 2) {
                    String key = tokens[0].trim();
                    long value = Long.parseLong(tokens[1].trim());
                    map.put(key, value);
                } else {
                    System.err.println("Warning: Invalid config format ignored: " + line);
                }
            }
        } catch (IOException | NumberFormatException x) {
            System.err.println("Error reading config file: " + x.getMessage() + ". Using defaults for missing values.");
        }
        return map;
    }
}
