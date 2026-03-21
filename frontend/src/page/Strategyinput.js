import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { parseStrategy } from '../api/gameApi';
import '../css/strategy-input.css';

// ── Preset Strategies ─────────────────────────────────────────────────────────
const PRESET_STRATEGIES = {
    Attack:
`# Attack — scan nearby, shoot on sight, pursue relentlessly
{

    if (Budget - 100) then
        if (nearby up) then shoot up Budget / 2
        else if (nearby upright) then shoot upright Budget / 2
        else if (nearby downright) then shoot downright Budget / 2
        else if (nearby down) then shoot down Budget / 2
        else if (nearby downleft) then shoot downleft Budget / 2
        else if (nearby upleft) then shoot upleft Budget / 2
        else {
            opponentLoc = opponent
            opponentDir = opponentLoc % 10
            if (opponentLoc) then
                if (opponentDir - 5) then move downleft
                else if (opponentDir - 4) then move down
                else if (opponentDir - 3) then move downright
                else if (opponentDir - 2) then move upright
                else if (opponentDir - 1) then move up
                else move upleft
            else move downright
        }
    else done
}`,
    Support:
`# Support — strategic movement, conserve budget, shoot when adjacent
{
    opponentLoc  = opponent
    opponentDist = opponentLoc / 10
    opponentDir  = opponentLoc % 10

    if (Budget - 200) then
        if (opponentLoc) then
            if (opponentDist - 1) then
                if (opponentDir - 5) then move downleft
                else if (opponentDir - 4) then move down
                else if (opponentDir - 3) then move downright
                else if (opponentDir - 2) then move upright
                else if (opponentDir - 1) then move up
                else move upleft
            else {
                if (nearby up) then shoot up Budget / 3
                else if (nearby upright) then shoot upright Budget / 3
                else if (nearby downright) then shoot downright Budget / 3
                else if (nearby down) then shoot down Budget / 3
                else if (nearby downleft) then shoot downleft Budget / 3
                else if (nearby upleft) then shoot upleft Budget / 3
                else done
            }
        else done
    else done
}`,
};
// ─────────────────────────────────────────────────────────────────────────────

// ── Monaco Code Editor component ──────────────────────────────────────────────
function StrategyEditor({ onChange, defaultValue }) {
    const handleMount = (editor, monaco) => {
        if (defaultValue) editor.setValue(defaultValue);
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
    const [minionDataMap, setMinionDataMap] = useState({});
    const [charName, setCharName]           = useState('');
    const [defenseInfo, setDefenseInfo]     = useState('');
    const [selectedStat, setSelectedStat]   = useState(null);
    const [showSummary, setShowSummary]     = useState(false);
    const [defenseFactor, setDefenseFactor] = useState('');
    const [editorKey, setEditorKey]         = useState(0);
    const [strategyChecked, setStrategyChecked] = useState(false);
    const [checkResult, setCheckResult]         = useState(null); // null | 'ok' | 'error'
    const [checkError, setCheckError]           = useState('');
    const [checkLoading, setCheckLoading]       = useState(false);

    const currentMinionId = selectedIds[currentIndex];

    const loadIndex = (idx, map) => {
        const data = (map ?? minionDataMap)[idx];
        if (data) {
            setCharName(data.name);
            setDefenseInfo(data.strategy);
            setSelectedStat(data.statType);
            setDefenseFactor(data.defenseFactor);
            setStrategyChecked(true);
            setCheckResult('ok');
            setCheckError('');
        } else {
            setCharName('');
            setDefenseInfo('');
            setSelectedStat(null);
            setDefenseFactor('');
            setStrategyChecked(false);
            setCheckResult(null);
            setCheckError('');
        }
        setEditorKey(k => k + 1);
    };

    const handleBack = () => {
        if (showSummary) {
            const lastIdx = selectedIds.length - 1;
            setShowSummary(false);
            setCurrentIndex(lastIdx);
            loadIndex(lastIdx);
        } else if (currentIndex > 0) {
            const prevIndex = currentIndex - 1;
            setCurrentIndex(prevIndex);
            loadIndex(prevIndex);
        } else {
            navigate(-1);
        }
    };

    const resetCheckState = () => {
        setStrategyChecked(false);
        setCheckResult(null);
        setCheckError('');
    };

    const handleSelectStat = (type) => {
        setSelectedStat(prev => {
            if (prev === type) return null;
            const preset = PRESET_STRATEGIES[type];
            if (preset) {
                setDefenseInfo(preset);
                setEditorKey(k => k + 1);
                resetCheckState();
            }
            return type;
        });
    };

    const handleCheckStrategy = async () => {
        if (defenseInfo.trim() === '') {
            setCheckResult('error');
            setCheckError('กรุณากรอก Strategy ก่อน');
            return;
        }
        setCheckLoading(true);
        setCheckResult(null);
        setCheckError('');
        try {
            const res = await parseStrategy(defenseInfo);
            if (res.valid) {
                setCheckResult('ok');
                setStrategyChecked(true);
            } else {
                setCheckResult('error');
                setCheckError(res.error || 'Parse error');
                setStrategyChecked(false);
            }
        } catch (e) {
            setCheckResult('error');
            setCheckError(e.message || 'ไม่สามารถเชื่อมต่อ server ได้');
            setStrategyChecked(false);
        }
        setCheckLoading(false);
    };

    const handleCreateCustomStrategy = () => {
        const customStat = prompt('ระบุชื่อ Stat Type ของคุณ:');
        if (customStat && customStat.trim() !== '') setSelectedStat(customStat);
    };

    // ── Record / proceed ──────────────────────────────────────────────────────

    const handleRecordNext = () => {
        if (charName.trim() === '' || defenseInfo.trim() === '' || defenseFactor.toString().trim() === '') {
            alert('กรุณากรอกข้อมูลให้ครบถ้วนก่อนบันทึกครับ');
            return;
        }
        if (isNaN(Number(defenseFactor)) || defenseFactor < 0) {
            alert('Wrong input Defense Factor');
            return;
        }
        if (!strategyChecked) {
            alert('กรุณากด Check Strategy ก่อนบันทึก');
            return;
        }

        const kindData = {
            id: currentMinionId,
            name: charName,
            strategy: defenseInfo,
            defenseFactor,
            statType: selectedStat,
        };

        const newMap = { ...minionDataMap, [currentIndex]: kindData };
        setMinionDataMap(newMap);

        if (currentIndex < selectedIds.length - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            loadIndex(nextIndex, newMap);
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
                                <button className={`stat-btn ${selectedStat === 'Support' ? 'active-stat' : ''}`} onClick={() => handleSelectStat('Support')}>
                                    <img src="/images/support-btn.png" alt="Support" />
                                </button>
                                <button className="stat-btn" onClick={handleCreateCustomStrategy}>
                                    <img src="/images/plus-btn.png" alt="Add" />
                                </button>
                                {selectedStat && !['Attack', 'Support'].includes(selectedStat) && (
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
                                        onChange={val => { setDefenseInfo(val); resetCheckState(); }}
                                        defaultValue={defenseInfo}
                                    />
                                </div>

                        <div className="defense-factor-box">
                            <img src="/images/defasefactor.png" alt="Defense Factor" className="defense-factor-label-img" />
                            <div className="name-input-group">
                                <div className="input-box-bg" style={{ backgroundImage: "url('/images/ช่อง.png')" }}>
                                    <input
                                        type="number"
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

                        <div className="check-record-row">
                            <button
                                className={`check-strategy-btn ${checkResult === 'ok' ? 'check-ok' : checkResult === 'error' ? 'check-fail' : ''}`}
                                onClick={handleCheckStrategy}
                                disabled={checkLoading}
                            >
                                {checkLoading ? 'Checking…' : checkResult === 'ok' ? '✓ Passed' : checkResult === 'error' ? '✗ Failed' : 'Check Strategy'}
                            </button>
                            {checkResult === 'error' && (
                                <div className="check-error-msg">{checkError}</div>
                            )}
                        </div>
                        <button
                            className="record-btn-container"
                            onClick={handleRecordNext}
                            disabled={!strategyChecked}
                            style={{ opacity: strategyChecked ? 1 : 0.4, cursor: strategyChecked ? 'pointer' : 'not-allowed' }}
                        >
                            <img src="/images/Record.png" alt="Record" />
                        </button>
                    </div>
                </>
            ) : (
                <div className="summary-container">
                    <div className="summary-board" style={{ backgroundImage: "url('/images/ป้าย.png')" }}>
                        <h2 className="summary-header">MINION STRATEGY REPORT</h2>
                        <div className="summary-scroll-area">
                            {selectedIds.map((_, index) => minionDataMap[index]).filter(Boolean).map((minion, index) => (
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
                        <button className="final-start-btn" onClick={() => navigate('/hexgrid', { state: { minions: selectedIds.map((_, i) => minionDataMap[i]).filter(Boolean) } })}>
                            <img src="/images/startgame.png" alt="Start Duel" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Strategyinput;
