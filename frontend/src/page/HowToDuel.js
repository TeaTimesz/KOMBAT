import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/how-to-play.css';

function HowToDuel() {
    const navigate = useNavigate();

    return (
        <div className="how-to-screen" style={{ backgroundImage: "url('/images/index.PNG')" }}>
            
            {/* ส่วนหัวข้อด้านบน (รูป How to Play:) */}
            <div className="header-box">
                <img 
                    src="/images/Howtoplay.png" 
                    alt="How to play header" 
                    className="how-to-header-img" 
                />
            </div>

            {/* ส่วนป้ายตรงกลางที่เป็นรูปภาพทั้งแผ่น */}
            <div className="tablet-box">
                <img 
                    src="/images/Howtoplayduel.png" 
                    alt="Duel Instructions Tablet" 
                    className="tablet-main-img" 
                />
            </div>

            {/* ปุ่ม Back และ Confirm ด้านล่าง */}
            <div className="navigation-footer">
                <button className="img-btn-footer" onClick={() => navigate('/select-mode')}>
                    <img src="/images/Back.png" alt="Back" />
                </button>
                <button className="img-btn-footer btn-confirm" onClick={() => navigate('/select-amount')}>
                    <img src="/images/confirm.png" alt="Confirm" />
                </button>
            </div>
        </div>
    );
}

export default HowToDuel;