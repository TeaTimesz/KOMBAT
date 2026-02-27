import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../css/setup-minions.css'; // สร้างไฟล์ CSS สำหรับจัดหน้า

function SetupMinions() {
    const location = useLocation();
    const navigate = useNavigate();
    const selectedIds = location.state?.selectedIds || [];

    // ดึงข้อมูลมินเนี่ยนทั้งหมดเพื่อหาข้อมูลรูปภาพตาม ID ที่เลือกมา
    const allMinions = [
        { id: 1, img: '/images/minion1.png' },
        { id: 2, img: '/images/minion2.png' },
        { id: 3, img: '/images/minion3.png' },
        { id: 4, img: '/images/minion4.png' },
        { id: 5, img: '/images/minion5.png' }
    ];

    // สร้าง State สำหรับเก็บข้อมูลที่กรอกของแต่ละตัว
    const [minionConfigs, setMinionConfigs] = useState(
        selectedIds.map(id => ({ id, name: '', strategy: 'Balanced' }))
    );

    const updateConfig = (index, field, value) => {
        const newConfigs = [...minionConfigs];
        newConfigs[index][field] = value;
        setMinionConfigs(newConfigs);
    };

    return (
        <div className="setup-screen" style={{ backgroundImage: "url('/images/index.PNG')" }}>
            <div className="strategy-scroll-container">
                {minionConfigs.map((config, index) => {
                    const minionData = allMinions.find(m => m.id === config.id);
                    return (
                        <div key={index} className="strategy-card">
                            <h2 className="minion-label">Minion {index + 1}</h2>
                            <div className="strategy-form-box">
                                <div className="minion-preview">
                                    <img src={minionData.img} alt="Minion" />
                                </div>
                                <div className="input-group">
                                    <label>Character name:</label>
                                    <input 
                                        type="text" 
                                        value={config.name}
                                        onChange={(e) => updateConfig(index, 'name', e.target.value)}
                                        placeholder="Enter name..."
                                    />
                                    
                                    <div className="strategy-options">
                                        <button 
                                            className={config.strategy === 'Defense' ? 'active' : ''}
                                            onClick={() => updateConfig(index, 'strategy', 'Defense')}
                                        >Defense</button>
                                        <button 
                                            className={config.strategy === 'Attack' ? 'active' : ''}
                                            onClick={() => updateConfig(index, 'strategy', 'Attack')}
                                        >Attack</button>
                                        <button 
                                            className={config.strategy === 'Balanced' ? 'active' : ''}
                                            onClick={() => updateConfig(index, 'strategy', 'Balanced')}
                                        >Balanced</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="footer-actions">
                <button className="record-btn" onClick={() => navigate('/game-start', { state: { finalConfig: minionConfigs } })}>
                    <img src="/images/record_btn.png" alt="Record" />
                </button>
            </div>
        </div>
    );
}

export default SetupMinions;