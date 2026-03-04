package Parser;

import java.util.List;

//implement using visitor pattern
public abstract class Statement {
    public abstract void execute(EvaluationContext ctx)throws DoneException;
}

class BlockStatement extends Statement {
    List<Statement> statements;
    public BlockStatement(List<Statement> statements) {
        this.statements = statements;
    }

    @Override
    public void execute(EvaluationContext ctx) throws DoneException {
        for (Statement statement : statements) {
            statement.execute(ctx);
        }
    }
}

class AssignmentStatement extends Statement {
    String identifier;
    Expression expression;
    private static final java.util.Set<String> SpecialVariable = java.util.Set.of("row","col","Budget","Int","MaxBudget",
                                                                                "SpawnsLeft","random");
    private static final java.util.Set<String> ReserveWord = java.util.Set.of("ally","done","down","downleft","downright","else",
                                                                                "if","move","nearby","opponent","shoot","then","up","upleft",
                                                                                "upright","while");
    public AssignmentStatement(String identifier, Expression expression) {
        this.identifier = identifier;
        this.expression = expression;
    }
    @Override
    public void execute(EvaluationContext ctx) throws DoneException {
        if(ReserveWord.contains(identifier)){
            throw new SyntaxError("Cannot use Reserved Word as identifier");
        }
        if(SpecialVariable.contains(identifier)){
            return; // no-op;
        }
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
    public void execute(EvaluationContext ctx) throws DoneException {
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
    public void execute(EvaluationContext ctx) throws DoneException {
        int count = 0;
        while(count < 10000 && condition.eval(ctx) > 0) { // make it check the condition again every iteration
            body.execute(ctx);
            count++;
        }
    }
}


class MoveCommand extends Statement {
    Direction direction;
    public MoveCommand(Direction direction) {
        this.direction = direction;
    }

    @Override
    public void execute(EvaluationContext ctx) throws DoneException {
        if (ctx.getPlayer().getBudget() < 1){
            throw new DoneException("Budget is less than 1");
        }
        ctx.getPlayer().editBudget(-1);
        ctx.getEnv().moveMinion(ctx.getMinion(),direction);
        throw new DoneException("Done after moving");
    }
}

class ShootCommand  extends Statement {
    Direction direction;
    Expression cost;
    public ShootCommand(Direction direction, Expression cost) {
        this.direction = direction;
        this.cost = cost;
    }
    @Override
    public void execute(EvaluationContext ctx) throws DoneException {
        long expenditure = cost.eval(ctx);
        long totalCost = expenditure + 1;

        if(ctx.getPlayer().getBudget() >= totalCost){
            ctx.getPlayer().editBudget(-totalCost);
            ctx.getEnv().shootHex(ctx.getMinion(),direction,expenditure);
        }
        throw new DoneException("Done after shooting");
    }
}

class DoneCommand extends Statement {
    @Override
    public void execute(EvaluationContext ctx) {
        throw new DoneException("Done command");
    }
}


