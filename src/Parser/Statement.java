package Parser;

import java.util.List;

public abstract class Statement extends Node {
    public abstract void execute(EvaluationContext ctx);
}

class BlockStatement extends Statement {
    List<Statement> statements;
    public BlockStatement(List<Statement> statements) {
        this.statements = statements;
    }

    @Override
    public void execute(EvaluationContext ctx) {
        for (Statement statement : statements) {
            statement.execute(ctx);
        }
    }
}

class AssignmentStatement extends Statement {
    String identifier;
    Expression expression;
    public AssignmentStatement(String identifier, Expression expression) {
        this.identifier = identifier;
        this.expression = expression;
    }
    @Override
    public void execute(EvaluationContext ctx) {
        long val = expression.eval(ctx);
        ctx.setVariable(identifier, val);
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
    @Override
    public void execute(EvaluationContext ctx) {
        if(condition.eval(ctx) > 0){
            thenBranch.execute(ctx);
        }else{
            elseBranch.execute(ctx);
        }
    }
}

class WhileStatement extends Statement {
    Expression condition;
    Statement body;
    public WhileStatement(Expression condition, Statement body) {
        this.condition = condition;
        this.body = body;
    }

    @Override
    public void execute(EvaluationContext ctx) {
        int count = 0;
        while(condition.eval(ctx) > 0) {
            if(count++ >= 10000) return;
            body.execute(ctx);
        }
    }
}


class MoveCommand extends Statement {
    String direction;
    public MoveCommand(String direction) {
        this.direction = direction;
    }

    @Override
    public void execute(EvaluationContext ctx) {
        if(!ctx.canMove()) throw new DoneException("can't move");
        ctx.consume(1);
    }
}

class ShootCommand  extends Statement {
    String direction;
    Expression cost;
    public ShootCommand(String direction, Expression cost) {
        this.direction = direction;
        this.cost = cost;
    }
    @Override
    public void execute(EvaluationContext ctx) {
        if (!ctx.canShoot()) return;

        ctx.consume(cost.eval(ctx));
    }
}

class DoneCommand extends Statement {
    @Override
    public void execute(EvaluationContext ctx) {
        throw new DoneException("Done command");
    }
}


