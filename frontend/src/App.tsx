import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { PriceBoardPage } from './features/priceBoard/PriceBoardPage';
import { LotCreationPage } from './features/lotCreation/LotCreationPage';
import { LedgerPage } from './features/ledger/LedgerPage';
import { SafetyPage } from './features/safety/SafetyPage';

export const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-surface-bg text-stone-900 font-sans">
        <Navigation />
        <main>
          <Routes>
            <Route path="/" element={<PriceBoardPage />} />
            <Route path="/create-lot" element={<LotCreationPage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/safety" element={<SafetyPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
