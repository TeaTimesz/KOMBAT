import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import '../css/strategy-input.css';

// ── Monaco Code Editor component ──────────────────────────────────────────────
function StrategyEditor({ onChange }) {
    const handleMount = (editor, monaco) => {
        // กำหนด theme พื้นหลังใส
        monaco.editor.defineTheme('fantasy-transparent', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: '', foreground: '3a2200' },
            ],
            colors: {
                'editor.background':          '#00000000',
                'editor.lineHighlightBackground': '#c8a84b11',
                'editorCursor.foreground':    '#7a4e10',
                'editor.foreground':          '#3a2200',
                'editorLineNumber.foreground':'#a07840',
                'editorLineNumber.activeForeground': '#5c3200',
                'editor.selectionBackground': '#c8a84b44',
            },
        });
        monaco.editor.setTheme('fantasy-transparent');
    };

    return (
        <div className="monaco-wrapper">
            <Editor
                height="100%"
                language="plaintext"
                onMount={handleMount}
                onChange={val => onChange(val || '')}
                options={{
                    fontSize: 16,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    automaticLayout: true,
                    padding: { top: 8, bottom: 8 },
                    scrollbar: { verticalScrollbarSize: 4 },
                }}
            />
        </div>
    );
}
// ─────────────────────────────────────────────────────────────────────────────

function Strategyinput() {
    const location = useLocation();
    const navigate = useNavigate();

    const selectedIds = location.state?.selectedIds || [1];
    const [currentIndex, setCurrentIndex]   = useState(0);
    const [allMinionData, setAllMinionData] = useState([]);
    const [charName, setCharName]           = useState('');
    const [defenseInfo, setDefenseInfo]     = useState('');
    const [selectedStat, setSelectedStat]   = useState(null);
    const [showSummary, setShowSummary]     = useState(false);
    const [defenseFactor, setDefenseFactor] = useState('');
    const [editorKey, setEditorKey]         = useState(0);

    const currentMinionId = selectedIds[currentIndex];

    const handleBack = () => {
        if (showSummary) {
            setShowSummary(false);
            setCurrentIndex(selectedIds.length - 1);
            const lastData = allMinionData[allMinionData.length - 1];
            if (lastData) {
                setCharName(lastData.name);
                setDefenseInfo(lastData.strategy);
                setSelectedStat(lastData.statType);
                setDefenseFactor(lastData.defenseFactor);
                setAllMinionData(allMinionData.slice(0, -1));
                setEditorKey(k => k + 1);
            }
        } else if (currentIndex > 0) {
            const prevIndex = currentIndex - 1;
            setCurrentIndex(prevIndex);
            const prevData = allMinionData[prevIndex];
            if (prevData) {
                setCharName(prevData.name);
                setDefenseInfo(prevData.strategy);
                setSelectedStat(prevData.statType);
                setDefenseFactor(prevData.defenseFactor);
                setAllMinionData(allMinionData.slice(0, -1));
                setEditorKey(k => k + 1);
            }
        } else {
            navigate(-1);
        }
    };

    const handleSelectStat = (type) => setSelectedStat(type);

    const handleCreateCustomStrategy = () => {
        const customStat = prompt('ระบุชื่อ Stat Type ของคุณ:');
        if (customStat && customStat.trim() !== '') setSelectedStat(customStat);
    };

    // ── Record / proceed ──────────────────────────────────────────────────────

    const handleRecordNext = () => {
        if (charName.trim() === '' || defenseInfo.trim() === '' || defenseFactor.trim() === '' || !selectedStat) {
            alert('กรุณากรอกข้อมูลให้ครบถ้วนก่อนบันทึกครับ');
            return;
        }

        const kindData = {
            id: currentMinionId,
            name: charName,
            strategy: defenseInfo,
            defenseFactor,
            statType: selectedStat,
        };

        const updatedData = [...allMinionData, currentData];
        setAllMinionData(updatedData);

        if (currentIndex < totalKinds - 1) {
            // Move to next kind
            setCurrentIndex(currentIndex + 1);
            setCharName('');
            setDefenseInfo('');
            setDefenseFactor('');
            setSelectedStat(null);
            setEditorKey(k => k + 1);
        } else {
            setShowSummary(true);
        }
    };

    return (
        <div className="strategy-screen" style={{ backgroundImage: "url('/images/lobby.png')" }}>
            <button className="back-btn-global" onClick={handleBack}>
                <img src="/images/back.png" alt="Back" />
            </button>

            {!showSummary ? (
                <>
                    <div className="step-indicator">
                        Minion {currentIndex + 1} of {selectedIds.length}
                    </div>

                    <div className="main-board" style={{ backgroundImage: "url('/images/strategy.png')" }}>
                        {/* Stat Type */}
                        <div className="stat-type-header">
                            <img src="/images/Stattype.png" alt="Stat Type" className="stat-label-img" />
                            <div className="stat-buttons-row">
                                <button className={`stat-btn ${selectedStat === 'Attack' ? 'active-stat' : ''}`} onClick={() => handleSelectStat('Attack')}>
                                    <img src="/images/attack-btn.png" alt="Attack" />
                                </button>
                                <button className={`stat-btn ${selectedStat === 'Balanced' ? 'active-stat' : ''}`} onClick={() => handleSelectStat('Balanced')}>
                                    <img src="/images/support-btn.png" alt="Balanced" />
                                </button>
                                <button className="stat-btn" onClick={handleCreateCustomStrategy}>
                                    <img src="/images/plus-btn.png" alt="Add" />
                                </button>
                                {selectedStat && !['Attack', 'Balanced'].includes(selectedStat) && (
                                    <span className="custom-stat-label">{selectedStat}</span>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="content-body">
                            {/* ซ้าย */}
                            <div className="char-column">
                                <div className="char-frame-container">
                                    <img src={`/images/minion${currentMinionId}.png`} alt="Character" className="char-img" />
                                </div>
                                <div className="name-input-group">
                                    <img src="/images/Charactername.png" alt="Label" className="label-text-img" />
                                    <div className="input-box-bg" style={{ backgroundImage: "url('/images/ช่อง.png')" }}>
                                        <input
                                            type="text"
                                            className="strat-input"
                                            value={charName}
                                            onChange={e => setCharName(e.target.value)}
                                            placeholder="Character Name"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ขวา */}
                            <div className="strategy-column">
                                <div className="strategy-detail-box">
                                    <img src="/images/Strategydetail.png" alt="Header" className="detail-header-img" />
                                    <StrategyEditor
                                        key={editorKey}
                                        onChange={setDefenseInfo}
                                        placeholder="Enter strategy here..."
                                    />
                                </div>

<div className="defense-factor-box">
    <img src="/images/defasefactor.png" alt="Defense Factor" className="defense-factor-label-img" />
    <div className="name-input-group">
        <div className="input-box-bg" style={{ backgroundImage: "url('/images/ช่อง.png')" }}>
            <input
                type="text"
                className="strat-input"
                placeholder="Enter factor..."
                value={defenseFactor}
                onChange={e => setDefenseFactor(e.target.value)}
            />
        </div>
    </div>
</div>
                            </div>
                        </div>

                        <button className="record-btn-container" onClick={handleRecordNext}>
                            <img src="/images/Record.png" alt="Record" />
                        </button>
                    </div>
                </>
            ) : (
                <div className="summary-container">
                    <div className="summary-board" style={{ backgroundImage: "url('/images/ป้าย.png')" }}>
                        <h2 className="summary-header">MINION STRATEGY REPORT</h2>
                        <div className="summary-scroll-area">
                            {allMinionData.map((minion, index) => (
                                <div key={index} className="summary-card">
                                    <div className="summary-left">
                                        <div className="minion-frame">
                                            <img src={`/images/minion${minion.id}.png`} alt="minion" />
                                        </div>
                                        <span className="summary-stat-tag">{minion.statType}</span>
                                    </div>
                                    <div className="summary-right">
                                        <div className="summary-row">
                                            <label>NAME:</label>
                                            <span className="val-name">{minion.name}</span>
                                        </div>
                                        <div className="summary-row">
                                            <label>DEFENSE STRATEGY:</label>
                                            <pre className="val-defense">{minion.strategy}</pre>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="final-start-btn" onClick={() => navigate('/start-duel', { state: { minions: allMinionData } })}>
                            <img src="/images/startgame.png" alt="Start Duel" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Strategyinput;
