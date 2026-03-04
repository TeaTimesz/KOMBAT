import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/code-room.css';

function Coderoom() {
    const navigate = useNavigate();
    const [roomCode, setRoomCode] = useState("");

    useEffect(() => {
        const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        setRoomCode(result);
    }, []);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(roomCode);
        alert("Copied to clipboard: " + roomCode);
    };

    return (
        <div className="create-screen" style={{ backgroundImage: "url('/images/lobby.png')" }}>
            
            {/* กรอบสีขาวโปร่งแสงกลางหน้าจอ */}
            <div className="white-glass-panel">
                
                {/* ป้าย CREATE ROOM ด้านบนสุด (ลอยทับขอบกรอบขาว) */}
                <div className="header-container">
                    <img src="/images/createroom.png" alt="Create Room" className="top-banner" />
                </div>

                {/* ตัวหนังสือ Room code */}
                <h2 className="room-text-label">Room code</h2>

                {/* แถบโชว์รหัส พร้อมปุ่ม COPY */}
                <div className="code-row-wrapper" style={{ backgroundImage: "url('/images/code_bg.png')" }}>
                    <span className="code-text">{roomCode}</span>
                    <button className="copy-action-btn" onClick={copyToClipboard}>
                        <img src="/images/coppy.png" alt="Copy" />
                    </button>
                </div>

                {/* ปุ่ม JOIN ROOM ด้านล่างสุด (ลอยทับขอบกรอบขาว) */}
                <button className="join-action-btn" onClick={() => navigate('/join-room', { state: { roomCode: roomCode } })}>
                    <img src="/images/joinroom2.png" alt="Join Room" />
                </button>

            </div>
            
        </div>
    );
}

export default Coderoom;