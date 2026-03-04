import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/join-room.css';

function Joinroom() {
    const navigate = useNavigate();
    const [inputCode, setInputCode] = useState(""); 

    const handleJoinClick = () => {
        if (inputCode.length === 6) {
            navigate('/status-room', { state: { roomCode: inputCode.toUpperCase() } });
        } else {
            alert("กรุณากรอกรหัสห้องให้ครบ 6 หลัก");
        }
    };

    return (
        <div className="join-screen" style={{ backgroundImage: "url('/images/lobby.png')" }}>
            {/* ป้าย JOIN ROOM ด้านบน */}
            <div className="header-container">
                <img src="/images/joinroomm.png" alt="Join Room" className="top-banner"  /> 
            </div>

            {/* กรอบป้ายใหญ่ */}
            <div className="gold-input-frame" style={{ backgroundImage: "url('/images/enterroomcode.png')" }}>
                <input 
                    type="text" 
                    className="room-input-field"
                    style={{ backgroundImage: "url('/images/ช่อง.png')" }} // เช็คชื่อไฟล์ให้ตรงกับในโฟลเดอร์ public/images
                    maxLength={6}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                />

                <div className="action-buttons">
                    <button className="btn-cancel" onClick={() => setInputCode("")}>
                        <img src="/images/cancel-btn.png" alt="Cancel" />
                    </button>
                    <button className="btn-join" onClick={handleJoinClick}>
                        <img src="/images/join-btn.png" alt="Join" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Joinroom;