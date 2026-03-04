import React, { useState } from 'react';
import '../css/hexgrid.css';

const P1_CHARS = [
    { id: 'p1_1', img: '/images/p1_1.png' }, // รูปตัวละคร P1 ตัวที่ 1
    { id: 'p1_2', img: '/images/p1_2.png' }, // รูปตัวละคร P1 ตัวที่ 2
    { id: 'p1_3', img: '/images/p1_3.png' }, // รูปตัวละคร P1 ตัวที่ 3
    { id: 'p1_4', img: '/images/p1_4.png' }, // รูปตัวละคร P1 ตัวที่ 4
    { id: 'p1_5', img: '/images/p1_5.png' }, // รูปตัวละคร P1 ตัวที่ 5
];

const P2_CHARS = [
    { id: 'p2_1', img: '/images/p2_1.png' }, // รูปตัวละคร P2 ตัวที่ 1
    { id: 'p2_2', img: '/images/p2_2.png' }, // รูปตัวละคร P2 ตัวที่ 2
    { id: 'p2_3', img: '/images/p2_3.png' }, // รูปตัวละคร P2 ตัวที่ 3
    { id: 'p2_4', img: '/images/p2_4.png' }, // รูปตัวละคร P2 ตัวที่ 4
    { id: 'p2_5', img: '/images/p2_5.png' }, // รูปตัวละคร P2 ตัวที่ 5
];

const P1_SPAWN_ZONE = ["0-0", "0-1", "1-0", "1-1", "2-0"];
const P2_SPAWN_ZONE = ["6-7", "7-6", "7-7", "5-7", "6-6"];

const TopBar = () => (
    <header className="top-bar">
        <div className="player-stats p1-stats">
            <div className="player-name">Player 1</div>
            <div className="stats-info">
                <div className="stat-item"><div className="icon hex-icon p1-color"></div><span>Spawns<br/><b>20</b></span></div>
                <div className="stat-item"><div className="icon coin-icon"></div><span>Budget<br/><b>1000</b></span></div>
            </div>
        </div>
        <button className="end-turn-btn">END TURN</button>
        <div className="player-stats p2-stats">
            <div className="player-name">Player 2</div>
            <div className="stats-info">
                <div className="stat-item"><div className="icon hex-icon p2-color"></div><span>Spawns<br/><b>20</b></span></div>
                <div className="stat-item"><div className="icon coin-icon"></div><span>Budget<br/><b>1000</b></span></div>
            </div>
        </div>
    </header>
);

const Sidebar = ({ player, characters, selectedChar, onSelectChar }) => {
    const slotClass = player === 'p1' ? 'p1-slot' : 'p2-slot';
    return (
        <aside className="character-sidebar gold-frame">
            {characters.map((char) => (
                <div
                    key={char.id}
                    className={`char-slot ${slotClass} ${selectedChar?.id === char.id ? 'selected' : ''}`}
                    onClick={() => onSelectChar(selectedChar?.id === char.id ? null : char)}
                >
                    {char.img && <img src={char.img} alt={char.id} />}
                </div>
            ))}
        </aside>
    );
};

const HexGrid = ({ boardData, onHexClick }) => {
    const cols = 8; const rows = 8; const R = 40;
    const hexWidth = 2 * R; const hexHeight = Math.sqrt(3) * R;
    const colSpacing = 1.5 * R; const rowSpacing = hexHeight;
    const hexes = [];

    for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
            let x = col * colSpacing; let y = row * rowSpacing;
            if (col % 2 !== 1) y += hexHeight / 2;

            const positionKey = `${col}-${row}`;

            let zoneClass = "";
            if (P1_SPAWN_ZONE.includes(positionKey)) zoneClass = "p1-zone";
            if (P2_SPAWN_ZONE.includes(positionKey)) zoneClass = "p2-zone";

            const placedChar = boardData[positionKey];

            hexes.push(
                <div
                    key={positionKey}
                    className={`hex ${zoneClass}`}
                    style={{ width: `${hexWidth}px`, height: `${hexHeight}px`, left: `${x}px`, top: `${y}px` }}
                    onClick={() => onHexClick(positionKey)}
                >
                    <div className="hex-inner">
                        {placedChar && (
                            <div className="placed-character" style={{ backgroundImage: `url(${placedChar.img})` }}></div>
                        )}
                    </div>
                </div>
            );
        }
    }

    const boardWidth = (cols - 1) * colSpacing + hexWidth;
    const boardHeight = (rows - 1) * rowSpacing + hexHeight + (hexHeight / 2);

    return (
        <div className="board-container gold-frame">
            <div className="hex-grid" style={{ width: `${boardWidth}px`, height: `${boardHeight}px` }}>
                {hexes}
            </div>
        </div>
    );
};

export default function App() {
    const [selectedChar, setSelectedChar] = useState(null);
    const [boardData, setBoardData] = useState({});

    const handleHexClick = (position) => {
        if (!selectedChar) {
            if (boardData[position]) {
                const newData = { ...boardData };
                delete newData[position];
                setBoardData(newData);
            }
            return;
        }

        const isP1 = selectedChar.id.startsWith('p1');
        if (isP1 && !P1_SPAWN_ZONE.includes(position)) {
            alert("Player 1 ต้องลงในโซนสีน้ำเงินเท่านั้น!"); return;
        }
        const isP2 = selectedChar.id.startsWith('p2');
        if (isP2 && !P2_SPAWN_ZONE.includes(position)) {
            alert("Player 2 ต้องลงในโซนสีแดงเท่านั้น!"); return;
        }

        setBoardData(prev => ({ ...prev, [position]: selectedChar }));
        setSelectedChar(null);
    };

    return (
        <div className="game-container">
            <TopBar />
            <main className="main-area">
                <Sidebar player="p1" characters={P1_CHARS} selectedChar={selectedChar} onSelectChar={setSelectedChar} />
                <HexGrid boardData={boardData} onHexClick={handleHexClick} />
                <Sidebar player="p2" characters={P2_CHARS} selectedChar={selectedChar} onSelectChar={setSelectedChar} />
            </main>
        </div>
    );
}