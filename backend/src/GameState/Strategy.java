package GameState;

import Parser.*;

public class Strategy {
    private final Statement rootNode;
//    private final String sourceCode;

    public Strategy(Statement rootNode) {
        this.rootNode = rootNode;
//        this.sourceCode = sourceCode;
    }

    public Statement getRootNode() {
        return rootNode;
    }
}
