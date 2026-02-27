import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/room-selection.css'; // แยกไฟล์ CSS ออกมาเพื่อความสะอาด

function RoomSelection() {
    const navigate = useNavigate();

    return (
        <div className="room-selection-wrapper">
            {/* ปุ่ม Create Room */}
            <button 
                className="room-btn create-btn" 
                onClick={() => navigate('/create-room')}
            >
                <img 
                    src="/images/createroom.png" 
                    alt="Create Room" 
                    className="room-btn-img"
                />
            </button>

            {/* ปุ่ม Join Room */}
            <button 
                className="room-btn join-btn" 
                onClick={() => navigate('/join-room')}
            >
                <img 
                    src="/images/joinroom.png" 
                    alt="Join Room" 
                    className="room-btn-img"
                />
            </button>
        </div>
    );
}

export default RoomSelection;