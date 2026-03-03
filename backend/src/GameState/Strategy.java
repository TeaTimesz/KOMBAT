package GameState;

import Parser.*;

public class Strategy {
    private final Statement rootNode;

    public Strategy(Statement rootNode) {
        this.rootNode = rootNode;
    }

    public Statement getRootNode() {
        return rootNode;
    }
}
