import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = 'http://localhost:8080/ws';

let client = null;
let connectPromise = null;

export async function connect() {
    // Already have a live connection
    if (client?.connected) return client;

    // Connection attempt already in flight — wait for it
    if (connectPromise) return connectPromise;

    // Stale client (was connected before, now dead) — clean up
    if (client) {
        try { client.deactivate(); } catch (_) {}
        client = null;
    }

    client = new Client({
        webSocketFactory: () => new SockJS(WS_URL),
        reconnectDelay: 3000,
    });

    connectPromise = new Promise((resolve, reject) => {
        client.onConnect = () => {
            connectPromise = null;
            resolve(client);
        };
        client.onStompError = (frame) => {
            connectPromise = null;
            client = null;
            reject(new Error(frame.headers['message'] || 'WebSocket connection error'));
        };
        client.activate();
    });

    return connectPromise;
}

export function disconnect() {
    if (client) {
        client.deactivate();
        client = null;
        connectPromise = null;
    }
}
