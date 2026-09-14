import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
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
import { ProfilePage } from './features/profile/ProfilePage';
import { LoginPage } from './features/auth/LoginPage';
import { AnomalyPage } from './features/admin/AnomalyPage';

import { CollectorOnboardingPage } from './features/auth/CollectorOnboardingPage';
import { RecyclerOnboardingPage } from './features/auth/RecyclerOnboardingPage';
import { RecyclerRatesPage } from './features/recyclerMode/RecyclerRatesPage';

const AppLayout: React.FC = () => {
  const location = useLocation();
  const isAuthRoute = location.pathname === '/login' || location.pathname.startsWith('/onboarding');
  const hasUser = Boolean(localStorage.getItem('kabadiwala_user'));

  if (!hasUser && !isAuthRoute) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-surface-bg text-stone-900 font-sans overflow-x-hidden w-full max-w-full">
      {!isAuthRoute && <Navigation />}
      <main className="overflow-x-hidden w-full max-w-full">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboarding" element={<CollectorOnboardingPage />} />
          <Route path="/onboarding/collector" element={<CollectorOnboardingPage />} />
          <Route path="/onboarding/recycler" element={<RecyclerOnboardingPage />} />
          <Route path="/" element={<PriceBoardPage />} />
          <Route path="/create-lot" element={<LotCreationPage />} />
          <Route path="/match/:lotId" element={<RecyclerMatchPage />} />
          <Route path="/handover/:lotId" element={<HandoverPage />} />
          <Route path="/ledger" element={<LedgerPage />} />
          <Route path="/safety" element={<SafetyPage />} />
          <Route path="/recycler" element={<RecyclerDashboardPage />} />
          <Route path="/recycler/rates" element={<RecyclerRatesPage />} />
          <Route path="/minerals" element={<MineralsImpactPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/verify/:identifier" element={<VerifyPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin/anomalies" element={<AnomalyPage />} />
        </Routes>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppLayout />
    </Router>
  );
};

export default App;
