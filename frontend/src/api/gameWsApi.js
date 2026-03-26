import { connect } from './wsClient';

// Re-export REST endpoints that stay as HTTP
export { parseStrategy, getState, getLobbyStatus } from './gameApi';

// ── Internal helpers ────────────────────────────────────────────────────────

/**
 * Fire-and-forget: publish a game action without waiting for a response.
 * HexGrid.js resolves the response via its persistent subscribeToGame subscription.
 */
async function sendAction(gameId, action) {
    const client = await connect();
    client.publish({
        destination: `/app/game/${gameId}/action`,
        body: JSON.stringify(action),
    });
}

/**
 * Lobby request/reply using a client-generated correlationId.
 * Server replies to /topic/lobby/{correlationId}/{replyKey}.
 */
async function lobbyRequest(destination, payload, replyKey) {
    const correlationId = Math.random().toString(36).substring(2, 10);
    const client = await connect();

    return new Promise((resolve, reject) => {
        let okSub, errSub;
        const cleanup = () => { okSub?.unsubscribe(); errSub?.unsubscribe(); };

        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Lobby request timed out'));
        }, 15000);

        okSub = client.subscribe(`/topic/lobby/${correlationId}/${replyKey}`, (msg) => {
            clearTimeout(timeout);
            cleanup();
            resolve(JSON.parse(msg.body));
        });

        errSub = client.subscribe(`/topic/lobby/${correlationId}/error`, (msg) => {
            clearTimeout(timeout);
            cleanup();
            reject(new Error(JSON.parse(msg.body).message || 'Request failed'));
        });

        client.publish({
            destination,
            body: JSON.stringify({ ...payload, correlationId }),
        });
    });
}

// ── Game session creation (SOLITAIRE / AUTO / local DUEL) — stays on REST ─
// HexGrid.startFreshGame uses these; they return { gameId, p1Token, state }.
export { createGame, joinGame } from './gameApi';

// ── Lobby room management (DUEL lobby flow) ────────────────────────────────

/** P1: create a lobby room, receive lobbyId. */
export const createLobby = () =>
    lobbyRequest('/app/lobby/create', {}, 'created').then(r => r.lobbyId);

/** P2: join an existing lobby room, receive confirmation. */
export const joinLobby = (lobbyId) =>
    lobbyRequest(`/app/lobby/${lobbyId}/join`, {}, 'joined');

/** Toggle this player's ready state (fire-and-forget). */
export const setReady = async (lobbyId, role) => {
    const client = await connect();
    client.publish({ destination: `/app/lobby/${lobbyId}/ready`, body: JSON.stringify({ role }) });
};

/** Host: signal that minion setup is starting. */
export const lobbyStartSetup = async (lobbyId, role) => {
    const client = await connect();
    client.publish({ destination: `/app/lobby/${lobbyId}/start`, body: JSON.stringify({ role }) });
};

/** Host: send completed minion kinds to trigger game creation. */
export const lobbySetupDone = async (lobbyId, kinds) => {
    const client = await connect();
    client.publish({
        destination: `/app/lobby/${lobbyId}/setup-done`,
        body: JSON.stringify({ kinds }),
    });
};

/** Re-register WS session + request current lobby state (called on page mount). */
export const lobbySync = async (lobbyId, role) => {
    const client = await connect();
    client.publish({
        destination: `/app/lobby/${lobbyId}/sync`,
        body: JSON.stringify({ role }),
    });
};

/** Reset ready states for a rematch. */
export const lobbyReset = async (lobbyId) => {
    const client = await connect();
    client.publish({ destination: `/app/lobby/${lobbyId}/reset`, body: '{}' });
};

/** Subscribe to live lobby status events. Returns an unsubscribe function. */
export async function subscribeToLobbyStatus(lobbyId, onStatus) {
    const client = await connect();
    const sub = client.subscribe(`/topic/lobby/${lobbyId}/status`, (msg) => {
        onStatus(JSON.parse(msg.body));
    });
    return () => sub.unsubscribe();
}

// ── Lobby info in localStorage ─────────────────────────────────────────────

const LOBBY_KEY = 'kombat_lobby';
export const saveLobbyInfo  = (data) => { try { sessionStorage.setItem(LOBBY_KEY, JSON.stringify(data)); } catch (_) {} };
export const loadLobbyInfo  = ()     => { try { return JSON.parse(sessionStorage.getItem(LOBBY_KEY)); } catch (_) { return null; } };
export const clearLobbyInfo = ()     => sessionStorage.removeItem(LOBBY_KEY);

// ── In-game actions (fire-and-forget; state arrives via persistent subscription) ──

export const spawnFree = (gameId, playerToken, row, col, strategy, defenseFactor) =>
    sendAction(gameId, { type: 'SPAWN_FREE', playerToken, row, col, strategy, defenseFactor });

export const startGame = (gameId, playerToken) =>
    sendAction(gameId, { type: 'START_GAME', playerToken });

export const buyHex = (gameId, playerToken, row, col) =>
    sendAction(gameId, { type: 'BUY_HEX', playerToken, row, col });

export const spawnMinion = (gameId, playerToken, row, col, strategy, defenseFactor) =>
    sendAction(gameId, { type: 'SPAWN', playerToken, row, col, strategy, defenseFactor });

export const endTurn = (gameId, playerToken) =>
    sendAction(gameId, { type: 'END_TURN', playerToken });

export const botMove = (gameId) =>
    sendAction(gameId, { type: 'BOT_MOVE' });

export const botBuyHex = (gameId) =>
    sendAction(gameId, { type: 'BOT_BUY_HEX' });

export const botSpawnMinion = (gameId) =>
    sendAction(gameId, { type: 'BOT_SPAWN_MINION' });

// ── Persistent subscriptions (passive updates for DUEL two-device play) ────

/**
 * Subscribe to game state and error topics.
 * Returns an unsubscribe function — call it in useEffect cleanup.
 */
export async function subscribeToGame(gameId, onState, onError) {
    const client = await connect();
    const stateSub = client.subscribe(`/topic/game/${gameId}/state`, (msg) => {
        onState(JSON.parse(msg.body));
    });
    const errSub = client.subscribe(`/topic/game/${gameId}/error`, (msg) => {
        if (onError) onError(JSON.parse(msg.body));
    });
    return () => { stateSub.unsubscribe(); errSub.unsubscribe(); };
}

/**
 * Subscribe to lobby events (e.g. PLAYER_JOINED) for a specific game.
 * Returns an unsubscribe function.
 */
export async function subscribeToLobby(gameId, onEvent) {
    const client = await connect();
    const sub = client.subscribe(`/topic/game/${gameId}/lobby`, (msg) => {
        onEvent(JSON.parse(msg.body));
    });
    return () => sub.unsubscribe();
}
