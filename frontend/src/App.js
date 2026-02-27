import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './page/Home';
import SelectMode from './page/SelectMode';
import HowToDuel from './page/HowToDuel'; 
import HowtoSolitaire from './page/HowtoSolitaire';
import HowtoAuto from './page/HowtoAuto';
import SelectAmount from './page/Selectamount';
import CreateMinion from './page/CreateMinion';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/select-mode" element={<SelectMode />} />
        <Route path="/how-to-duel" element={<HowToDuel />} />
        <Route path="/how-to-auto" element={<HowtoAuto />} />
        <Route path="/how-to-solitaire" element={<HowtoSolitaire />} />
        <Route path="/select-amount" element={<SelectAmount />} />
        
        <Route path="/create-minion" element={<CreateMinion />} />
      </Routes>
    </Router>
  );
}

export default App;