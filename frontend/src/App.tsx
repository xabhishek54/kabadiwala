import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { PriceBoardPage } from './features/priceBoard/PriceBoardPage';
import { LotCreationPage } from './features/lotCreation/LotCreationPage';
import { RecyclerMatchPage } from './features/recyclerMatch/RecyclerMatchPage';
import { HandoverPage } from './features/handover/HandoverPage';
import { LedgerPage } from './features/ledger/LedgerPage';
import { SafetyPage } from './features/safety/SafetyPage';
import { RecyclerDashboardPage } from './features/recyclerMode/RecyclerDashboardPage';
import { MineralsImpactPage } from './features/minerals/MineralsImpactPage';
import { VerifyPage } from './features/verify/VerifyPage';

export const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-surface-bg text-stone-900 font-sans">
        <Navigation />
        <main>
          <Routes>
            <Route path="/" element={<PriceBoardPage />} />
            <Route path="/create-lot" element={<LotCreationPage />} />
            <Route path="/match/:lotId" element={<RecyclerMatchPage />} />
            <Route path="/handover/:lotId" element={<HandoverPage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/safety" element={<SafetyPage />} />
            <Route path="/recycler" element={<RecyclerDashboardPage />} />
            <Route path="/minerals" element={<MineralsImpactPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/verify/:identifier" element={<VerifyPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
