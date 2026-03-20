package Controller;

import com.backend.dto.ActionRequest;
import com.backend.dto.GameCreateRequest;
import com.backend.dto.GameStateDTO;
import com.backend.service.GameService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/game")
public class GameController {

    @Autowired
    private GameService gameService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @PostMapping("/create")
    public Map<String, Object> createGame(@RequestBody GameCreateRequest request) {
        return gameService.createGame(request.getMode());
    }

    @PostMapping("/{gameId}/join")
    public Map<String, Object> joinGame(@PathVariable String gameId) {
        return gameService.joinGame(gameId);
    }

    @GetMapping("/{gameId}/state")
    public GameStateDTO getState(@PathVariable String gameId) {
        return gameService.getState(gameId);
    }

    @PostMapping("/{gameId}/spawn-free")
    public GameStateDTO spawnFree(@PathVariable String gameId,
                                  @RequestBody ActionRequest request) {
        GameStateDTO state = gameService.spawnFree(
                gameId, request.getPlayerToken(), request.getRow(), request.getCol());
        broadcast(gameId, state);
        return state;
    }

    @PostMapping("/{gameId}/start")
    public GameStateDTO startGame(@PathVariable String gameId,
                                  @RequestBody ActionRequest request) {
        GameStateDTO state = gameService.startGame(gameId, request.getPlayerToken());
        broadcast(gameId, state);
        return state;
    }

    @PostMapping("/{gameId}/action/buy-hex")
    public GameStateDTO buyHex(@PathVariable String gameId,
                               @RequestBody ActionRequest request) {
        GameStateDTO state = gameService.buyHex(
                gameId, request.getPlayerToken(), request.getRow(), request.getCol());
        broadcast(gameId, state);
        return state;
    }

    @PostMapping("/{gameId}/action/spawn")
    public GameStateDTO spawnMinion(@PathVariable String gameId,
                                    @RequestBody ActionRequest request) {
        GameStateDTO state = gameService.spawnMinion(
                gameId, request.getPlayerToken(), request.getRow(), request.getCol(),
                request.getStrategy());
        broadcast(gameId, state);
        return state;
    }

    @PostMapping("/{gameId}/action/end-turn")
    public GameStateDTO endTurn(@PathVariable String gameId,
                                @RequestBody ActionRequest request) {
        GameStateDTO state = gameService.endTurn(gameId, request.getPlayerToken());
        broadcast(gameId, state);
        return state;
    }

    private void broadcast(String gameId, GameStateDTO state) {
        messagingTemplate.convertAndSend("/topic/game/" + gameId + "/state", state);
    }
}
