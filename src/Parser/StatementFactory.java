package Parser;

import java.util.List;

public class StatementFactory extends Statement {
    //Singleton
    private static StatementFactory instance;
    private StatementFactory() {}
    public static StatementFactory getInstance() {
        if(instance == null) {
            instance = new StatementFactory();
        }
        return instance;
    }

    //Factory method
    public Statement createDone() {
        return new DoneCommand();
    }

    public Statement createMove(String direction) {
        return new MoveCommand(direction);
    }

    public Statement createShoot(String direction, Expression cost) {
        return new ShootCommand(direction, cost);
    }

    public Statement createAssignment(String name, Expression expr) {
        return new AssignmentStatement(name, expr);
    }

    public Statement createBlock(List<Statement> statement) {
        return new BlockStatement(statement);
    }

    public Statement createIf(Expression cond, Statement thenBranch, Statement elseBranch) {
        return new IfStatement(cond, thenBranch, elseBranch);
    }

    public Statement createWhile(Expression condition, Statement body) {
        return new WhileStatement(condition, body);
    }

}
