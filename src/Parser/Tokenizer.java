package Parser;

import java.util.NoSuchElementException;
import java.util.Set;

import static java.lang.Character.*;

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
        while (position < src.length() && isWhitespace(src.charAt(position))) {
            position++;//ignore whitespace
        }

        if (position == src.length()) {
            next = null;
            return; // no more tokens
        }

        char c = src.charAt(position);

        //Tokentype check

        if (isDigit(c)) {  //number
            s.append(c);
            for (position++; position < src.length() && isDigit(src.charAt(position)); position++) {
                s.append(src.charAt(position));
            }
        }
        else if (isLetter(c)) { //identifier,keyword,direction
            s.append(c);
            for (position++; position < src.length() && isLetter(src.charAt(position)); position++) {
                s.append(src.charAt(position));
            }
        }
        else if("+-*/%^=".indexOf(c) >= 0){ //operator
            s.append(c);
            position++;
        }
        else if("(){}".indexOf(c) >= 0){//symbol
            s.append(c);
            position++;
        }else{
            throw new LexicalError("unknown character");
        }

        next = s.toString();

    }
}
