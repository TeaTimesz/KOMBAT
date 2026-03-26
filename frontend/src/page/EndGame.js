import { useLocation, useNavigate } from 'react-router-dom';
import { loadLobbyInfo, lobbyReset } from '../api/gameWsApi';
import '../css/endgame.css';

function EndGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const winner = location.state?.winner ?? null; // 0 = draw, 1 = player1, 2 = player2
    const mode   = location.state?.mode   ?? 'DUEL';

    const bgImage =
        winner === 1 ? '/images/player1win.png' :
        winner === 2 ? '/images/player2win.png' :
        '/images/draw.png';

    return (
        <div
            className="endgame-screen"
            style={{ backgroundImage: `url('${bgImage}')` }}
        >
            <div className="endgame-buttons">
                <button className="endgame-img-btn" onClick={() => { localStorage.removeItem('kombat_presets'); navigate('/'); }}>
                    <img src="/images/backtomenu.png" alt="Go Back to Menu" />
                </button>
                <button className="endgame-img-btn" onClick={() => {
                    const lobby = loadLobbyInfo();
                    if (mode === 'DUEL' && lobby?.lobbyId) {
                        lobbyReset(lobby.lobbyId);
                        navigate('/status-room', { state: { lobbyId: lobby.lobbyId, role: lobby.role } });
                    } else {
                        navigate('/select-amount', { state: { mode } });
                    }
                }}>
                    <img src="/images/playagain.png" alt="Play Again" />
                </button>
            </div>
        </div>
    );
}

export default EndGame;
