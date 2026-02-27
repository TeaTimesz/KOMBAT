import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/select-mode.css';

function SelectMode() {
    const navigate = useNavigate();

    useEffect(() => {
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Henny+Penny&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);
    }, []);

    const titleStyle = {
        fontFamily: '"Henny Penny", cursive',
        fontSize: '4.5rem',
        color: '#4a3728', 
        textShadow: '2px 2px 0px rgba(255, 255, 255, 0.8), 4px 4px 10px rgba(0, 0, 0, 0.3)',
        marginBottom: '30px',
        textAlign: 'center'
    };

    return (
        <div className="selection-screen" style={{ backgroundImage: "url('/images/index.PNG')" }}>
            <div className="selection-box">
                <h1 className="select-title" style={titleStyle}>Select Mode</h1>
                
                <div className="mode-list">
        
                <button className="mode-button" onClick={() => navigate('/how-to-duel')}>
                <img src="/images/Duel.png" alt="Duel" />
                </button>

                <button className="mode-button" onClick={() => navigate('/how-to-solitaire')}>
                <img src="/images/Solitaire.png" alt="Solitaire" />
                </button>

                <button className="mode-button" onClick={() => navigate('/how-to-auto')}> 
                <img src="/images/Auto.png" alt="Auto" />
                </button>
                </div>
            </div>

            <div className="back-container">
                <button className="back-button-img" onClick={() => navigate('/')}>
                    <img src="/images/back.png" alt="Back" />
                </button>
            </div>
        </div>
    );
}

export default SelectMode;