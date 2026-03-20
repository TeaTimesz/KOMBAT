import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../css/strategy-input.css';

const MINION_IMAGES = {
    1: '/images/minion1.png',
    2: '/images/minion2.png',
    3: '/images/minion3.png',
    4: '/images/minion4.png',
    5: '/images/minion5.png',
};

function Strategyinput() {
    const location = useLocation();
    const navigate = useNavigate();

    const selectedIds = location.state?.selectedIds || [1];
    const totalKinds = selectedIds.length;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [allKindData, setAllKindData] = useState([]);

    // Fields for the current kind being configured
    const [kindName, setKindName]       = useState('');
    const [defense, setDefense]         = useState('');
    const [strategy, setStrategy]       = useState('');

    const [showSummary, setShowSummary] = useState(false);

    const currentMinionId = selectedIds[currentIndex];

    // ── Navigation ────────────────────────────────────────────────────────────

    const handleBack = () => {
        if (showSummary) {
            // Return from summary to the last kind
            setShowSummary(false);
            const last = allKindData[allKindData.length - 1];
            setCurrentIndex(totalKinds - 1);
            setKindName(last.name);
            setDefense(String(last.defense));
            setStrategy(last.strategy);
            setAllKindData(prev => prev.slice(0, -1));
        } else if (currentIndex > 0) {
            const prevIndex = currentIndex - 1;
            const prev = allKindData[prevIndex];
            setCurrentIndex(prevIndex);
            setKindName(prev.name);
            setDefense(String(prev.defense));
            setStrategy(prev.strategy);
            setAllKindData(prev2 => prev2.slice(0, -1));
        } else {
            navigate(-1);
        }
    };

    // ── Record / proceed ──────────────────────────────────────────────────────

    const handleRecord = () => {
        if (!kindName.trim()) {
            alert('Please enter a name for this minion kind.');
            return;
        }
        const defNum = parseInt(defense, 10);
        if (isNaN(defNum) || defNum < 1) {
            alert('Defense factor must be a positive integer.');
            return;
        }
        if (!strategy.trim()) {
            alert('Please enter a strategy (e.g. "done").');
            return;
        }

        const kindData = {
            id: currentMinionId,
            img: MINION_IMAGES[currentMinionId],
            name: kindName.trim(),
            defense: defNum,
            strategy: strategy.trim(),
        };

        const updated = [...allKindData, kindData];
        setAllKindData(updated);

        if (currentIndex < totalKinds - 1) {
            // Move to next kind
            setCurrentIndex(currentIndex + 1);
            setKindName('');
            setDefense('');
            setStrategy('');
        } else {
            setShowSummary(true);
        }
    };

    // ── Start game ────────────────────────────────────────────────────────────

    const handleStartGame = () => {
        navigate('/hexgrid', { state: { minionKinds: allKindData } });
    };

    // ── Render: input form ─────────────────────────────────────────────────────

    if (!showSummary) {
        return (
            <div className="strategy-screen" style={{ backgroundImage: "url('/images/lobby.PNG')" }}>

                {/* Step indicator */}
                <div className="step-indicator">
                    Minion Kind {currentIndex + 1} of {totalKinds}
                </div>

                {/* Back button */}
                <button className="back-btn-global" onClick={handleBack}>
                    <img src="/images/back.png" alt="Back" />
                </button>

                {/* Main config board */}
                <div className="sk-board">

                    {/* Left — minion image */}
                    <div className="sk-left">
                        <div className="sk-minion-frame">
                            <img
                                src={MINION_IMAGES[currentMinionId]}
                                alt={`Minion ${currentMinionId}`}
                            />
                        </div>
                    </div>

                    {/* Right — fields */}
                    <div className="sk-right">

                        {/* Kind Name */}
                        <div className="sk-field-group">
                            <label className="sk-label">Kind Name</label>
                            <input
                                className="sk-text-input"
                                type="text"
                                value={kindName}
                                onChange={e => setKindName(e.target.value)}
                                placeholder="e.g. Warrior"
                                maxLength={30}
                            />
                        </div>

                        {/* Defense Factor */}
                        <div className="sk-field-group">
                            <label className="sk-label">Defense Factor <span className="sk-hint">(1 – 999)</span></label>
                            <input
                                className="sk-text-input sk-short"
                                type="number"
                                min="1"
                                max="999"
                                value={defense}
                                onChange={e => setDefense(e.target.value)}
                                placeholder="e.g. 10"
                            />
                        </div>

                        {/* Strategy Script */}
                        <div className="sk-field-group sk-field-grow">
                            <label className="sk-label">Strategy Script</label>
                            <textarea
                                className="sk-textarea"
                                value={strategy}
                                onChange={e => setStrategy(e.target.value)}
                                placeholder={"e.g.\ndone\n\nor\n\nmove down"}
                                spellCheck={false}
                            />
                        </div>
                    </div>
                </div>

                {/* Record button */}
                <div className="record-container">
                    <button className="record-btn" onClick={handleRecord}>
                        <img src="/images/Record.png" alt="Record & Next" />
                    </button>
                </div>
            </div>
        );
    }

    // ── Render: summary ────────────────────────────────────────────────────────

    return (
        <div className="strategy-screen" style={{ backgroundImage: "url('/images/lobby.PNG')" }}>
            <button className="back-btn-global" onClick={handleBack}>
                <img src="/images/back.png" alt="Back" />
            </button>

            <div className="summary-container">
                <div className="sk-summary-board">
                    <h2 className="summary-header">MINION KIND SUMMARY</h2>

                    <div className="summary-scroll-area">
                        {allKindData.map((kind, i) => (
                            <div key={i} className="summary-card">
                                <div className="summary-left">
                                    <div className="minion-frame">
                                        <img src={kind.img} alt={kind.name} />
                                    </div>
                                    <span className="summary-stat-tag">DEF {kind.defense}</span>
                                </div>
                                <div className="summary-right">
                                    <div className="summary-row">
                                        <label>NAME:</label>
                                        <span className="val-name">{kind.name}</span>
                                    </div>
                                    <div className="summary-row">
                                        <label>STRATEGY:</label>
                                        <div className="val-defense sk-strategy-preview">
                                            {kind.strategy}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="final-start-btn" onClick={handleStartGame}>
                        <img src="/images/start.png" alt="Start Game" />
                        <span className="btn-text">START GAME</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Strategyinput;
