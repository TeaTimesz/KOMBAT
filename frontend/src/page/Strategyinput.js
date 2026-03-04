import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../css/strategy-input.css';

function Strategyinput() {
    const location = useLocation();
    const navigate = useNavigate();
    const handleBack = () => {
    if (showSummary) {
        // 1. ถ้าอยู่หน้าสรุป ให้ปิดหน้าสรุปแล้วกลับไปที่มินเนี่ยนตัวสุดท้าย
        setShowSummary(false);
        setCurrentIndex(selectedIds.length - 1);
        
        const lastData = allMinionData[allMinionData.length - 1];
        if (lastData) {
            setCharName(lastData.name);
            setDefenseInfo(lastData.strategy);
            setSelectedStat(lastData.statType);
            // ลบข้อมูลตัวสุดท้ายออกจาก List เพื่อรอการ Record ใหม่
            setAllMinionData(allMinionData.slice(0, -1));
        }
    } else if (currentIndex > 0) {
        const prevIndex = currentIndex - 1;
        setCurrentIndex(prevIndex);
        
        const prevData = allMinionData[prevIndex];
        if (prevData) {
            setCharName(prevData.name);
            setDefenseInfo(prevData.strategy);
            setSelectedStat(prevData.statType);
            setAllMinionData(allMinionData.slice(0, -1));
        }
    } else {
        navigate(-1);
    }
};

    const selectedIds = location.state?.selectedIds || [1]; 
    const [currentIndex, setCurrentIndex] = useState(0);
    const [allMinionData, setAllMinionData] = useState([]);

    const [charName, setCharName] = useState("");
    const [defenseInfo, setDefenseInfo] = useState("");
    const [selectedStat, setSelectedStat] = useState(null); 
    
    // ควบคุมการแสดงหน้าสรุป
    const [showSummary, setShowSummary] = useState(false);

    const currentMinionId = selectedIds[currentIndex];

    const handleSelectStat = (type) => setSelectedStat(type);

    const handleCreateCustomStrategy = () => {
        const customStat = prompt("ระบุชื่อ Stat Type ของคุณ:");
        if (customStat && customStat.trim() !== "") {
            setSelectedStat(customStat);
        }
    };

    const handleRecordNext = () => {
        if (charName.trim() === "" || defenseInfo.trim() === "" || !selectedStat) {
            alert("กรุณากรอกข้อมูลและเลือก Stat Type ให้ครบถ้วนก่อนบันทึกครับ");
            return;
        }

        const currentData = {
            id: currentMinionId,
            name: charName,
            strategy: defenseInfo,
            statType: selectedStat
        };
        
        const updatedData = [...allMinionData, currentData];
        setAllMinionData(updatedData);

        if (currentIndex < selectedIds.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setCharName("");
            setDefenseInfo("");
            setSelectedStat(null);
        } else {
            setAllMinionData(updatedData);
            setShowSummary(true);
        }
    };
    

    return (
        <div className="strategy-screen" style={{ backgroundImage: "url('/images/lobby.png')" }}>
            <button className="back-btn-global" onClick={handleBack}>
                <img src="/images/back.png" alt="Back" /> 
            </button>
            {!showSummary ? (
                //หน้ากรอกข้อมูล (แสดงถ้า showSummary เป็น false)
                <>
                    <div className="step-indicator">
                        Minion {currentIndex + 1} of {selectedIds.length}
                    </div>

                    <div className="main-board" style={{ backgroundImage: "url('/images/strategy.png')" }}>
                        <div className="char-section">
                            <div className="char-frame">
                                <img src={`/images/minion${currentMinionId}.png`} alt="Character" className="char-img" />
                            </div>
                        </div>

                        <div className="center-content">
                            <div className="name-header-area">
                                <img src="/images/Charactername.png" alt="Name Label" className="name-header-img" />
                                <div className="input-wrapper name-bg" style={{ backgroundImage: "url('/images/ช่อง.png')" }}>
                                    <input 
                                        type="text" 
                                        className="strat-input"
                                        value={charName}
                                        onChange={(e) => setCharName(e.target.value)}
                                        placeholder="Character Name"
                                    />
                                </div>
                            </div>

                            <div className="defense-area">
                                <div className="defense-header">
                                    <img src="/images/defensefactor.png" alt="Defense Factor" />
                                </div>
                                <div className="input-wrapper defense-bg" style={{ backgroundImage: "url('/images/กรอบข้อความ.png')" }}>
                                    <textarea 
                                        className="strat-textarea"
                                        value={defenseInfo}
                                        onChange={(e) => setDefenseInfo(e.target.value)}
                                        placeholder="Enter defensefactor here..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="stat-type-section">
                            <img src="/images/Stattype.png" alt="Stat Type" className="stat-label-img" />
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
                    </div>

                    <div className="record-container">
                        <button className="record-btn" onClick={handleRecordNext}>
                            <img src="/images/Record.png" alt="Record" />
                        </button>
                    </div>
                </>
            ) : (
                //หน้าสรุป (แสดงถ้า showSummary เป็น true)
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
                                        <div className="val-defense">{minion.strategy}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="final-start-btn" onClick={() => navigate('/start-duel', { state: { minions: allMinionData } })}>
                        <img src="/images/startgame.png" alt="Start Duel" />
                        <span className="btn-text"></span>
                    </button>
                </div>
            </div>
            )}
        </div>
    );
}

export default Strategyinput;