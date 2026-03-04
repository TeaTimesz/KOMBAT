import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/code-room.css';

function JoinRoom() {
    const navigate = useNavigate();
    const [roomCode, setRoomCode] = useState("------");

    
    const handleJoin = () => {
        navigate('/ready-room', { state: { code: roomCode } });
    };

    return (
        <div className="join-screen" style={{ backgroundImage: "url('/images/lobby.png')" }}>
            
            <div className="main-panel" style={{ backgroundImage: "url('/images/enterroomcode.png')" }}>
                
                {/* 1. รูปป้าย JOIN ROOM (ป้ายบนสุด) */}
                <img src="/images/header_join_room.png" alt="Join Room" className="header-label" />


                {/* 3. ช่องสุ่มโค้ด (คลิกที่ช่องเพื่อสุ่มใหม่ได้) */}
                <div className="code-box" 
                     style={{ backgroundImage: "url('/images/entercode.png')" }}
                     onClick={generateCode}>
                    <span className="code-text">{roomCode}</span>
                </div>

                {/* 4. กลุ่มปุ่ม Cancel และ Join */}
                <div className="button-footer">
                    <button className="img-btn" onClick={() => navigate(-1)}>
                        <img src="/images/cancel-btn.png" alt="Cancel" />
                    </button>
                    
                    <button className="img-btn" onClick={handleJoin}>
                        <img src="/images/join-btn.png" alt="Join" />
                    </button>
                </div>

            </div>
        </div>
    );
}

export default JoinRoom;