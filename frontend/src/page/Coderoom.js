import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createLobby, saveLobbyInfo } from '../api/gameWsApi';
import '../css/code-room.css';

function Coderoom() {
    const navigate = useNavigate();

    const [roomCode, setRoomCode] = useState('');
    const [status,   setStatus]   = useState('Creating room…');
    const [error,    setError]    = useState('');

    useEffect(() => {
        let cancelled = false;
        createLobby()
            .then((lobbyId) => {
                if (cancelled) return;
                saveLobbyInfo({ lobbyId, role: 'host' });
                setRoomCode(lobbyId);
                setStatus('Share this code with Player 2.');
            })
            .catch((e) => {
                if (!cancelled) setError('Failed to create room: ' + e.message);
            });
        return () => { cancelled = true; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const copyToClipboard = () => {
        navigator.clipboard.writeText(roomCode);
        alert('Copied: ' + roomCode);
    };

    const goToStatusRoom = () => {
        navigate('/status-room', { state: { lobbyId: roomCode, role: 'host' } });
    };

    return (
        <div className="create-screen" style={{ backgroundImage: "url('/images/lobby.png')" }}>
            <div className="white-glass-panel">
                <div className="header-container">
                    <img src="/images/createroom.png" alt="Create Room" className="top-banner" />
                </div>

                <h2 className="room-text-label">Room code</h2>

                <div className="code-row-wrapper" style={{ backgroundImage: "url('/images/code_bg.png')" }}>
                    <span className="code-text">{roomCode || '…'}</span>
                    {roomCode && (
                        <button className="copy-action-btn" onClick={copyToClipboard}>
                            <img src="/images/coppy.png" alt="Copy" />
                        </button>
                    )}
                </div>

                {error
                    ? <p style={{ color: 'red', marginTop: 12 }}>{error}</p>
                    : <p style={{ marginTop: 12, color: '#555' }}>{status}</p>
                }

                {roomCode && (
                    <button className="join-action-btn" onClick={goToStatusRoom}>
                        <img src="/images/joinroom2.png" alt="Join Room" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default Coderoom;
