import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/solitaire.css';

function HowtoSolitaire() {
    const navigate = useNavigate();

    return (
        <div className="solitaire-screen" style={{ backgroundImage: "url('/images/index.PNG')" }}>
            
            <div className="header-box">
                <img 
                    src="/images/Howtoplay.png" 
                    alt="How to play" 
                    className="how-to-header-img" 
                />
            </div>

            <div className="tablet-box">
                <img 
                    src="/images/Soli.png" 
                    alt="Solitaire Rules" 
                    className="tablet-main-img" 
                />
            </div>

            <div className="navigation-footer">
                <button className="img-btn-footer" onClick={() => navigate('/select-mode')}>
                    <img src="/images/Back.png" alt="Back" />
                </button>
                <button className="img-btn-footer btn-confirm" onClick={() => navigate('/status-room')}>
                    <img src="/images/confirm.png" alt="Confirm" />
                </button>
            </div>
        </div>
    );
}

export default HowtoSolitaire;