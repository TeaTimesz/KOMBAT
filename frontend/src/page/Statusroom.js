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
    // Sends lobbySync every 2 s. The SYNC handler already handles gameId recovery
    // so P2 will navigate to HexGrid if GAME_READY was missed.
    useEffect(() => {
        if (!lobbyId || !role) return;

        const interval = setInterval(() => {
            lobbySync(lobbyId, role).catch(() => {});
        }, 2000);
        return () => clearInterval(interval);
    }, [lobbyId, role]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Actions ───────────────────────────────────────────────────────────────
    const handleReady = () => setReady(lobbyId, role);

    const handleStart = () => {
        lobbyStartSetup(lobbyId, role);
        navigate('/select-amount', { state: { mode: 'DUEL' } });
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="status-screen" style={{ backgroundImage: "url('/images/lobby.png')" }}>

            {/* Room code banner */}
            <div className="room-code-banner" style={{ backgroundImage: "url('/images/RoomCode.png')" }}>
                <span className="banner-text">{lobbyId}</span>
            </div>

            {error && (
                <div style={{ color: 'red', textAlign: 'center', marginTop: 16, fontWeight: 'bold' }}>
                    {error}
                </div>
            )}

            {phase === 'SETUP' && !isHost && (
                <div style={{ color: '#fff', textAlign: 'center', marginTop: 24, fontSize: 20 }}>
                    Host is creating minions… Please wait.
                </div>
            )}

            {phase !== 'SETUP' && (
                <div className="status-panel" style={{ backgroundImage: "url('/images/2room.png')" }}>
                    {/* Host section */}
                    <div className="player-section p1">
                        <div className="name-tag" style={{ backgroundImage: "url('/images/player1.png')" }} />
                        <button
                            className={`ready-btn ${status.hostReady ? 'is-ready' : ''}`}
                            style={{ backgroundImage: `url(${status.hostReady ? '/images/ready.png' : '/images/notready.png'})` }}
                            onClick={isHost ? handleReady : undefined}
                            disabled={!isHost}
                        />
                    </div>

                    {/* Guest section */}
                    <div className="player-section p2">
                        <div className="name-tag" style={{ backgroundImage: "url('/images/player2.png')" }} />
                        {status.hasGuest ? (
                            <button
                                className={`ready-btn ${status.guestReady ? 'is-ready' : ''}`}
                                style={{ backgroundImage: `url(${status.guestReady ? '/images/ready.png' : '/images/notready.png'})` }}
                                onClick={!isHost ? handleReady : undefined}
                                disabled={isHost}
                            />
                        ) : (
                            <p style={{ color: '#fff', marginTop: 16 }}>Waiting for Player 2…</p>
                        )}
                    </div>
                </div>
            )}

            {/* Host: START button when both ready */}
            {isHost && status.bothReady && phase === 'READY' && (
                <div className="start-container">
                    <button className="btn-start" onClick={handleStart}>
                        <img src="/images/start.png" alt="START" />
                    </button>
                </div>
            )}

            {/* Guest: waiting message when both ready */}
            {!isHost && status.bothReady && phase === 'READY' && (
                <div style={{ color: '#fff', textAlign: 'center', marginTop: 16, fontSize: 18 }}>
                    Both ready! Waiting for host to start…
                </div>
            )}

            {/* New Game button (shown after a finished game returns here) */}
            {phase === 'LOBBY' && (
                <div style={{ textAlign: 'center', marginTop: 24, color: '#fff', fontSize: 18 }}>
                    {isHost
                        ? `Waiting for Player 2 to join with code: ${lobbyId}`
                        : 'Connected. Click Ready when you are prepared.'}
                </div>
            )}
        </div>
    );
}

export default Statusroom;
