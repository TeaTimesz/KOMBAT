import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as api from '../api/gameApi';
import '../css/hexgrid.css';

const ROWS = 8, COLS = 8, R = 40;
const HEX_W = 2 * R;
const HEX_H = Math.sqrt(3) * R;
const COL_SPACING = 1.5 * R;

const DEFAULT_KINDS = [
    { id: 1, img: '/images/minion1.png', name: 'Warrior', defense: 10, strategy: 'done' },
];

const STORAGE_KEY = 'kombat_session';

function saveSession(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
}
function loadSession() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (_) { return null; }
}
function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
}

const toBackend = (fCol, fRow) => ({ row: fRow + 1, col: fCol + 1 });
const toKey     = (bRow, bCol) => `${bCol - 1}-${bRow - 1}`;

// ─── Player Stats Panel ────────────────────────────────────────────────────────

function PlayerPanel({ num, data, isActive }) {
    return (
        <div className={`player-stats ${num === 1 ? 'p1-stats' : 'p2-stats'} ${isActive ? 'active-turn' : ''}`}>
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

    const [minionKinds, setMinionKinds] = useState(DEFAULT_KINDS);
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
    const logEndRef = useRef(null);

    const addLog = (text) => setTurnLog(prev => [...prev, text]);

    useEffect(() => {
        if (turnLog.length > 0) persist({ turnLog });
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [turnLog]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Persist helpers ───────────────────────────────────────────────────────

    const persist = (patch) => {
        const current = loadSession() ?? {};
        saveSession({ ...current, ...patch });
    };

    // ── Init ──────────────────────────────────────────────────────────────────

    const startFreshGame = async (kinds) => {
        setLoading(true);
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
            const created = await api.createGame('DUEL');
            const gId = created.gameId;
            const t1  = created.p1Token;
            const joined = await api.joinGame(gId);
            const t2 = joined.p2Token;

            setGameId(gId);
            setP1Token(t1);
            setP2Token(t2);
            setGameState(joined.state);
            saveSession({ gameId: gId, p1Token: t1, p2Token: t2, minionKinds: kinds,
                          setupStep: 1, setupKindIdx: 0, turnStep: 'buy', minionImgMap: {} });
            addLog(`Game ID: ${gId}`);
            setMessage('SETUP — Player 1: pick a kind from the sidebar, then click a blue hex to spawn.');
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
            setGameId(saved.gameId);
            setP1Token(saved.p1Token);
            setP2Token(saved.p2Token);
            setMinionKinds(saved.minionKinds ?? DEFAULT_KINDS);
            setSetupStep(saved.setupStep ?? 1);
            setSetupKindIdx(saved.setupKindIdx ?? 0);
            setTurnStep(saved.turnStep ?? 'buy');
            setMinionImgMap(saved.minionImgMap ?? {});
            setTurnLog(saved.turnLog?.length ? saved.turnLog : ['── Session restored ──']);
            setGameState(state);
            setMessage('Game restored! Continue where you left off.');
        } catch (e) {
            // Backend was restarted — session is gone, start fresh
            clearSession();
            await startFreshGame(saved.minionKinds ?? DEFAULT_KINDS);
        }
        setLoading(false);
    };

    useEffect(() => {
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
            startFreshGame(navKinds);
        } else {
            const saved = loadSession();
            if (saved?.gameId) {
                restoreGame(saved);
            } else {
                startFreshGame(DEFAULT_KINDS);
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
                const state = await api.spawnFree(gameId, token, bRow, bCol, kind.strategy, kind.defense);
                const spawnedHex = state.grid?.find(h => h.row === bRow && h.col === bCol);
                const newImgMap = spawnedHex?.minionId
                    ? { ...minionImgMap, [spawnedHex.minionId]: kind.img }
                    : minionImgMap;
                setGameState(state);
                setMinionImgMap(newImgMap);
                if (setupStep === 1) {
                    setSetupStep(2);
                    setSetupKindIdx(0);
                    persist({ setupStep: 2, setupKindIdx: 0, minionImgMap: newImgMap });
                    addLog(`[Setup] P1 spawned "${kind.name}" at (${bRow},${bCol})`);
                    setMessage('SETUP — Player 2: pick a kind from the sidebar, then click a red hex to spawn.');
                } else {
                    setSetupStep(3);
                    persist({ setupStep: 3, minionImgMap: newImgMap });
                    addLog(`[Setup] P2 spawned "${kind.name}" at (${bRow},${bCol})`);
                    setMessage('Both players ready! Click START GAME.');
                }
            } catch (e) {
                setMessage('Spawn failed: ' + e.message);
            }
            setLoading(false);
            return;
        }

        // ── PLAYING ──
        if (turnStep === 'buy') {
            if ((hexData?.territory ?? 0) !== 0) {
                setMessage('Buy Hex: click an unclaimed hex adjacent to your territory.');
                return;
            }
            setLoading(true);
            try {
                const state = await api.buyHex(gameId, getCurrentToken(), bRow, bCol);
                setGameState(state);
                setTurnStep('spawn');
                persist({ turnStep: 'spawn' });
                addLog(`[T${gameState.turnCount + 1}] P${gameState.currentPlayer} bought hex (${bRow},${bCol})`);
                setMessage('Hex bought! Now choose a minion to spawn, or click END TURN.');
            } catch (e) {
                setMessage('Buy hex failed: ' + e.message);
            }
            setLoading(false);

        } else if (turnStep === 'spawn') {
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
            setLoading(true);
            try {
                const state = await api.spawnMinion(
                    gameId, getCurrentToken(), bRow, bCol, kind.strategy, kind.defense
                );
                const spawnedHex = state.grid?.find(h => h.row === bRow && h.col === bCol);
                const newImgMap = spawnedHex?.minionId
                    ? { ...minionImgMap, [spawnedHex.minionId]: kind.img }
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
        }
    };

    const handleStartGame = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const state = await api.startGame(gameId, p1Token);
            setGameState(state);
            setTurnStep('buy');
            persist({ turnStep: 'buy', setupStep: 3 });
            addLog('── Game started ──');
            addLog("[T1] P1's turn");
            setMessage("Game started! Player 1 — buy a hex or click END TURN.");
        } catch (e) {
            setMessage('Start failed: ' + e.message);
        }
        setLoading(false);
    };

    const handleSkipBuy = () => {
        setTurnStep('spawn');
        persist({ turnStep: 'spawn' });
        addLog(`[T${gameState.turnCount + 1}] P${gameState.currentPlayer} skipped buying`);
        setMessage(`Player ${gameState?.currentPlayer} — spawn a minion or click END TURN.`);
    };

    const handleEndTurn = async () => {
        if (loading || !gameState || gameState.gameOver) return;
        setLoading(true);
        try {
            const prevPlayer = gameState.currentPlayer;
            const prevTurn   = gameState.turnCount + 1;
            if (turnStep === 'buy')   addLog(`[T${prevTurn}] P${prevPlayer} passed buy & spawn`);
            else if (turnStep === 'spawn') addLog(`[T${prevTurn}] P${prevPlayer} passed spawn`);
            addLog(`── P${prevPlayer} strategies ──`);
            const state = await api.endTurn(gameId, getCurrentToken());
            if (state.actionLog?.length) state.actionLog.forEach(e => addLog(e));
            setGameState(state);
            setTurnStep('buy');
            setSelectedKindIdx(null);
            persist({ turnStep: 'buy' });
            if (state.gameOver) {
                const result = state.winner === 0 ? 'Tie!' : `P${state.winner} wins!`;
                addLog(`── Game over — ${result} ──`);
                navigate('/endgame', { state: { winner: state.winner } });
            } else {
                addLog(`[T${state.turnCount + 1}] P${state.currentPlayer}'s turn`);
                setMessage(`Player ${state.currentPlayer}'s turn — buy a hex or click END TURN.`);
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

            const isClickable =
                !loading && gameState && !gameState.gameOver && (
                    gameState.phase === 'SETUP' ||
                    (isPlaying && turnStep === 'buy') ||
                    (isPlaying && turnStep === 'spawn' && selectedKindIdx !== null)
                );

            const minionImg = hexData?.minionId ? minionImgMap[hexData.minionId] : undefined;

            hexElems.push(
                <div
                    key={key}
                    className={`hex ${zoneClass} ${isClickable ? 'hex-interactive' : ''}`}
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

            {/* ── Top Bar ── */}
            <header className="top-bar">
                <PlayerPanel num={1} data={p1} isActive={isP1Active} />

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
                            <div className="turn-info">
                                {setupStep <= 2
                                    ? `Setup — Player ${setupStep}: pick a kind from the sidebar, then click your territory hex`
                                    : 'Setup complete!'}
                            </div>
                            {setupStep === 3 && (
                                <button className="end-turn-btn" onClick={handleStartGame} disabled={loading}>
                                    START GAME
                                </button>
                            )}
                        </div>
                    )}

                    {/* Playing Phase */}
                    {!gameState?.gameOver && isPlaying && (
                        <div className="phase-panel">
                            <div className="turn-info">
                                Turn {gameState.turnCount + 1} — Player {gameState.currentPlayer}
                                <span className="turn-step-badge">
                                    {turnStep === 'buy' ? ' · Buy Hex?' : turnStep === 'spawn' ? ' · Spawn?' : ' · Done'}
                                </span>
                            </div>
                            <div className="action-buttons">
                                {turnStep === 'buy' && (
                                    <button className="action-btn" onClick={handleSkipBuy} disabled={loading}>
                                        Skip Buy
                                    </button>
                                )}
                                {turnStep === 'spawn' && selectedKindIdx !== null && (
                                    <button className="action-btn" onClick={() => setSelectedKindIdx(null)} disabled={loading}>
                                        Cancel
                                    </button>
                                )}
                                <button className="end-turn-btn" onClick={handleEndTurn} disabled={loading}>
                                    END TURN
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Status message */}
                    <div className={`message-bar ${loading ? 'msg-loading' : ''}`}>
                        {loading ? '⏳ ' + message : message}
                    </div>
                </div>

                <PlayerPanel num={2} data={p2} isActive={isP2Active} />
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
                <div className="character-sidebar gold-frame">
                    {minionKinds.map((kind, idx) => {
                        const isSetupP1 = gameState?.phase === 'SETUP' && setupStep === 1;
                        const isSpawnActive = isP1Turn && turnStep === 'spawn';
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
                <div className="board-container gold-frame">
                    <div className="hex-grid" style={{ width: `${boardW}px`, height: `${boardH}px` }}>
                        {hexElems}
                    </div>
                </div>

                {/* P2 Character Sidebar */}
                <div className="character-sidebar gold-frame">
                    {minionKinds.map((kind, idx) => {
                        const isSetupP2 = gameState?.phase === 'SETUP' && setupStep === 2;
                        const isSpawnActive = isP2Turn && turnStep === 'spawn';
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
