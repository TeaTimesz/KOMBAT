package Parser;

public class LexicalError extends RuntimeException {
    public LexicalError(String message) {
        super(message);
    }
}
