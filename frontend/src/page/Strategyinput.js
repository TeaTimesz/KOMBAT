import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { parseStrategy } from '../api/gameApi';
import {
    lobbySetupDone,
    subscribeToLobbyStatus,
    loadLobbyInfo,
} from '../api/gameWsApi';
import '../css/strategy-input.css';

// ── Preset Strategies ─────────────────────────────────────────────────────────
const PRESET_STRATEGIES = {
    Attack: {
        defenseFactor: 5,
        strategy:
`t = t + 1
m = 0
while (3 - m) {
  if (Budget - 12) then {} else done
  opponentLoc = opponent
  if (opponentLoc / 10 - 1)
  then {
    if (opponentLoc % 10 - 5) then move upleft
    else if (opponentLoc % 10 - 4) then move downleft
    else if (opponentLoc % 10 - 3) then move down
    else if (opponentLoc % 10 - 2) then move downright
    else if (opponentLoc % 10 - 1) then move upright
    else move up
  }
  else if (opponentLoc)
  then {
    if (opponentLoc % 10 - 5) then shoot upleft 10
    else if (opponentLoc % 10 - 4) then shoot downleft 10
    else if (opponentLoc % 10 - 3) then shoot down 10
    else if (opponentLoc % 10 - 2) then shoot downright 10
    else if (opponentLoc % 10 - 1) then shoot upright 10
    else shoot up 10
  }
  else {
    try = 0
    while (3 - try) {
      success = 1
      dir = random % 6
      if ((dir - 4) * (nearby upleft % 10 + 1) ^ 2) then move upleft
      else if ((dir - 3) * (nearby downleft % 10 + 1) ^ 2) then move downleft
      else if ((dir - 2) * (nearby down % 10 + 1) ^ 2) then move down
      else if ((dir - 1) * (nearby downright % 10 + 1) ^ 2) then move downright
      else if (dir * (nearby upright % 10 + 1) ^ 2) then move upright
      else if ((nearby up % 10 + 1) ^ 2) then move up
      else success = 0
      if (success) then try = 3 else try = try + 1
    }
    m = m + 1
  }
}
done
`,
    },
    Support: {
        defenseFactor: 3,
        strategy:
`t = t + 1
m = 0
while (3 - m) {
  if (Budget - 12) then {} else done
  opponentLoc = opponent
  if (opponentLoc / 10 - 1)
  then {
    if (Budget - 5000) then {
      if (opponentLoc % 10 - 5) then move upleft
      else if (opponentLoc % 10 - 4) then move downleft
      else if (opponentLoc % 10 - 3) then move down
      else if (opponentLoc % 10 - 2) then move downright
      else if (opponentLoc % 10 - 1) then move upright
      else move up
    } else {
      if (opponentLoc % 10 - 5) then move downright
      else if (opponentLoc % 10 - 4) then move upright
      else if (opponentLoc % 10 - 3) then move up
      else if (opponentLoc % 10 - 2) then move upleft
      else if (opponentLoc % 10 - 1) then move downleft
      else move down
    }
  }
  else if (opponentLoc)
  then {
    if (Budget - 5000) then {
      if (opponentLoc % 10 - 5) then shoot upleft 10
      else if (opponentLoc % 10 - 4) then shoot downleft 10
      else if (opponentLoc % 10 - 3) then shoot down 10
      else if (opponentLoc % 10 - 2) then shoot downright 10
      else if (opponentLoc % 10 - 1) then shoot upright 10
      else shoot up 10
    } else {
      if (opponentLoc % 10 - 5) then move downright
      else if (opponentLoc % 10 - 4) then move upright
      else if (opponentLoc % 10 - 3) then move up
      else if (opponentLoc % 10 - 2) then move upleft
      else if (opponentLoc % 10 - 1) then move downleft
      else move down
    }
  }
  else {
    try = 0
    while (3 - try) {
      success = 1
      dir = random % 6
      if ((dir - 4) * (nearby upleft % 10 + 1) ^ 2) then move upleft
      else if ((dir - 3) * (nearby downleft % 10 + 1) ^ 2) then move downleft
      else if ((dir - 2) * (nearby down % 10 + 1) ^ 2) then move down
      else if ((dir - 1) * (nearby downright % 10 + 1) ^ 2) then move downright
      else if (dir * (nearby upright % 10 + 1) ^ 2) then move upright
      else if ((nearby up % 10 + 1) ^ 2) then move up
      else success = 0
      if (success) then try = 3 else try = 3
    }
    m = m + 1
  }
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

function Strategyinput() {
    const location = useLocation();
    const navigate = useNavigate();

    const selectedIds = location.state?.selectedIds || [1];
    const mode = location.state?.mode || 'SOLITAIRE';
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
    const [lobbySubmitting, setLobbySubmitting] = useState(false);
    const [lobbyError, setLobbyError]           = useState('');
    const lobbyUnsubRef = useRef(null);

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
        setEditorKey(k => k + 1);
    };

    const handleBack = () => {
        if (showSummary) {
            const lastIdx = selectedIds.length - 1;
            setShowSummary(false);
            setCurrentIndex(lastIdx);
            loadIndex(lastIdx);
        } else if (currentIndex > 0) {
            const hasUnsaved = !minionDataMap[currentIndex] &&
                (charName.trim() !== '' || defenseInfo.trim() !== '' || defenseFactor.toString().trim() !== '');
            if (hasUnsaved && !window.confirm(`ข้อมูล Minion ที่ ${currentIndex + 1} ยังไม่ได้ Record\nหากกลับไปข้อมูลจะหายไป ต้องการดำเนินการต่อหรือไม่?`)) {
                return;
            }
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
                setDefenseFactor(String(preset.defenseFactor));
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
        if (defenseInfo.trim() === '') {
            alert('กรุณากรอก Strategy ก่อนบันทึก Preset');
            return;
        }
        const presetName = prompt('ระบุชื่อ Preset:');
        if (!presetName || presetName.trim() === '') return;
        const newPreset = {
            name: presetName.trim(),
            strategy: defenseInfo,
            defenseFactor,
            statType: selectedStat,
        };
        setSavedPresets(prev => {
            const updated = [...prev, newPreset];
            localStorage.setItem('kombat_presets', JSON.stringify(updated));
            return updated;
        });
    };

    const handleDeletePreset = (idx, e) => {
        e.stopPropagation();
        if (!window.confirm(`ลบ Preset "${savedPresets[idx].name}" ออกหรือไม่?`)) return;
        setSavedPresets(prev => {
            const updated = prev.filter((_, i) => i !== idx);
            localStorage.setItem('kombat_presets', JSON.stringify(updated));
            return updated;
        });
        if (expandedPresetIdx === idx) setExpandedPresetIdx(null);
    };

    const handlePresetClick = (preset, idx) => {
        setDefenseInfo(preset.strategy || '');
        setSelectedStat(preset.statType || null);
        setDefenseFactor(preset.defenseFactor != null ? String(preset.defenseFactor) : '');
        setExpandedPresetIdx(prev => prev === idx ? null : idx);
        setEditorKey(k => k + 1);
        resetCheckState();
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
                    <div className="main-board" style={{ backgroundImage: "url('/images/Createminion.png')" }}>
                         

                        {/* Content */}
                        <div className="content-body">
                            {/* ซ้าย */}
                            <div className="char-column">
                                <div className="char-frame-container">
                                    <img src={`/images/minion${currentMinionId}.png`} alt="Character" className="char-img" />
                                </div>

                                {/* Character Name */}
                                <div className="name-input-group">
                                    <img src="/images/Minionname.png" alt="Label" className="label-text-img" />
                                    <div className="input-box-bg" style={{ backgroundImage: "url('/images/ช่อง.png')" }}>
                                        <input
                                            type="text"
                                            className="strat-input"
                                            value={charName}
                                            onChange={e => setCharName(e.target.value)}
                                            placeholder="Minion Name"
                                        />
                                    </div>
                                </div>

                                {/* Defense Factor — ย้ายมาอยู่ใต้ Character Name */}
                                <div className="name-input-group" style={{ marginTop: '15px' }}>
                                    <img src="/images/defasefactor.png" alt="Defense Factor" className="label-text-img" />
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
                            {checkResult === 'ok' && (
                                <div className="check-ok-msg">Strategy is valid!</div>
                            )}
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
                    

                    
                    {/* Preset Panel */}
                    <div className="preset-panel">
                        
                        <div className="preset-panel-title">PRESETS</div>
                        <div className="preset-stat-type">
                            <button className={`stat-btn ${selectedStat === 'Attack' ? 'active-stat' : ''}`} onClick={() => handleSelectStat('Attack')}>
                                <img src="/images/attack-btn.png" alt="Attack" />
                            </button>
                            <button className={`stat-btn ${selectedStat === 'Support' ? 'active-stat' : ''}`} onClick={() => handleSelectStat('Support')}>
                                <img src="/images/support-btn.png" alt="Support" />
                            </button>
                            <button className="stat-btn" onClick={handleCreateCustomStrategy}>
                                <img src="/images/plus-btn.png" alt="Add" />
                            </button>
                        </div>
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
                                        <span className="preset-delete-btn" onClick={(e) => handleDeletePreset(i, e)}>✕</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    </div>{/* end main-board */}
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
                                        <div className="tag-wrapper">
                                            <span className="summary-stat-tag">{minion.statType}</span>
                                        </div>
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
                        {(() => {
                            const lobbyInfo = loadLobbyInfo();
                            const isLobbyHost = mode === 'DUEL' && lobbyInfo?.role === 'host';

                            if (isLobbyHost) {
                                const handleLobbySubmit = async () => {
                                    const kinds = selectedIds.map((_, i) => minionDataMap[i]).filter(Boolean).map(m => ({
                                        id: m.id, name: m.name,
                                        defense: Number(m.defenseFactor) || 1,
                                        strategy: m.strategy,
                                    }));
                                    setLobbySubmitting(true);
                                    setLobbyError('');
                                    try {
                                        const unsub = await subscribeToLobbyStatus(lobbyInfo.lobbyId, (msg) => {
                                            if (msg.event === 'GAME_READY') {
                                                unsub();
                                                navigate('/hexgrid', {
                                                    // Host is always P1 — pass only p1Token so HexGrid treats this as a 2-device game
                                                    state: { gameId: msg.gameId, p1Token: msg.p1Token, p2Token: null, minionKinds: msg.kinds, mode: 'DUEL' },
                                                });
                                            }
                                            if (msg.event === 'ERROR') {
                                                setLobbyError(msg.message || 'Failed to start game.');
                                                setLobbySubmitting(false);
                                            }
                                        });
                                        lobbyUnsubRef.current = unsub;
                                        await lobbySetupDone(lobbyInfo.lobbyId, kinds);
                                    } catch (e) {
                                        setLobbyError(e.message || 'Could not send setup.');
                                        setLobbySubmitting(false);
                                    }
                                };

                                return lobbySubmitting ? (
                                    <div style={{ color: '#fff', textAlign: 'center', marginTop: 16, fontSize: 18 }}>
                                        Starting game… {lobbyError && <span style={{ color: 'red' }}>{lobbyError}</span>}
                                    </div>
                                ) : (
                                    <>
                                        <button className="final-start-btn" onClick={handleLobbySubmit}>
                                            <img src="/images/startgame.png" alt="Submit & Start" />
                                        </button>
                                        {lobbyError && <div style={{ color: 'red', textAlign: 'center', marginTop: 8 }}>{lobbyError}</div>}
                                    </>
                                );
                            }

                            return (
                                <button className="final-start-btn" onClick={() => navigate('/hexgrid', { state: { minions: selectedIds.map((_, i) => minionDataMap[i]).filter(Boolean), mode } })}>
                                    <img src="/images/startgame.png" alt="Start Game" />
                                </button>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Strategyinput;