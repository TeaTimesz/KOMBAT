package Parser;

import java.util.List;

public abstract class Statement extends Node {
}

class BlockStatement extends Statement {
    List<Statement> statements;
    public BlockStatement(List<Statement> statements) {
        this.statements = statements;
    }
}

class AssignmentStatement extends Statement {
    String identifier;
    Expression expression;
    public AssignmentStatement(String identifier, Expression expression) {
        this.identifier = identifier;
        this.expression = expression;
    }
}

class IfStatement extends Statement {
    Expression condition;
    Statement thenBranch;
    Statement elseBranch;
    public IfStatement(Expression condition, Statement thenBranch, Statement elseBranch) {
        this.condition = condition;
        this.thenBranch = thenBranch;
        this.elseBranch = elseBranch;
    }
}

class WhileStatement extends Statement {
    Expression condition;
    Statement body;
    public WhileStatement(Expression condition, Statement body) {
        this.condition = condition;
        this.body = body;
    }
}


class MoveCommand extends Statement {
    String direction;
    public MoveCommand(String direction) {
        this.direction = direction;
    }
}

class ShootCommand  extends Statement {
    String direction;
    Expression cost;
    public ShootCommand(String direction, Expression cost) {
        this.direction = direction;
        this.cost = cost;
    }
}

class DoneCommand extends Statement {}


