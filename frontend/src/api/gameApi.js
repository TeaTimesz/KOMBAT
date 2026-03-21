const BASE = "http://localhost:8080/api";

const JSON_HEADERS = { "Content-Type": "application/json" };

async function checkOk(r) {
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try { const body = await r.json(); msg = body.message || body.error || msg; } catch (_) {}
    throw new Error(msg);
  }
  return r.json();
}

export const parseStrategy = (strategy) =>
  fetch(`${BASE}/game/parse-strategy`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ strategy }),
  }).then(checkOk);

export const createGame = (mode) =>
  fetch(`${BASE}/game/create`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ mode }),
  }).then(checkOk);

export const joinGame = (gameId) =>
  fetch(`${BASE}/game/${gameId}/join`, {
    method: "POST",
    headers: JSON_HEADERS,
  }).then(checkOk);

export const getState = (gameId) =>
  fetch(`${BASE}/game/${gameId}/state`).then(checkOk);

export const spawnFree = (gameId, playerToken, row, col, strategy, defenseFactor) =>
  fetch(`${BASE}/game/${gameId}/spawn-free`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ playerToken, row, col, strategy, defenseFactor }),
  }).then(checkOk);

export const startGame = (gameId, playerToken) =>
  fetch(`${BASE}/game/${gameId}/start`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ playerToken }),
  }).then(checkOk);

export const buyHex = (gameId, playerToken, row, col) =>
  fetch(`${BASE}/game/${gameId}/action/buy-hex`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ playerToken, row, col }),
  }).then(checkOk);

export const spawnMinion = (gameId, playerToken, row, col, strategy, defenseFactor) =>
  fetch(`${BASE}/game/${gameId}/action/spawn`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ playerToken, row, col, strategy, defenseFactor }),
  }).then(checkOk);

export const endTurn = (gameId, playerToken) =>
  fetch(`${BASE}/game/${gameId}/action/end-turn`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ playerToken }),
  }).then(checkOk);
