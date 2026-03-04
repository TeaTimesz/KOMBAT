import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import '../css/status-room.css';

const socket = io('http://localhost:5001');

function Statusroom() {
    const location = useLocation();
    const navigate = useNavigate();
    const roomCode = location.state?.roomCode || 'USHOGY';

    const [isReadyP1, setIsReadyP1] = useState(false);
    const [isReadyP2, setIsReadyP2] = useState(false);

    useEffect(() => {
        socket.emit('join_room', roomCode);

        socket.on('update_status', (data) => {
            if (data.player === 'P1') setIsReadyP1(data.status);
            if (data.player === 'P2') setIsReadyP2(data.status);
        });

        socket.on('start_game_signal', () => {
            navigate('/play-game');
        });

        return () => {
            socket.off('update_status');
            socket.off('start_game_signal');
        };
    }, [roomCode, navigate]);

    const handleReadyClick = (player) => {
        const currentStatus = player === 'P1' ? isReadyP1 : isReadyP2;
        const newStatus = !currentStatus;

        if (player === 'P1') setIsReadyP1(newStatus);
        if (player === 'P2') setIsReadyP2(newStatus);

        socket.emit('player_ready', {
            roomCode: roomCode,
            player: player,
            status: newStatus
        });
    };

    return (
        <div className="status-screen" style={{ backgroundImage: "url('/images/lobby.png')" }}>
            <div className="room-code-banner" style={{ backgroundImage: "url('/images/RoomCode.png')" }}>
                <span className="banner-text"> </span>
            </div>

            <div className="status-panel" style={{ backgroundImage: "url('/images/2room.png')" }}>
                {/* Player 1 Section */}
                <div className="player-section p1">
                    <div className="name-tag" style={{ backgroundImage: "url('/images/player1.png')" }}></div>
                    <button 
                        className={`ready-btn ${isReadyP1 ? 'is-ready' : ''}`}
                        onClick={() => handleReadyClick('P1')}
                        style={{ backgroundImage: `url(${isReadyP1 ? '/images/ready.png' : '/images/notready.png'})` }}
                    >
                    </button>
                </div>

                {/* Player 2 Section */}
                <div className="player-section p2">
                    <div className="name-tag" style={{ backgroundImage: "url('/images/player2.png')" }}></div>
                    <button 
                        className={`ready-btn ${isReadyP2 ? 'is-ready' : ''}`}
                        onClick={() => handleReadyClick('P2')}
                        style={{ backgroundImage: `url(${isReadyP2 ? '/images/ready.png' : '/images/notready.png'})` }}
                    >
                    </button>
                </div>
            </div>


            {isReadyP1 && isReadyP2 && (
                <div className="start-container">
                    <button className="btn-start" onClick={() => navigate('/select-amount')}>
                        <img src="/images/start.png" alt="START" />
                    </button>
                </div>
            )}
        </div> 
    );
}

export default Statusroom;