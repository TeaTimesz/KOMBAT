import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { parseStrategy } from '../api/gameApi';
import '../css/strategy-input.css';

// ── Preset Strategies ─────────────────────────────────────────────────────────
const PRESET_STRATEGIES = {
    Attack: {
        defenseFactor: '5',
        strategy:
`if (nearby up) then shoot up 10
else if (nearby upright) then shoot upright 10
else if (nearby downright) then shoot downright 10
else if (nearby down) then shoot down 10
else if (nearby downleft) then shoot downleft 10
else if (nearby upleft) then shoot upleft 10
else {
    d = opponent % 10
    if (d - 1) then {
        if (d - 2) then {
            if (d - 3) then {
                if (d - 4) then {
                    if (d - 5) then move upleft
                    else move downleft
                } else move down
            } else move downright
        } else move upright
    } else move up
}
done
`,
    },
    Support: {
        defenseFactor: '3',
        strategy:
`steps = steps + 1
pwr = Budget / 3
if (steps - 2) then {
    steps = 0
    if (nearby up) then shoot up pwr
    else if (nearby upright) then shoot upright pwr
    else if (nearby downright) then shoot downright pwr
    else if (nearby down) then shoot down pwr
    else if (nearby downleft) then shoot downleft pwr
    else if (nearby upleft) then shoot upleft pwr
    else done
} else {
    d = opponent % 10
    if (d - 1) then {
        if (d - 2) then {
            if (d - 3) then {
                if (d - 4) then {
                    if (d - 5) then move upleft
                    else move downleft
                } else move down
            } else move downright
        } else move upright
    } else move up
}
done
`,
    },
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
    const [savedPresets, setSavedPresets]       = useState(
        () => { try { return JSON.parse(localStorage.getItem('kombat_presets')) || []; } catch { return []; } }
    );
    const [expandedPresetIdx, setExpandedPresetIdx] = useState(null);

    useEffect(() => {
        localStorage.setItem('kombat_presets', JSON.stringify(savedPresets));
    }, [savedPresets]);

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
        setExpandedPresetIdx(null);
        setEditorKey(k => k + 1);
    };

    const hasUnsavedInput = () => {
        const saved = minionDataMap[currentIndex];
        const dirty = charName.trim() !== '' || defenseInfo.trim() !== '' || defenseFactor.toString().trim() !== '';
        if (!dirty) return false;
        if (!saved) return true;
        return saved.name !== charName || saved.strategy !== defenseInfo || saved.defenseFactor.toString() !== defenseFactor.toString();
    };

    const handleBack = () => {
        if (!showSummary && hasUnsavedInput()) {
            if (!window.confirm('ข้อมูลที่กรอกยังไม่ได้ Record จะสูญหาย ต้องการกลับหรือไม่?')) return;
        }
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

    const applyPreset = (preset) => {
        setDefenseInfo(preset.strategy);
        setDefenseFactor(preset.defenseFactor ?? '');
        setEditorKey(k => k + 1);
        if (preset.valid) {
            setStrategyChecked(true);
            setCheckResult('ok');
            setCheckError('');
        } else {
            resetCheckState();
        }
    };

    const handleSelectStat = (type) => {
        setSelectedStat(prev => {
            setExpandedPresetIdx(null);
            if (prev === type) {
                setDefenseInfo('');
                setDefenseFactor('');
                setEditorKey(k => k + 1);
                resetCheckState();
                return null;
            }
            const preset = PRESET_STRATEGIES[type];
            if (preset) {
                setDefenseInfo(preset.strategy);
                setDefenseFactor(preset.defenseFactor ?? '');
                setEditorKey(k => k + 1);
                resetCheckState();
            }
            return type;
        });
    };

    const handleAddPreset = () => {
        if (defenseInfo.trim() === '' || defenseFactor.toString().trim() === '') {
            alert('กรุณากรอก Strategy และ Defense Factor ก่อนบันทึก Preset');
            return;
        }
        if (!strategyChecked) {
            alert('กรุณากด Check Strategy ก่อนบันทึก Preset');
            return;
        }
        const name = prompt('ตั้งชื่อ Preset:');
        if (!name || name.trim() === '') return;
        setSavedPresets(prev => [...prev, {
            name: name.trim(),
            strategy: defenseInfo,
            defenseFactor: defenseFactor,
            valid: true,
        }]);
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
                if (expandedPresetIdx !== null) {
                    setSavedPresets(prev => prev.map((p, i) =>
                        i === expandedPresetIdx ? { ...p, valid: true } : p
                    ));
                }
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

    const handleCreateCustomStrategy = handleAddPreset;

    const handlePresetClick = (p, i) => {
        if (expandedPresetIdx === i) {
            setExpandedPresetIdx(null);
        } else {
            setExpandedPresetIdx(i);
            setSelectedStat(null);
            applyPreset(p);
        }
    };

    const handleStrategyChange = (val) => {
        setDefenseInfo(val);
        resetCheckState();
        if (expandedPresetIdx !== null) {
            setSavedPresets(prev => prev.map((p, i) =>
                i === expandedPresetIdx ? { ...p, strategy: val, valid: false } : p
            ));
        }
    };

    const handleDefenseFactorChange = (val) => {
        setDefenseFactor(val);
        if (expandedPresetIdx !== null) {
            setSavedPresets(prev => prev.map((p, i) =>
                i === expandedPresetIdx ? { ...p, defenseFactor: val } : p
            ));
        }
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

                    <div className="game-layout">
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
                                        onChange={handleStrategyChange}
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
                                        onChange={e => handleDefenseFactorChange(e.target.value)}
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
                            disabled={!strategyChecked || charName.trim() === '' || defenseInfo.trim() === '' || defenseFactor.toString().trim() === ''}
                            style={{ opacity: (strategyChecked && charName.trim() !== '' && defenseInfo.trim() !== '' && defenseFactor.toString().trim() !== '') ? 1 : 0.4, cursor: (strategyChecked && charName.trim() !== '' && defenseInfo.trim() !== '' && defenseFactor.toString().trim() !== '') ? 'pointer' : 'not-allowed' }}
                        >
                            <img src="/images/Record.png" alt="Record" />
                        </button>
                    </div>

                    {/* Preset Panel */}
                    <div className="preset-panel">
                        <div className="preset-panel-title">PRESETS</div>
                        <div className="preset-list">
                            {savedPresets.length === 0 ? (
                                <div className="preset-empty">ยังไม่มี Preset</div>
                            ) : (
                                savedPresets.map((p, i) => (
                                    <button
                                        key={i}
                                        className={`preset-item ${expandedPresetIdx === i ? 'preset-expanded' : ''}`}
                                        onClick={() => handlePresetClick(p, i)}
                                    >
                                        <span className="preset-item-name">{p.name}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    </div>{/* end game-layout */}
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
