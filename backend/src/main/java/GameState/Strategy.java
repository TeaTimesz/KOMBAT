package GameState;

import Parser.*;
import lombok.Getter;

@Getter
public class Strategy {
    private final Statement rootNode;

    public Strategy(Statement rootNode) {
        this.rootNode = rootNode;
    }

}
