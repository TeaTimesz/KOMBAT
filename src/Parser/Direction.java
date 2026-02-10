package Parser;

public enum Direction {
    up, down, upleft, upright, downleft, downright;

    public static Direction fromString(String s) {
        try {
            return Direction.valueOf(s);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
