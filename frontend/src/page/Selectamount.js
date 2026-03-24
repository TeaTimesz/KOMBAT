import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/select-amount.css';

function SelectAmount() {
    const navigate = useNavigate();
    const [selectedAmount, setSelectedAmount] = useState(null);

    const leafOptions = [
        { id: 1, img: '/images/1.png' },
        { id: 2, img: '/images/2.png' },
        { id: 3, img: '/images/3.png' },
        { id: 4, img: '/images/4.png' },
        { id: 5, img: '/images/5.png' }
    ];

    const handleConfirm = () => {
    if (selectedAmount) {
        navigate('/create-minion', { state: { amount: selectedAmount } });
    } else {
        alert("Please select an amount first!");
    }
};

    return (
        <div className="select-amount-screen" style={{ backgroundImage: "url('/images/index.PNG')" }}>
            <div className="overlay-box">
                <h1 className="select-title">Select Amount</h1>
                
                <div className="card-container">
                    {leafOptions.map((item) => (
                        <div 
                            key={item.id} 
                
                            className={`amount-card ${selectedAmount === item.id ? 'selected' : ''}`} 
                            onClick={() => setSelectedAmount(item.id)}
                        >
                    
                        
                            <div className="leaf-content">
                                <img src={item.img} alt={`Leaf ${item.id}`} className="leaf-img" />
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
                    className={`img-btn-footer btn-confirm  ${!selectedAmount ? 'disabled' : ''}`} 
                    onClick={handleConfirm}
                >
                    <img src="/images/confirm.png" alt="Confirm" />
                </button>
            </div>
        </div>
    );
}

export default SelectAmount;