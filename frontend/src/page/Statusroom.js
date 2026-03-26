import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    subscribeToLobbyStatus,
    lobbySync,
    setReady,
    lobbyStartSetup,
    saveLobbyInfo,
    loadLobbyInfo,
    clearLobbyInfo,
} from '../api/gameWsApi';
import '../css/status-room.css';

function Statusroom() {
    const location = useLocation();
    const navigate  = useNavigate();

    // Prefer navigation state, fall back to localStorage (e.g. after game ends)
    const stored  = loadLobbyInfo();
    const lobbyId = location.state?.lobbyId || stored?.lobbyId || '';
    const [role, setRole] = useState(location.state?.role || stored?.role || 'guest');

    const [status, setStatus] = useState({
        hasGuest: false, hostReady: false, guestReady: false, bothReady: false,
    });
    // phase: 'LOBBY' | 'READY' | 'SETUP' | 'DONE'
    const [phase, setPhase] = useState('LOBBY');
    const [error, setError] = useState('');

    const unsubRef = useRef(null);
    const isHost   = role === 'host';

    // ── Subscribe + sync on mount ─────────────────────────────────────────────
    useEffect(() => {
        if (!lobbyId) { setError('No lobby ID found.'); return; }

        // Persist lobby info in case of refresh
        saveLobbyInfo({ lobbyId, role });

        let cancelled = false;

        subscribeToLobbyStatus(lobbyId, (msg) => {
            if (cancelled) return;

            switch (msg.event) {
                case 'PLAYER_JOINED':
                case 'PLAYER_LEFT':
                case 'READY_CHANGED':
                case 'SYNC':
                case 'RESET':
                    // Recovery: if game was already created (e.g. after reconnect), navigate directly
                    if (msg.gameId) {
                        navigate('/hexgrid', {
                            state: {
                                gameId:      msg.gameId,
                                p1Token:     isHost ? msg.p1Token : null,
                                p2Token:     isHost ? null : msg.p2Token,
                                minionKinds: msg.kinds,
                                mode:        'DUEL',
                            },
                        });
                        break;
                    }
                    setStatus({
                        hasGuest:  msg.hasGuest,
                        hostReady: msg.hostReady,
                        guestReady: msg.guestReady,
                        bothReady: msg.bothReady,
                    });
                    if (msg.event === 'RESET') setPhase('READY');
                    else if (msg.event === 'PLAYER_JOINED') setPhase('READY');
                    // On SYNC: if the room already has both players, ensure we're in READY phase.
                    // This handles the case where Statusroom mounts after PLAYER_JOINED was missed.
                    else if (msg.event === 'SYNC' && msg.hasGuest) setPhase(p => p === 'LOBBY' ? 'READY' : p);
                    break;

                case 'HOST_CHANGED':
                    setRole('host');
                    saveLobbyInfo({ lobbyId, role: 'host' });
                    setStatus({
                        hasGuest:  msg.hasGuest,
                        hostReady: msg.hostReady,
                        guestReady: msg.guestReady,
                        bothReady: msg.bothReady,
                    });
                    setPhase(p => p === 'SETUP' ? 'READY' : p); // reset if setup was running
                    break;

                case 'SETUP_STARTING':
                    setPhase('SETUP');
                    break;

                case 'GAME_READY':
                    setPhase('DONE');
                    navigate('/hexgrid', {
                        state: {
                            gameId:      msg.gameId,
                            p1Token:     isHost ? msg.p1Token : null,
                            p2Token:     isHost ? null : msg.p2Token,
                            minionKinds: msg.kinds,
                            mode:        'DUEL',
                        },
                    });
                    break;

                case 'LOBBY_CLOSED':
                    clearLobbyInfo();
                    setError('The host closed the lobby.');
                    break;

                case 'ERROR':
                    setError(msg.message || 'An error occurred.');
                    break;

                default:
                    break;
            }
        }).then(unsub => {
            if (cancelled) { unsub(); return; }
            unsubRef.current = unsub;
            // Request current state (also re-registers WS session on reconnect)
            lobbySync(lobbyId, role);
        }).catch(() => setError('Could not connect to server.'));

        return () => {
            cancelled = true;
            unsubRef.current?.();
        };
    }, [lobbyId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── WS polling — periodic sync to catch missed broadcasts ────────────────
    useEffect(() => {
        if (!lobbyId || !role) return;
        const interval = setInterval(() => {
            lobbySync(lobbyId, role).catch(() => {});
        }, 2000);
        return () => clearInterval(interval);
    }, [lobbyId, role]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Derived ready state ───────────────────────────────────────────────────
    const isReadyP1 = status.hostReady;
    const isReadyP2 = status.guestReady;

    // ── Actions ───────────────────────────────────────────────────────────────
    const handleReady = () => setReady(lobbyId, role);
    const handleReadyClick = () => handleReady();

    const handleStart = () => {
        lobbyStartSetup(lobbyId, role);
        navigate('/select-amount', { state: { mode: 'DUEL' } });
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="status-screen" style={{ backgroundImage: "url('/images/lobby.png')" }}>
            {error && (
                <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
                              background: 'rgba(180,0,0,0.85)', color: '#fff', padding: '10px 24px',
                              borderRadius: 8, zIndex: 100, fontSize: 16 }}>
                    {error}
                </div>
            )}

            {/* Room code banner */}
            <div className="room-code-banner" style={{ backgroundImage: "url('/images/RoomCode.png')" }}>
                <span className="banner-text">{lobbyId}</span>
            </div>

            {phase === 'SETUP' ? (
                /* Guest waiting screen while host creates minion kinds */
                <div style={{ textAlign: 'center', color: '#fff', fontSize: 20, marginTop: 40 }}>
                    <div style={{ fontSize: 28, marginBottom: 16 }}>⚔️</div>
                    Waiting for host to create minion kinds…
                </div>
            ) : (
                <>
                    <div className="status-panel" style={{ backgroundImage: "url('/images/2room.png')" }}>
                        {/* Player 1 Section */}
                        <div className="player-section p1">
                            <div className="name-tag" style={{ backgroundImage: "url('/images/player1.png')" }}></div>
                            <button
                                className={`ready-btn ${isReadyP1 ? 'is-ready' : ''}`}
                                onClick={isHost ? handleReadyClick : undefined}
                                disabled={!isHost}
                                style={{ backgroundImage: `url(${isReadyP1 ? '/images/ready.png' : '/images/notready.png'})`, cursor: isHost ? 'pointer' : 'default' }}
                            >
                            </button>
                        </div>

                        {/* Player 2 Section */}
                        <div className="player-section p2">
                            <div className="name-tag" style={{ backgroundImage: "url('/images/player2.png')" }}></div>
                            <button
                                className={`ready-btn ${isReadyP2 ? 'is-ready' : ''}`}
                                onClick={!isHost ? handleReadyClick : undefined}
                                disabled={isHost}
                                style={{ backgroundImage: `url(${isReadyP2 ? '/images/ready.png' : '/images/notready.png'})`, cursor: !isHost ? 'pointer' : 'default' }}
                            >
                            </button>
                        </div>
                    </div>

                    {/* Start button — host only, both ready */}
                    {isHost && isReadyP1 && isReadyP2 && (
                        <div className="start-container">
                            <button className="btn-start" onClick={handleStart}>
                                <img src="/images/start.png" alt="START" />
                            </button>
                        </div>
                    )}

                    {/* Guest: waiting messages */}
                    {!isHost && status.bothReady && phase === 'READY' && (
                        <div style={{ color: '#fff', textAlign: 'center', marginTop: 16, fontSize: 18 }}>
                            Both ready! Waiting for host to start…
                        </div>
                    )}

                    {phase === 'LOBBY' && (
                        <div style={{ textAlign: 'center', marginTop: 24, color: '#fff', fontSize: 18 }}>
                            {isHost
                                ? `Waiting for Player 2 to join with code: ${lobbyId}`
                                : 'Connected. Click Ready when you are prepared.'}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default Statusroom;
