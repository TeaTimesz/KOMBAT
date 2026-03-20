import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

/**
 * Connect to the game WebSocket and subscribe to state updates.
 * @param {string} gameId
 * @param {function} onState  - called with parsed GameStateDTO on every broadcast
 * @returns {Client}          - STOMP client (call client.deactivate() to disconnect)
 */
export function connectGame(gameId, onState) {
  const client = new Client({
    webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
    onConnect: () => {
      client.subscribe(`/topic/game/${gameId}/state`, (msg) => {
        onState(JSON.parse(msg.body));
      });
    },
    onStompError: (frame) => {
      console.error("STOMP error", frame);
    },
  });

  client.activate();
  return client;
}

/**
 * Send a game action via WebSocket.
 * @param {Client} client
 * @param {string} gameId
 * @param {{ playerToken: string, type: string, row?: number, col?: number, strategy?: string }} action
 */
export function sendAction(client, gameId, action) {
  client.publish({
    destination: `/app/game/${gameId}/action`,
    body: JSON.stringify(action),
  });
}
