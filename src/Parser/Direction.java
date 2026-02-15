package Parser;

public enum Direction {
    up,upright,downright,down,downleft,upleft;

    public static Direction fromString(String s) {
        try {
            return Direction.valueOf(s);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
