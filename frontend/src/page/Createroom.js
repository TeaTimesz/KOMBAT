import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/create-room.css'; 

function Createroom() {
    const navigate = useNavigate();

    const handleCreateRoom = () => {
        console.log("กำลังสร้างห้อง...");
        navigate('/code-room'); 
    };

    const handleJoinRoom = () => {
        console.log("กำลังเข้าร่วมห้อง...");
        navigate('/join-room');    
    };

    return (
        <div className="menu-screen" style={{ backgroundImage: "url('/images/lobby.png')" }}>
            <div className="game-logo">
                <img src="/images/kombat2.png" alt="KOMBAT" style={{ width: '700px' }} />
            </div>

            <div className="button-group">
                <button className="kombat-btn" onClick={handleCreateRoom}>
                    <img src="/images/create-room.png" alt="Create Room" />
                </button>

                <button className="kombat-btn" onClick={handleJoinRoom}>
                    <img src="/images/join-room.png" alt="Join Room" />
                </button>
            </div>
        </div>
    );
}

export default Createroom;