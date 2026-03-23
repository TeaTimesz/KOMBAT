import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../css/create-minion.css'; 

function CreateMinion() {
    const location = useLocation();
    const navigate = useNavigate();
    
    const amount = location.state?.amount || 1;
    const mode = location.state?.mode || 'DUEL';

    const [selectedMinions, setSelectedMinions] = useState([]);

    const minions = [
        { id: 1, img: '/images/minion1.png', name: 'Scholar' },
        { id: 2, img: '/images/minion2.png', name: 'Detective' },
        { id: 3, img: '/images/minion3.png', name: 'Classic' },
        { id: 4, img: '/images/minion4.png', name: 'Rockstar' },
        { id: 5, img: '/images/minion5.png', name: 'Knight' }
    ];

    // ฟังก์ชันเมื่อคลิกที่ตัวมินเนี่ยน
    const handleSelect = (id) => {
        if (selectedMinions.includes(id)) {
            setSelectedMinions(selectedMinions.filter(item => item !== id));
        } else {

            if (selectedMinions.length < amount) {
                setSelectedMinions([...selectedMinions, id]);
            } else {
                alert(`You can only select ${amount} minions!`);
            }
        }
    };

    const handleConfirm = () => {
        if (selectedMinions.length === amount) {
            navigate('/strategy-input', { state: { selectedIds: selectedMinions, mode } });
        } else {
            alert(`Please select exactly ${amount} minions before confirming.`);
        }
    };

    return (
        <div className="select-amount-screen" style={{ backgroundImage: "url('/images/index.PNG')" }}>
            <div className="overlay-box">
                <h1 className="select-title">Create Minion</h1>
                <p style={{ fontFamily: 'Henny Penny', color: '#4a3728' }}>
                    Select {amount} Minions ({selectedMinions.length}/{amount})
                </p>
                
                <div className="card-container">
                    {minions.map((minion) => (
                        <div 
                            key={minion.id} 
                        
                            className={`amount-card ${selectedMinions.includes(minion.id) ? 'selected' : ''}`} 
                            onClick={() => handleSelect(minion.id)}
                        >
                            <div className="leaf-content">
                                <img src={minion.img} alt={minion.name} className="leaf-img" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="navigation-footer">
                <button className="img-btn-footer btn-back" onClick={() => navigate(-1)}>
                    <img src="/images/back.png" alt="Back" />
                </button>
                
                <button 
                    className={`img-btn-footer btn-confirm ${selectedMinions.length !== amount ? 'disabled' : ''}`} 
                    onClick={handleConfirm}
                >
                    <img src="/images/confirm.png" alt="Confirm" />
                </button>
            </div>
        </div>
    );
}

export default CreateMinion;