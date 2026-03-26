import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as api from '../api/gameWsApi';
import '../css/hexgrid.css';

const ROWS = 8, COLS = 8, R = 40;
const HEX_W = 2 * R;
const HEX_H = Math.sqrt(3) * R;
const COL_SPACING = 1.5 * R;

const STORAGE_KEY = 'kombat_session';

function saveSession(data) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
}
function loadSession() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)); } catch (_) { return null; }
}
function clearSession() {
    sessionStorage.removeItem(STORAGE_KEY);
}

const toBackend = (fCol, fRow) => ({ row: fRow + 1, col: fCol + 1 });
const toKey     = (bRow, bCol) => `${bCol - 1}-${bRow - 1}`;

// Even columns (fCol % 2 === 0) are shifted down by HEX_H/2 in this grid.
// Adjacent-column neighbours shift row by +1 (even) or -1 (odd).
const getHexNeighbors = (fCol, fRow) => {
    const rowOffset = fCol % 2 === 0 ? 1 : -1;
    return [
        [fCol,     fRow - 1], [fCol,     fRow + 1],
        [fCol - 1, fRow],     [fCol - 1, fRow + rowOffset],
        [fCol + 1, fRow],     [fCol + 1, fRow + rowOffset],
    ].filter(([c, r]) => c >= 0 && c < COLS && r >= 0 && r < ROWS);
};

// Convert minion{N}.png → p{player}_{N}.png based on owning player
const getMinionImg = (kindImg, ownerPlayer) => {
    if (!kindImg || !ownerPlayer) return kindImg;
    return kindImg.replace(/\/images\/minion(\d+)\.png$/, `/images/p${ownerPlayer}_$1.png`);
};

// ─── Player Stats Panel ────────────────────────────────────────────────────────

function PlayerPanel({ num, data, isActive, mode }) {
    return (
        <div className={`player-stats ${num === 1 ? 'p1-stats' : 'p2-stats'} ${isActive && mode !== 'AUTO' ? (num === 1 ? 'active-p1' : 'active-p2') : ''}`}>
            <div className="player-name">Player {num}</div>
            <div className="stats-info">
                <div className="stat-item">
                    <div className={`icon hex-icon ${num === 1 ? 'p1-color' : 'p2-color'}`}></div>
                    <span>Spawns Left<br /><b>{data?.spawnsLeft ?? '—'}</b></span>
                </div>
                <div className="stat-item">
                    <div className="icon coin-icon"></div>
                    <span>Budget<br /><b>{data ? Math.floor(data.budget) : '—'}</b></span>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function HexGridPage() {
    const location = useLocation();
    const navigate = useNavigate();

    const [mode, setMode] = useState('DUEL');
    const [minionKinds, setMinionKinds] = useState([]);
    const [gameId, setGameId]           = useState(null);
    const [p1Token, setP1Token]         = useState(null);
    const [p2Token, setP2Token]         = useState(null);
    const [gameState, setGameState]     = useState(null);

    const [setupStep, setSetupStep]         = useState(1);
    const [setupKindIdx, setSetupKindIdx]   = useState(0);
    const [turnStep, setTurnStep]           = useState('buy');
    const [selectedKindIdx, setSelectedKindIdx] = useState(null);

    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const [minionImgMap, setMinionImgMap] = useState({});
    const [turnLog, setTurnLog] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState(null); // { title, cost, onConfirm }
    const [boardScale, setBoardScale] = useState(1);
    const logEndRef = useRef(null);
    const pendingStateRef = useRef(null);
    // Tracks the last (turnCount, currentPlayer) that was written to the turn log,
    // so passive WS updates don't repeat the turn header on every intermediate action.
    const lastLoggedTurnRef = useRef({ player: null, count: null });

    const addLog = (text) => setTurnLog(prev => [...prev, text]);

    useEffect(() => {
        if (turnLog.length > 0) persist({ turnLog });
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [turnLog]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        // Natural board size: R=40 → boardW=500, boardH≈589, with padding 120×80
        const NATURAL_W = (COLS - 1) * COL_SPACING + HEX_W + 120;
        const NATURAL_H = (ROWS - 1) * HEX_H + HEX_H + HEX_H / 2 + 80;
        const calc = () => {
            const sidebarW = Math.min(180, Math.max(90, window.innerWidth * 0.13)) * 2 + 40;
            const availW = window.innerWidth - sidebarW - 40;
            const availH = window.innerHeight - 130 - 40; // minus topbar and padding
            const scale = Math.min(availW / NATURAL_W, availH / NATURAL_H, 1);
            setBoardScale(Math.max(scale, 0.35));
        };
        calc();
        window.addEventListener('resize', calc);
        return () => window.removeEventListener('resize', calc);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /** Waits for the next state broadcast from the persistent subscription. */
    const waitForNextState = (ms = 10000) => new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            pendingStateRef.current = null;
            reject(new Error('No response from server (timeout)'));
        }, ms);
        pendingStateRef.current = {
            resolve: (state) => { clearTimeout(timeout); resolve(state); },
            reject:  (err)   => { clearTimeout(timeout); reject(err); },
        };
    });

    // ── Persistent WS subscription — keeps state live for two-device DUEL ────
    useEffect(() => {
        if (!gameId) return;
        let unsubscribe;
        api.subscribeToGame(
            gameId,
            (state) => {
                if (pendingStateRef.current) {
                    // Active path: this device performed an action — handler owns state updates
                    pendingStateRef.current.resolve(state);
                    pendingStateRef.current = null;
                } else {
                    // Passive path: other device took an action — sync everything here
                    setGameState(state);
                    setLoading(false);

                    // Assign images to minions spawned by the other player
                    setMinionImgMap(prev => {
                        const updated = { ...prev };
                        let changed = false;
                        state.grid?.forEach(h => {
                            if (h.hasMinion && h.minionId != null && !updated[h.minionId]) {
                                const kind = minionKinds[Math.floor(Math.random() * minionKinds.length)];
                                if (kind) { updated[h.minionId] = getMinionImg(kind.img, h.minionOwner); changed = true; }
                            }
                        });
                        return changed ? updated : prev;
                    });

                    if (state.gameOver) {
                        const result = state.winner === 0 ? 'Tie!' : `P${state.winner} wins!`;
                        addLog(`── Game over — ${result} ──`);
                        navigate('/endgame', { state: { winner: state.winner, mode } });
                        return;
                    }

                    if (state.phase !== 'PLAYING') return;

                    // Only emit the turn header + action log when the turn actually changes.
                    // Without this guard every intermediate action (buyHex, spawnMinion)
                    // would repeat the header because the server broadcasts after each one.
                    const prev = lastLoggedTurnRef.current;
                    const turnJustChanged =
                        state.currentPlayer !== prev.player || state.turnCount !== prev.count;

                    if (turnJustChanged) {
                        // Strategy results + next-turn budget are in actionLog after endTurn
                        if (state.actionLog?.length) {
                            if (prev.player !== null) addLog(`── P${prev.player} strategies ──`);
                            state.actionLog.forEach(e => addLog(e));
                        }
                        addLog(`[T${state.turnCount + 1}] P${state.currentPlayer}'s turn`);
                        lastLoggedTurnRef.current = { player: state.currentPlayer, count: state.turnCount };
                        setTurnStep('buy');
                        setSelectedKindIdx(null);
                        if (isTwoDevice) {
                            setMessage(state.currentPlayer === myPlayer
                                ? `Your turn (Player ${myPlayer}) — buy a hex or click END TURN.`
                                : `Waiting for Player ${state.currentPlayer}…`);
                        } else {
                            setMessage(`Player ${state.currentPlayer}'s turn — buy a hex or click END TURN.`);
                        }
                    }
                }
            },
            (err) => {
                if (pendingStateRef.current) {
                    pendingStateRef.current.reject(new Error(err.message));
                    pendingStateRef.current = null;
                }
                setMessage('Error: ' + err.message);
                setLoading(false);
            }
        ).then(unsub => { unsubscribe = unsub; }).catch(() => {});
        return () => unsubscribe?.();
    }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── 2-device DUEL: sync setupStep from game state ────────────────────────
    // When the other device spawns, advance local setupStep to reflect it
    useEffect(() => {
        if (gameState?.phase !== 'SETUP') return;
        const p1Done = gameState.grid?.some(h => h.minionOwner === 1);
        const p2Done = gameState.grid?.some(h => h.minionOwner === 2);
        if (p1Done && p2Done) setSetupStep(3);
    }, [gameState]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Persist helpers ───────────────────────────────────────────────────────

    const persist = (patch) => {
        const current = loadSession() ?? {};
        saveSession({ ...current, ...patch });
    };

    /** Auto-spawn a bot minion for playerNum during SETUP phase. */
    const botSetupSpawn = async (playerNum, token, gId, currentState, imgMapIn, kinds = minionKinds) => {
        const candidates = currentState.grid?.filter(h => h.territory === playerNum && !h.hasMinion) ?? [];
        if (!candidates.length) return { state: currentState, newImgMap: imgMapIn };
        const hex = candidates[Math.floor(Math.random() * candidates.length)];
        const kind = kinds[0];
        try {
            await api.spawnFree(gId, token, hex.row, hex.col, kind.strategy, kind.defense);
            const state = await waitForNextState();
            const spawnedHex = state.grid?.find(h => h.row === hex.row && h.col === hex.col);
            const newImgMap = spawnedHex?.minionId != null
                ? { ...imgMapIn, [spawnedHex.minionId]: getMinionImg(kind.img, playerNum) }
                : imgMapIn;
            setGameState(state);
            setMinionImgMap(newImgMap);
            addLog(`[Setup] Bot P${playerNum} spawned "${kind.name}" at (${hex.row},${hex.col})`);
            return { state, newImgMap };
        } catch (e) {
            setMessage('Bot setup spawn failed: ' + e.message);
            return { state: currentState, newImgMap: imgMapIn };
        }
    };

    // ── Init ──────────────────────────────────────────────────────────────────

    const startFreshGame = async (kinds, modeStr = 'DUEL') => {
        setLoading(true);
        setMode(modeStr);
        setMinionKinds(kinds);
        setSetupStep(1);
        setSetupKindIdx(0);
        setTurnStep('buy');
        setSelectedKindIdx(null);
        setGameState(null);
        setMinionImgMap({});
        setTurnLog(['── New game started ──']);
        setMessage('Starting new game…');
        clearSession();
        try {
            const created = await api.createGame(modeStr);
            const gId = created.gameId;
            const t1  = created.p1Token;
            const joined = await api.joinGame(gId);
            const t2 = joined.p2Token;

            setGameId(gId);
            setP1Token(t1);
            setP2Token(t2);
            setGameState(joined.state);
            saveSession({ gameId: gId, p1Token: t1, p2Token: t2, minionKinds: kinds,
                          mode: modeStr, setupStep: 1, setupKindIdx: 0, turnStep: 'buy', minionImgMap: {} });
            addLog(`Game ID: ${gId}`);
            if (modeStr === 'AUTO') {
                setMessage('Bot is placing minions…');
                const { state: s1, newImgMap: im1 } = await botSetupSpawn(1, t1, gId, joined.state, {}, kinds);
                const { state: s2, newImgMap: im2 } = await botSetupSpawn(2, t2, gId, s1, im1, kinds);
                // Rebuild imgMap from final state to ensure both bots have images
                const finalImgMap = { ...im2 };
                s2.grid?.forEach(h => {
                    if (h.hasMinion && h.minionId && !finalImgMap[h.minionId]) {
                        const kind = kinds[0];
                        if (kind) finalImgMap[h.minionId] = getMinionImg(kind.img, h.minionOwner);
                    }
                });
                setMinionImgMap(finalImgMap);
                setSetupStep(3);
                saveSession({ gameId: gId, p1Token: t1, p2Token: t2, minionKinds: kinds,
                              mode: modeStr, setupStep: 3, setupKindIdx: 0, turnStep: 'buy', minionImgMap: finalImgMap });
                setMessage('Both players ready! Click START GAME.');
            } else {
                setMessage('SETUP — Player 1: pick a kind from the sidebar, then click a blue hex to spawn.');
            }
        } catch (e) {
            console.error('[startFreshGame]', e);
            setMessage('Could not start game: ' + e.message);
        }
        setLoading(false);
    };

    const restoreGame = async (saved) => {
        setLoading(true);
        setMessage('Restoring game…');
        try {
            const state = await api.getState(saved.gameId);
            const restoredMode  = saved.mode ?? 'DUEL';
            const restoredKinds = saved.minionKinds ?? [];
            const t1 = saved.p1Token, t2 = saved.p2Token, gId = saved.gameId;

            setGameId(gId);
            setP1Token(t1);
            setP2Token(t2);
            setMode(restoredMode);
            setMinionKinds(restoredKinds);
            setSetupKindIdx(saved.setupKindIdx ?? 0);
            setTurnStep(saved.turnStep ?? 'buy');
            setTurnLog(saved.turnLog?.length ? saved.turnLog : ['── Session restored ──']);

            // Rebuild imgMap from current grid (saved map may be stale)
            const builtMap = {};
            state.grid?.forEach(h => {
                if (h.hasMinion && h.minionId) {
                    const kind = restoredKinds[0];
                    if (kind) builtMap[h.minionId] = getMinionImg(kind.img, h.minionOwner);
                }
            });
            const imgMap = Object.keys(builtMap).length > 0 ? builtMap : (saved.minionImgMap ?? {});
            setMinionImgMap(imgMap);

            // Derive actual setup step from backend grid (not from stale session value)
            let setupStep = saved.setupStep ?? 1;
            if (state.phase === 'SETUP') {
                const p1Has = state.grid?.some(h => h.minionOwner === 1 && h.hasMinion);
                const p2Has = state.grid?.some(h => h.minionOwner === 2 && h.hasMinion);
                if (p1Has && p2Has) setupStep = 3;
                else if (p1Has) setupStep = 2;
                else setupStep = 1;

                // AUTO: re-run bot setup for any missing bot minions
                if (restoredMode === 'AUTO' && setupStep < 3) {
                    setGameState(state);
                    setSetupStep(setupStep);
                    setMessage('Bot is placing minions…');
                    let curState = state, curMap = imgMap;
                    if (setupStep <= 1) {
                        ({ state: curState, newImgMap: curMap } =
                            await botSetupSpawn(1, t1, gId, curState, curMap, restoredKinds));
                    }
                    const { newImgMap: im2 } =
                        await botSetupSpawn(2, t2, gId, curState, curMap, restoredKinds);
                    setSetupStep(3);
                    persist({ setupStep: 3, minionImgMap: im2 });
                    setMessage('Both players ready! Click START GAME.');
                    setLoading(false);
                    return;
                }

                // SOLITAIRE: P1 spawned but P2 bot hasn't yet
                if (restoredMode === 'SOLITAIRE' && setupStep === 2) {
                    setGameState(state);
                    setSetupStep(2);
                    setMessage('Bot is placing its minion…');
                    const { newImgMap: im2 } =
                        await botSetupSpawn(2, t2, gId, state, imgMap, restoredKinds);
                    setSetupStep(3);
                    persist({ setupStep: 3, minionImgMap: im2 });
                    setMessage('Both players ready! Click START GAME.');
                    setLoading(false);
                    return;
                }
            }

            setSetupStep(setupStep);
            setGameState(state);
            setMessage('Game restored! Continue where you left off.');
        } catch (e) {
            // Backend was restarted — session is gone, start fresh
            clearSession();
            await startFreshGame(saved.minionKinds ?? [], saved.mode ?? 'DUEL');
        }
        setLoading(false);
    };

    // ── Lobby join — HexGrid received an already-created game from Coderoom/Joinroom ─
    const startLobbyGame = async (gId, t1, t2, kinds, selectedMode) => {
        setLoading(true);
        setMode(selectedMode);
        setMinionKinds(kinds ?? []);
        setSetupStep(t2 && !t1 ? 2 : 1); // P2-only device starts at step 2
        setSetupKindIdx(0);
        setTurnStep('buy');
        setGameId(gId);
        setP1Token(t1 ?? null);
        setP2Token(t2 ?? null);
        setMinionImgMap({});
        setTurnLog(['── Lobby game joined ──']);
        clearSession();
        try {
            const state = await api.getState(gId);
            setGameState(state);
            saveSession({ gameId: gId, p1Token: t1, p2Token: t2,
                minionKinds: kinds ?? [], mode: selectedMode,
                setupStep: t2 && !t1 ? 2 : 1, setupKindIdx: 0,
                turnStep: 'buy', minionImgMap: {} });
            setMessage(t1
                ? 'You are Player 1. Set up your minion then click START GAME.'
                : 'You are Player 2. Wait for Player 1 or set up your minion.');
        } catch (e) {
            setMessage('Could not load game: ' + e.message);
        }
        setLoading(false);
    };

    useEffect(() => {
        const initialMode = location.state?.mode || (loadSession()?.mode) || 'DUEL';

        // ── Lobby path: game already exists (from Coderoom / Joinroom) ──
        const lobbyGameId = location.state?.gameId;
        if (lobbyGameId) {
            window.history.replaceState({}, '');
            const rawKinds = location.state?.minionKinds;
            const kinds = rawKinds?.map(m => ({
                id:       m.id,
                img:      m.img ?? `/images/minion${m.id}.png`,
                name:     m.name,
                defense:  Number(m.defense ?? m.defenseFactor) || 1,
                strategy: m.strategy,
            }));
            startLobbyGame(lobbyGameId, location.state?.p1Token ?? null,
                location.state?.p2Token ?? null, kinds, initialMode);
            return;
        }

        const rawMinions = location.state?.minions ?? location.state?.minionKinds;
        const navKinds = rawMinions?.map(m => ({
            id:      m.id,
            img:     m.img ?? `/images/minion${m.id}.png`,
            name:    m.name,
            defense: m.defense ?? m.defenseFactor,
            strategy: m.strategy,
        }));
        if (navKinds?.length) {
            // Clear history state immediately so a page refresh won't re-trigger fresh start
            window.history.replaceState({}, '');
            startFreshGame(navKinds, initialMode);
        } else {
            const saved = loadSession();
            if (saved?.gameId) {
                restoreGame(saved);
            } else {
                navigate('/');
            }
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Helpers ───────────────────────────────────────────────────────────────

    const hexMap = {};
    if (gameState?.grid) {
        for (const h of gameState.grid) hexMap[toKey(h.row, h.col)] = h;
    }

    const getCurrentToken = () =>
        gameState?.currentPlayer === 1 ? p1Token : p2Token;

    // ── Hex click ─────────────────────────────────────────────────────────────

    const handleHexClick = async (fCol, fRow) => {
        if (loading || !gameState || gameState.gameOver) return;

        const key = `${fCol}-${fRow}`;
        const { row: bRow, col: bCol } = toBackend(fCol, fRow);
        const hexData = hexMap[key];

        // ── SETUP ──
        if (gameState.phase === 'SETUP') {
            if (setupStep > 2) return;
            // 2-device: only allow spawning your own player
            if (isTwoDevice && !canSpawnInSetup) {
                setMessage(`Wait — it's Player ${myPlayer === 1 ? 2 : 1}'s turn to set up.`);
                return;
            }
            const playerNum = setupStep;
            const token = playerNum === 1 ? p1Token : p2Token;
            const kind  = minionKinds[setupKindIdx];

            if ((hexData?.territory ?? 0) !== playerNum) {
                setMessage(`Player ${playerNum}: click a hex inside YOUR territory.`);
                return;
            }
            if (hexData?.hasMinion) {
                setMessage('That hex is already occupied!');
                return;
            }

            setLoading(true);
            try {
                await api.spawnFree(gameId, token, bRow, bCol, kind.strategy, kind.defense);
                const state = await waitForNextState();
                const spawnedHex = state.grid?.find(h => h.row === bRow && h.col === bCol);
                const newImgMap = spawnedHex?.minionId != null
                    ? { ...minionImgMap, [spawnedHex.minionId]: getMinionImg(kind.img, playerNum) }
                    : minionImgMap;
                setGameState(state);
                setMinionImgMap(newImgMap);
                if (setupStep === 1) {
                    addLog(`[Setup] P1 spawned "${kind.name}" at (${bRow},${bCol})`);
                    if (mode === 'SOLITAIRE') {
                        setSetupStep(2);
                        persist({ setupStep: 2, setupKindIdx: 0, minionImgMap: newImgMap });
                        setMessage('Bot is placing its minion…');
                        const { state: botState, newImgMap: im2 } = await botSetupSpawn(2, p2Token, gameId, state, newImgMap);
                        // Rebuild imgMap from final state to ensure both players have images
                        const finalImgMap = { ...im2 };
                        botState.grid?.forEach(h => {
                            if (h.hasMinion && h.minionId && !finalImgMap[h.minionId]) {
                                const k = minionKinds[0];
                                if (k) finalImgMap[h.minionId] = getMinionImg(k.img, h.minionOwner);
                            }
                        });
                        setMinionImgMap(finalImgMap);
                        setSetupStep(3);
                        persist({ setupStep: 3, minionImgMap: finalImgMap });
                        setMessage('Both players ready! Click START GAME.');
                    } else {
                        setSetupStep(2);
                        setSetupKindIdx(0);
                        persist({ setupStep: 2, setupKindIdx: 0, minionImgMap: newImgMap });
                        setMessage('SETUP — Player 2: pick a kind from the sidebar, then click a red hex to spawn.');
                    }
                } else {
                    setSetupStep(3);
                    persist({ setupStep: 3, minionImgMap: newImgMap });
                    addLog(`[Setup] P2 spawned "${kind.name}" at (${bRow},${bCol})`);
                    setMessage(isTwoDevice && myPlayer === 2
                        ? 'Both players ready! Waiting for Player 1 to start…'
                        : 'Both players ready! Click START GAME.');
                }
            } catch (e) {
                setMessage('Spawn failed: ' + e.message);
            }
            setLoading(false);
            return;
        }

        // ── PLAYING ──
        if (isTwoDevice && gameState.currentPlayer !== myPlayer) return;
        const isBotTurn = (mode === 'SOLITAIRE' && gameState.currentPlayer !== 1) || mode === 'AUTO';
        if (isBotTurn) return;

        if (turnStep === 'buy') {
            if ((hexData?.territory ?? 0) !== 0) {
                setMessage('Buy Hex: click an unclaimed hex adjacent to your territory.');
                return;
            }
            setConfirmDialog({
                title: 'Buy Hex',
                cost: gameState?.hexPurchaseCost ?? 1000,
                onConfirm: () => doBuyHex(bRow, bCol),
            });
            return;
        }

        if (turnStep === 'spawn') {
            if (selectedKindIdx === null) {
                setMessage('Select a minion kind from the sidebar first.');
                return;
            }
            if ((hexData?.territory ?? 0) !== gameState.currentPlayer) {
                setMessage('Spawn on one of your own territory hexes.');
                return;
            }
            if (hexData?.hasMinion) {
                setMessage('That hex is already occupied!');
                return;
            }
            const kind = minionKinds[selectedKindIdx];
            setConfirmDialog({
                title: `Spawn "${kind.name}"`,
                cost: gameState?.spawnCost ?? 100,
                onConfirm: () => doSpawnMinion(bRow, bCol, kind),
            });
        }
    };

    const doBuyHex = async (bRow, bCol) => {
        setLoading(true);
        try {
            const statePromise = waitForNextState();
            await api.buyHex(gameId, getCurrentToken(), bRow, bCol);
            const state = await statePromise;
            setGameState(state);
            setTurnStep('spawn');
            persist({ turnStep: 'spawn' });
            addLog(`[T${gameState.turnCount + 1}] P${gameState.currentPlayer} bought hex (${bRow},${bCol})`);
            setMessage('Hex bought! Now choose a minion to spawn, or click END TURN.');
        } catch (e) {
            setMessage('Buy hex failed: ' + e.message);
        }
        setLoading(false);
    };

    const doSpawnMinion = async (bRow, bCol, kind) => {
        setLoading(true);
        try {
            const statePromise = waitForNextState();
            await api.spawnMinion(gameId, getCurrentToken(), bRow, bCol, kind.strategy, kind.defense);
            const state = await statePromise;
            const spawnedHex = state.grid?.find(h => h.row === bRow && h.col === bCol);
            const newImgMap = spawnedHex?.minionId != null
                ? { ...minionImgMap, [spawnedHex.minionId]: getMinionImg(kind.img, gameState.currentPlayer) }
                : minionImgMap;
            setGameState(state);
            setMinionImgMap(newImgMap);
            setSelectedKindIdx(null);
            setTurnStep('done');
            persist({ minionImgMap: newImgMap, turnStep: 'done' });
            addLog(`[T${gameState.turnCount + 1}] P${gameState.currentPlayer} spawned "${kind.name}" at (${bRow},${bCol})`);
            setMessage(`Spawned "${kind.name}". Click END TURN to finish your turn.`);
        } catch (e) {
            setMessage('Spawn failed: ' + e.message);
        }
        setLoading(false);
    };

    const handleStartGame = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const statePromise = waitForNextState();
            await api.startGame(gameId, p1Token);
            const state = await statePromise;
            // Rebuild imgMap to cover any minions spawned by handleBotTurn during startTurn
            setMinionImgMap(prev => {
                const updated = { ...prev };
                state.grid?.forEach(h => {
                    if (h.hasMinion && h.minionId && !updated[h.minionId]) {
                        const kind = minionKinds[0];
                        if (kind) updated[h.minionId] = getMinionImg(kind.img, h.minionOwner);
                    }
                });
                return updated;
            });
            setGameState(state);
            setTurnStep('buy');
            persist({ turnStep: 'buy', setupStep: 3 });
            addLog('── Game started ──');
            if (state.actionLog?.length) state.actionLog.forEach(e => addLog(e));
            if (mode === 'AUTO') {
                addLog(`[T1] P${state.currentPlayer}'s turn`);
                lastLoggedTurnRef.current = { player: state.currentPlayer, count: state.turnCount };
                setMessage(`Auto mode: click BOT ACTION for Bot P${state.currentPlayer}.`);
            } else {
                addLog(`[T1] P${state.currentPlayer}'s turn`);
                lastLoggedTurnRef.current = { player: state.currentPlayer, count: state.turnCount };
                setMessage(isTwoDevice && myPlayer !== state.currentPlayer
                    ? `Waiting for Player ${state.currentPlayer}…`
                    : `Game started! Player ${state.currentPlayer} — buy a hex or click END TURN.`);
            }
        } catch (e) {
            setMessage('Start failed: ' + e.message);
        }
        setLoading(false);
    };

    const handleSkipBuy = () => {
        if (isTwoDevice && gameState?.currentPlayer !== myPlayer) return;
        setTurnStep('spawn');
        persist({ turnStep: 'spawn' });
        addLog(`[T${gameState.turnCount + 1}] P${gameState.currentPlayer} skipped buying`);
        setMessage(`Player ${gameState?.currentPlayer} — spawn a minion or click END TURN.`);
    };

    const handleBotMove = async () => {
        if (loading || !gameState || gameState.gameOver) return;
        const actingPlayer = gameState.currentPlayer;
        setLoading(true);
        try {
            const statePromise = waitForNextState();
            await api.botMove(gameId);
            const state = await statePromise;
            setGameState(state);
            setTurnStep('buy');
            setSelectedKindIdx(null);
            persist({ turnStep: 'buy' });
            addLog(`── Bot ${actingPlayer} acting ──`);

            // Assign images to newly spawned bot minions
            const newImgMap = { ...minionImgMap };
            if (state.actionLog?.length) {
                for (const entry of state.actionLog) {
                    const m = entry.match(/^Bot \d+ spawned (.+) at \((\d+),(\d+)\)/);
                    if (m) {
                        const [, kindName, rowStr, colStr] = m;
                        const row = parseInt(rowStr), col = parseInt(colStr);
                        const hex = state.grid?.find(h => h.row === row && h.col === col);
                        if (hex?.minionId != null) {
                            const kind = minionKinds.find(k => k.name === kindName) ?? minionKinds[0];
                            if (kind) newImgMap[hex.minionId] = getMinionImg(kind.img, hex.minionOwner);
                        }
                    }
                }
                state.actionLog.forEach(e => addLog(e));
            }
            // Fallback: assign image to any minion on the grid that still has no entry
            state.grid?.forEach(h => {
                if (h.hasMinion && h.minionId != null && !newImgMap[h.minionId]) {
                    const kind = minionKinds[Math.floor(Math.random() * minionKinds.length)];
                    if (kind) newImgMap[h.minionId] = getMinionImg(kind.img, h.minionOwner);
                }
            });
            setMinionImgMap(newImgMap);
            persist({ minionImgMap: newImgMap });

            if (state.gameOver) {
                const result = state.winner === 0 ? 'Tie!' : `P${state.winner} wins!`;
                addLog(`── Game over — ${result} ──`);
                navigate('/endgame', { state: { winner: state.winner, mode } });
            } else {
                addLog(`[T${state.turnCount + 1}] P${state.currentPlayer}'s turn`);
                lastLoggedTurnRef.current = { player: state.currentPlayer, count: state.turnCount };
                setMessage(`Bot P${actingPlayer} done. Click BOT ACTION for Bot P${state.currentPlayer}.`);
            }
        } catch (e) {
            setMessage('Bot move failed: ' + e.message);
        }
        setLoading(false);
    };

    const handleEndTurn = async () => {
        if (loading || !gameState || gameState.gameOver) return;
        if (isTwoDevice && gameState.currentPlayer !== myPlayer) return;
        setLoading(true);
        try {
            const prevPlayer = gameState.currentPlayer;
            const prevTurn   = gameState.turnCount + 1;
            if (turnStep === 'buy')   addLog(`[T${prevTurn}] P${prevPlayer} passed buy & spawn`);
            else if (turnStep === 'spawn') addLog(`[T${prevTurn}] P${prevPlayer} passed spawn`);
            addLog(`── P${prevPlayer} strategies ──`);
            const statePromise = waitForNextState();
            await api.endTurn(gameId, getCurrentToken());
            const state = await statePromise;
            if (state.actionLog?.length) state.actionLog.forEach(e => addLog(e));
            setGameState(state);
            setMinionImgMap(prev => {
                const updated = { ...prev };
                let changed = false;
                state.grid?.forEach(h => {
                    if (h.hasMinion && h.minionId != null && !updated[h.minionId]) {
                        const kind = minionKinds[Math.floor(Math.random() * minionKinds.length)];
                        if (kind) { updated[h.minionId] = getMinionImg(kind.img, h.minionOwner); changed = true; }
                    }
                });
                return changed ? updated : prev;
            });
            setTurnStep('buy');
            setSelectedKindIdx(null);
            persist({ turnStep: 'buy' });
            if (state.gameOver) {
                const result = state.winner === 0 ? 'Tie!' : `P${state.winner} wins!`;
                addLog(`── Game over — ${result} ──`);
                navigate('/endgame', { state: { winner: state.winner, mode } });
            } else {
                addLog(`[T${state.turnCount + 1}] P${state.currentPlayer}'s turn`);
                lastLoggedTurnRef.current = { player: state.currentPlayer, count: state.turnCount };
                const isNextBot = (mode === 'SOLITAIRE' && state.currentPlayer !== 1) || mode === 'AUTO';
                setMessage(isTwoDevice && state.currentPlayer !== myPlayer
                    ? `Waiting for Player ${state.currentPlayer}…`
                    : isNextBot
                        ? `Bot P${state.currentPlayer}'s turn — click BOT ACTION.`
                        : `Player ${state.currentPlayer}'s turn — buy a hex or click END TURN.`);
            }
        } catch (e) {
            setMessage('End turn failed: ' + e.message);
        }
        setLoading(false);
    };

    const handleKindClick = (idx) => {
        if (!gameState || loading || gameState.gameOver) return;

        if (gameState.phase === 'SETUP') {
            setSetupKindIdx(idx);
            persist({ setupKindIdx: idx });
            return;
        }

        if (!isPlaying) return;
        if (turnStep === 'done') {
            setMessage('You already spawned this turn. Click END TURN.');
            return;
        }
        if (turnStep !== 'spawn') {
            setMessage('Decide whether to buy a hex first, then you can spawn.');
            return;
        }
        setSelectedKindIdx(prev => prev === idx ? null : idx);
    };

    // ── Hex grid rendering ────────────────────────────────────────────────────

    const isPlaying  = gameState?.phase === 'PLAYING';
    const isP1Active = isPlaying && gameState?.currentPlayer === 1;
    const isP2Active = isPlaying && gameState?.currentPlayer === 2;
    const isP1Turn   = isP1Active;
    const isP2Turn   = isP2Active;

    // 2-device DUEL: each device was given only its own token from the lobby
    const myPlayer = (p1Token && !p2Token) ? 1 : (!p1Token && p2Token) ? 2 : null;
    const isTwoDevice = myPlayer !== null;
    const isMyTurn = !isTwoDevice || gameState?.currentPlayer === myPlayer;

    // Used to determine which device can spawn during setup
    const p1HasMinion = gameState?.grid?.some(h => h.minionOwner === 1) ?? false;
    const p2HasMinion = gameState?.grid?.some(h => h.minionOwner === 2) ?? false;
    const canSpawnInSetup = !isTwoDevice
        ? setupStep <= 2
        : myPlayer === 1 ? !p1HasMinion : !p2HasMinion;

    const hexElems = [];
    for (let fCol = 0; fCol < COLS; fCol++) {
        for (let fRow = 0; fRow < ROWS; fRow++) {
            let x = fCol * COL_SPACING;
            let y = fRow * HEX_H;
            if (fCol % 2 !== 1) y += HEX_H / 2;

            const key = `${fCol}-${fRow}`;
            const hexData = hexMap[key];

            let zoneClass = '';
            if (hexData?.territory === 1) zoneClass = 'p1-zone';
            else if (hexData?.territory === 2) zoneClass = 'p2-zone';

            // Highlight unclaimed hexes adjacent to the current player's territory during buy step
            let buyableClass = '';
            if (mode !== 'AUTO' && isPlaying && isMyTurn && turnStep === 'buy' && !loading && !gameState.gameOver
                    && hexData?.territory === 0) {
                const adj = getHexNeighbors(fCol, fRow).some(
                    ([nc, nr]) => hexMap[`${nc}-${nr}`]?.territory === gameState.currentPlayer
                );
                if (adj) buyableClass = gameState.currentPlayer === 1 ? 'buyable-p1' : 'buyable-p2';
            }

            const isClickable =
                !loading && gameState && !gameState.gameOver && (
                    (gameState.phase === 'SETUP' && canSpawnInSetup) ||
                    (mode !== 'AUTO' && isPlaying && isMyTurn && turnStep === 'buy') ||
                    (mode !== 'AUTO' && isPlaying && isMyTurn && turnStep === 'spawn' && selectedKindIdx !== null)
                );

            const minionImg = hexData?.minionId ? minionImgMap[hexData.minionId] : undefined;

            hexElems.push(
                <div
                    key={key}
                    className={`hex ${zoneClass} ${buyableClass} ${isClickable ? 'hex-interactive' : ''}`}
                    style={{ width: `${HEX_W}px`, height: `${HEX_H}px`, left: `${x}px`, top: `${y}px` }}
                    onClick={() => handleHexClick(fCol, fRow)}
                >
                    <div className="hex-inner">
                        {hexData?.hasMinion && (
                            minionImg
                                ? <>
                                    <div className="placed-character" style={{ backgroundImage: `url(${minionImg})` }} />
                                    <div className="minion-hp-overlay">
                                        <span className="minion-hp">{hexData.minionHp}</span>
                                    </div>
                                  </>
                                : <div className={`minion-marker p${hexData.minionOwner}-minion`}>
                                    <span className="minion-hp">{hexData.minionHp}</span>
                                  </div>
                        )}
                    </div>
                </div>
            );
        }
    }

    const boardW = (COLS - 1) * COL_SPACING + HEX_W;
    const boardH = (ROWS - 1) * HEX_H + HEX_H + HEX_H / 2;

    const p1 = gameState?.player1;
    const p2 = gameState?.player2;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="game-container">

            {/* ── Purchase Confirmation Dialog ── */}
            {confirmDialog && (
                <div className="confirm-overlay">
                    <div className={`confirm-dialog confirm-p${gameState?.currentPlayer ?? 1}`}>
                        <div className="confirm-title">{confirmDialog.title}</div>
                        <div className="confirm-cost">Cost: {confirmDialog.cost}</div>
                        <div className="confirm-buttons">
                            <button className="confirm-btn confirm-yes" onClick={() => {
                                setConfirmDialog(null);
                                confirmDialog.onConfirm();
                            }}>Confirm</button>
                            <button className="confirm-btn confirm-no" onClick={() => setConfirmDialog(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Top Bar ── */}
            <header className="top-bar">
                <PlayerPanel num={1} data={p1} isActive={isP1Active} mode={mode} />

                <div className="center-controls">
                    {/* Game Over */}
                    {gameState?.gameOver && (
                        <div className="phase-panel">
                            <div className="game-over-text">
                                {gameState.winner === 0 ? "It's a Tie!" : `Player ${gameState.winner} Wins!`}
                            </div>
                            <button className="end-turn-btn" onClick={() => startFreshGame(minionKinds)} disabled={loading}>
                                NEW GAME
                            </button>
                        </div>
                    )}

                    {/* Setup Phase */}
                    {!gameState?.gameOver && gameState?.phase === 'SETUP' && (
                        <div className="phase-panel">
                            <div className={`turn-info turn-info-p${setupStep <= 2 ? (isTwoDevice ? myPlayer : setupStep) : ''}`}>
                                {setupStep <= 2
                                    ? `Setup — Player ${isTwoDevice ? myPlayer : setupStep}: pick a kind, then click your territory hex`
                                    : 'Setup complete!'}
                            </div>
                            {setupStep === 3 && (!isTwoDevice || myPlayer === 1) && (
                                <button className="end-turn-btn" onClick={handleStartGame} disabled={loading}>
                                    START GAME
                                </button>
                            )}
                            {setupStep === 3 && isTwoDevice && myPlayer === 2 && (
                                <div className="turn-step-badge">Waiting for Player 1 to start…</div>
                            )}
                        </div>
                    )}

                    {/* Playing Phase */}
                    {!gameState?.gameOver && isPlaying && (
                        <div className="phase-panel">
                            <div className={`turn-info turn-info-p${gameState.currentPlayer}`}>
                                Turn {gameState.turnCount + 1}{gameState.maxTurns ? `/${gameState.maxTurns}` : ''} — {(mode === 'AUTO' || (mode === 'SOLITAIRE' && !isP1Active)) ? `Bot P${gameState.currentPlayer}` : `Player ${gameState.currentPlayer}`}
                                {mode !== 'AUTO' && (
                                    <span className="turn-step-badge">
                                        {turnStep === 'buy' ? ' · Buy Hex?' : turnStep === 'spawn' ? ' · Spawn?' : ' · Done'}
                                    </span>
                                )}
                            </div>
                            <div className="action-buttons">
                                {isTwoDevice && !isMyTurn ? (
                                    <div className="turn-step-badge">
                                        Waiting for Player {gameState.currentPlayer}…
                                    </div>
                                ) : (
                                    <>
                                        {turnStep === 'buy' && (mode === 'DUEL' || (mode === 'SOLITAIRE' && isP1Active)) && (
                                            <button className="action-btn" onClick={handleSkipBuy} disabled={loading}>
                                                Skip Buy
                                            </button>
                                        )}
                                        {turnStep === 'spawn' && mode !== 'AUTO' && selectedKindIdx !== null && (
                                            <button className="action-btn" onClick={() => setSelectedKindIdx(null)} disabled={loading}>
                                                Cancel
                                            </button>
                                        )}
                                        {((mode === 'SOLITAIRE' && !isP1Active) || mode === 'AUTO') ? (
                                            <button className="end-turn-btn" onClick={handleBotMove} disabled={loading}>
                                                BOT ACTION
                                            </button>
                                        ) : (
                                            <button className="end-turn-btn" onClick={handleEndTurn} disabled={loading}>
                                                END TURN
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Status message */}
                    <div className={`message-bar ${loading ? 'msg-loading' : ''}`}>
                        {loading ? '⏳ ' + message : message}
                    </div>
                </div>

                <PlayerPanel num={2} data={p2} isActive={isP2Active} mode={mode} />
            </header>

            {/* ── Turn Log (fixed left) ── */}
            <div className="turn-log gold-frame">
                <div className="turn-log-title">Turn Log</div>
                <div className="turn-log-entries">
                    {turnLog.map((entry, i) => (
                        <div key={i} className={`log-entry ${entry.startsWith('──') ? 'log-divider' : ''}`}>
                            {entry}
                        </div>
                    ))}
                    <div ref={logEndRef} />
                </div>
            </div>

            {/* ── Main Area ── */}
            <main className="main-area">

                {/* P1 Character Sidebar */}
                <div className={`character-sidebar gold-frame ${mode !== 'AUTO' && (isP1Active || (gameState?.phase === 'SETUP' && setupStep === 1)) ? 'active-p1' : ''}`}>
                    {minionKinds.map((kind, idx) => {
                        const isSetupP1 = gameState?.phase === 'SETUP' && setupStep === 1;
                        const isSpawnActive = mode !== 'AUTO' && isP1Turn && turnStep === 'spawn';
                        const canClick = isSetupP1 || isSpawnActive;
                        const isSelected = isSetupP1
                            ? setupKindIdx === idx
                            : (isSpawnActive && selectedKindIdx === idx);
                        return (
                            <div
                                key={idx}
                                className={`char-slot p1-slot ${isSelected ? 'selected' : ''} ${canClick ? '' : 'slot-locked'}`}
                                onClick={() => canClick && handleKindClick(idx)}
                                title={`${kind.name} — DEF ${kind.defense}`}
                            >
                                <img src={kind.img} alt={kind.name} />
                            </div>
                        );
                    })}
                </div>

                {/* Board */}
                <div className="board-container gold-frame" style={{ zoom: boardScale }}>
                    <div className="hex-grid" style={{ width: `${boardW}px`, height: `${boardH}px` }}>
                        {hexElems}
                    </div>
                </div>

                {/* P2 Character Sidebar */}
                <div className={`character-sidebar gold-frame ${mode !== 'AUTO' && (isP2Active || (gameState?.phase === 'SETUP' && setupStep === 2)) ? 'active-p2' : ''}`}>
                    {minionKinds.map((kind, idx) => {
                        const isSetupP2 = gameState?.phase === 'SETUP' && setupStep === 2;
                        const isSpawnActive = mode === 'DUEL' && isP2Turn && turnStep === 'spawn';
                        const canClick = isSetupP2 || isSpawnActive;
                        const isSelected = isSetupP2
                            ? setupKindIdx === idx
                            : (isSpawnActive && selectedKindIdx === idx);
                        return (
                            <div
                                key={idx}
                                className={`char-slot p2-slot ${isSelected ? 'selected' : ''} ${canClick ? '' : 'slot-locked'}`}
                                onClick={() => canClick && handleKindClick(idx)}
                                title={`${kind.name} — DEF ${kind.defense}`}
                            >
                                <img src={kind.img} alt={kind.name} />
                            </div>
                        );
                    })}
                </div>

            </main>

        </div>
    );
}
