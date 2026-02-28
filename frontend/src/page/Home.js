import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/style.css'; 

function Home() {
    const navigate = useNavigate();

    return (
        <div 
            className="main-container" 
            style={{ backgroundImage: "url('/images/index.PNG')" }} 
        >
            <header className="game-logo">
                <img 
                    src="/images/Kombat.png" 
                    alt="Kombat Logo" 
                    className="logo-image" 
                />
            </header>

            <div className="action-area">
                <button 
                    className="btn-start-image" 
                    onClick={() => navigate('/select-mode')}
                >
                    <img 
                        src="/images/startgame.png" 
                        alt="Start Game" 
                    />
                </button>
            </div>
        </div>
    );
}

export default Home;