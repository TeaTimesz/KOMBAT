import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinLobby, saveLobbyInfo } from '../api/gameWsApi';
import '../css/join-room.css';

function Joinroom() {
    const navigate = useNavigate();

    const [inputCode, setInputCode] = useState('');
    const [loading,   setLoading]   = useState(false);
    const [error,     setError]     = useState('');

    const handleJoinClick = async () => {
        const code = inputCode.trim().toUpperCase();
        if (!code) { setError('Please enter a room code.'); return; }
        setLoading(true);
        setError('');
        try {
            await joinLobby(code);
            saveLobbyInfo({ lobbyId: code, role: 'guest' });
            navigate('/status-room', { state: { lobbyId: code, role: 'guest' } });
        } catch (e) {
            setError(e.message || 'Could not join room. Check the code and try again.');
        }
        setLoading(false);
    };

    return (
        <div className="join-screen" style={{ backgroundImage: "url('/images/lobby.png')" }}>
            <div className="header-container">
                <img src="/images/joinroomm.png" alt="Join Room" className="top-banner" />
            </div>

            <div className="gold-input-frame" style={{ backgroundImage: "url('/images/enterroomcode.png')" }}>
                <input
                    type="text"
                    className="room-input-field"
                    style={{ backgroundImage: "url('/images/ช่อง.png')" }}
                    maxLength={8}
                    value={inputCode}
                    onChange={(e) => { setInputCode(e.target.value.toUpperCase()); setError(''); }}
                    placeholder="Enter code…"
                    disabled={loading}
                />
                {error && <p style={{ color: 'red', fontSize: 13, margin: '4px 0 0' }}>{error}</p>}

                <div className="action-buttons">
                    <button className="btn-cancel" onClick={() => { setInputCode(''); setError(''); }} disabled={loading}>
                        <img src="/images/cancel-btn.png" alt="Cancel" />
                    </button>
                    <button className="btn-join" onClick={handleJoinClick} disabled={loading}>
                        <img src="/images/join-btn.png" alt="Join" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Joinroom;
