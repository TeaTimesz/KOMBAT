const BASE = "http://localhost:8080/api";

const JSON_HEADERS = { "Content-Type": "application/json" };

export const createGame = (mode) =>
  fetch(`${BASE}/game/create`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ mode }),
  }).then((r) => r.json());

export const joinGame = (gameId) =>
  fetch(`${BASE}/game/${gameId}/join`, {
    method: "POST",
    headers: JSON_HEADERS,
  }).then((r) => r.json());

export const getState = (gameId) =>
  fetch(`${BASE}/game/${gameId}/state`).then((r) => r.json());

export const spawnFree = (gameId, playerToken, row, col) =>
  fetch(`${BASE}/game/${gameId}/spawn-free`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ playerToken, row, col }),
  }).then((r) => r.json());

export const startGame = (gameId, playerToken) =>
  fetch(`${BASE}/game/${gameId}/start`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ playerToken }),
  }).then((r) => r.json());

export const buyHex = (gameId, playerToken, row, col) =>
  fetch(`${BASE}/game/${gameId}/action/buy-hex`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ playerToken, row, col }),
  }).then((r) => r.json());

export const spawnMinion = (gameId, playerToken, row, col, strategy) =>
  fetch(`${BASE}/game/${gameId}/action/spawn`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ playerToken, row, col, strategy }),
  }).then((r) => r.json());

export const endTurn = (gameId, playerToken) =>
  fetch(`${BASE}/game/${gameId}/action/end-turn`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ playerToken }),
  }).then((r) => r.json());
