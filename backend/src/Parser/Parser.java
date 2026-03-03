package Parser;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public class Parser {
    private final Tokenizer tkz;
    private final StatementFactory stmtFactory = StatementFactory.getInstance();
    private final ExprFactory exprFactory = ExprFactory.getInstance();

    public Parser(String src) {
        this.tkz = new Tokenizer(src);
    }

    public Statement parse() {
        List<Statement> statements = new ArrayList<>();
        while(tkz.hasNextToken()){
            statements.add(parseStatement());
        }
        return stmtFactory.createBlock(statements);
    }

//  Strategy → Statement+
    public List<Statement> parseStrategy() {
        List<Statement> result = new ArrayList<>();
        while (tkz.hasNextToken()) {
            result.add(parseStatement());
        }
        return result;
    }

//  Statement → Command | BlockStatement | IfStatement | WhileStatement
    public Statement parseStatement() {
        if(tkz.peek("while")) return parseWhile();
        if(tkz.peek("if")) return parseIf();
        if(tkz.peek("{")) return parseBlock();
        return parseCommand();
    }

//  Command → AssignmentStatement | ActionCommand
    public Statement parseCommand(){

    //  ActionCommand → done | MoveCommand | AttackCommand
        //  done
        if(tkz.peek("done")){
            tkz.consume();
            return stmtFactory.createDone();
        }
        //  MoveCommand → move Direction
        if (tkz.peek("move")) {
            tkz.consume();

            if (!tkz.hasNextToken())
                throw new SyntaxError("Direction expected");

            String dirToken = tkz.consume();
            Direction dir = Direction.fromString(dirToken);

            if (dir == null)
                throw new SyntaxError("Invalid direction");

            return stmtFactory.createMove(dir);
        }
        //  AttackCommand → shoot Direction Expression
        if (tkz.peek("shoot")) {
            tkz.consume();

            String dirToken = tkz.consume();
            Direction dir = Direction.fromString(dirToken);

            if (dir == null)
                throw new SyntaxError("Invalid direction");

            Expression expr = parseExpression();
            return stmtFactory.createShoot(dir, expr);
        }

    //  AssignmentStatement → <identifier> = Expression
        String name = tkz.consume();
        tkz.consume("=");
        Expression expr = parseExpression();
        return stmtFactory.createAssignment(name, expr);

    }

//  BlockStatement → { Statement* }
    private Statement parseBlock(){
        tkz.consume("{");
        List<Statement> statements = new ArrayList<>();
        while(!tkz.peek("}")){
            statements.add(parseStatement());
        }
        tkz.consume("}");
        return stmtFactory.createBlock(statements);
    }

//  IfStatement → if ( Expression ) then Statement else Statement
    private Statement parseIf(){
        tkz.consume("if");
        tkz.consume("(");
        Expression condition = parseExpression();
        tkz.consume(")");
        tkz.consume("then");
        Statement thenB = parseStatement();
        tkz.consume("else");
        Statement elseB = parseStatement();
        return stmtFactory.createIf(condition, thenB, elseB);
    }

//  WhileStatement → while ( Expression ) Statement
    private Statement parseWhile(){
        tkz.consume("while");
        tkz.consume("(");
        Expression condition = parseExpression();
        tkz.consume(")");
        Statement body = parseStatement();
        return stmtFactory.createWhile(condition, body);
    }

//  Expression → Expression + Term | Expression - Term | Term -> T ( (+|-) T )*
    private Expression parseExpression(){
        Expression expr = parseTerm();
        while(tkz.peek("+") || tkz.peek("-")){
            String op = tkz.consume();
            expr = exprFactory.binary(expr, op, parseTerm());

        }
        return expr;
    }
//  Term → Term * Factor | Term / Factor | Term % Factor | Factor -> F ((*/%)F)*
    private Expression parseTerm(){
        Expression expr = parseFactor();
        while(tkz.peek("*") || tkz.peek("/") || tkz.peek("%")){
            String op = tkz.consume();
            expr = exprFactory.binary(expr, op, parseFactor());
        }
        return expr;
    }
//  Factor → Power ^ Factor | Power
    private Expression parseFactor(){
        Expression expr = parsePower();
        if(tkz.peek("^")){
            String op = tkz.consume();
            expr = exprFactory.binary(expr, op, parseFactor());
        }
        return expr;
    }
//  Power → <number> | <identifier> | ( Expression ) | InfoExpression
    private Expression parsePower(){
        if (tkz.peek("(")) {
            tkz.consume("(");
            Expression e = parseExpression();
            tkz.consume(")");
            return e;
        }

    //  InfoExpression → ally | opponent | nearby Direction
        if(tkz.peek("ally")){
            tkz.consume();
            return exprFactory.ally();
        }
        if(tkz.peek("opponent")){
            tkz.consume();
            return exprFactory.opponent();
        }
        if (tkz.peek("nearby")) {
            tkz.consume();

            String dirToken = tkz.consume();
            Direction dir = Direction.fromString(dirToken);

            if (dir == null)
                throw new SyntaxError("Invalid direction");

            return exprFactory.nearby(dir);
        }


        String token = tkz.consume();
        return exprFactory.expr(token);
    }
}
