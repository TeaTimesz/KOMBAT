package Parser;

import java.util.NoSuchElementException;

//reference from OOP Lab16
public class Tokenizer {
    private final String src;
    private int position = 0;
    private String next;

    public Tokenizer(String src) throws LexicalError {
        this.src = src;
        computeNext();
    }

    public boolean hasNextToken(){
        return  next != null;
    }

    public void checkNextToken(){
        if (!hasNextToken()) throw new NoSuchElementException("No more tokens");
    }

    public boolean peek(String s) {
        if (!hasNextToken()) return false;
        return peek().equals(s);
    }

    public String peek() {
        checkNextToken();
        return next;
    }

    public String consume() throws LexicalError {
        checkNextToken();
        String result = next;
        computeNext();
        return result;
    }

    public void consume(String s) throws SyntaxError, LexicalError {
        if (peek(s))
            consume();
        else
            throw new SyntaxError(s + " expected");
    }

    private void computeNext() {
        StringBuilder s = new StringBuilder();

        // skip whitespace and comment
        while (position < src.length()) {
            if (Character.isWhitespace(src.charAt(position))) {
                position++;
            }
            else if(src.charAt(position) == '#'){
                while(position < src.length() && src.charAt(position) != '\n') position++;
            }else{
                break;
            }
        }

        if (position >= src.length()) {
            next = null;
            return;
        }

        char c = src.charAt(position);

        // number
        if (Character.isDigit(c)) {
            while (position < src.length() && Character.isDigit(src.charAt(position))) {
                s.append(src.charAt(position));
                position++;
            }
        }
        // identifier / keyword
        else if (Character.isLetter(c)) {
            while (position < src.length() && Character.isLetterOrDigit(src.charAt(position))) {
                s.append(src.charAt(position));
                position++;
            }
        }
        // operator
        else if ("+-*/%^=".indexOf(c) >= 0) {
            s.append(c);
            position++;
        }
        // symbol
        else if ("(){}".indexOf(c) >= 0) {
            s.append(c);
            position++;
        }
        else {
            throw new LexicalError("unknown character: " + c);
        }

        next = s.toString();
    }

}
