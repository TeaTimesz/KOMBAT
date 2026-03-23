import { useLocation, useNavigate } from 'react-router-dom';
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
                <button className="endgame-btn" onClick={() => { localStorage.removeItem('kombat_presets'); navigate('/'); }}>
                    GO TO MENU
                </button>
                <button className="endgame-btn" onClick={() => navigate('/select-amount', { state: { mode } })}>
                    PLAY AGAIN
                </button>
            </div>
        </div>
    );
}

export default EndGame;
