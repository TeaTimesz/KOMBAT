import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = 'http://localhost:8080/ws';

let client = null;
let connectPromise = null;

export async function connect() {
    // Already connected — return immediately
    if (client?.connected) return client;

    // Connection attempt already in flight — wait for it
    if (connectPromise) return connectPromise;

    // Client exists and is active (auto-reconnecting) — wait for reconnect
    // IMPORTANT: do NOT deactivate here — that would destroy all STOMP subscriptions
    if (client?.active) {
        connectPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                connectPromise = null;
                reject(new Error('Reconnect timeout'));
            }, 10000);
            const interval = setInterval(() => {
                if (client?.connected) {
                    clearTimeout(timeout);
                    clearInterval(interval);
                    connectPromise = null;
                    resolve(client);
                } else if (!client?.active) {
                    clearTimeout(timeout);
                    clearInterval(interval);
                    connectPromise = null;
                    reject(new Error('Connection lost'));
                }
            }, 100);
        });
        return connectPromise;
    }

    // Stale / dead client — clean up and start fresh
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
