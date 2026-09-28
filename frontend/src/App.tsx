import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { HomePage } from './features/home/HomePage';
import { PriceBoardPage } from './features/priceBoard/PriceBoardPage';
import { LotCreationPage } from './features/lotCreation/LotCreationPage';
import { RecyclerMatchPage } from './features/recyclerMatch/RecyclerMatchPage';
import { HandoverPage } from './features/handover/HandoverPage';
import { LedgerPage } from './features/ledger/LedgerPage';
import { LotsPage } from './features/lots/LotsPage';
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

const AUTH_ROUTES = ['/login', '/onboarding'];

const RequireRole: React.FC<{ allowedRoles: string[]; children: React.ReactNode }> = ({ allowedRoles, children }) => {
  const userStr = localStorage.getItem('kabadiwala_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.role || 'collector';
  if (!allowedRoles.includes(role)) {
    return <Navigate to={role === 'recycler' ? '/recycler' : '/home'} replace />;
  }
  return <>{children}</>;
};

const AppLayout: React.FC = () => {
  const location = useLocation();
  const isAuthRoute = AUTH_ROUTES.some(r => location.pathname.startsWith(r));
  const hasUser = Boolean(localStorage.getItem('kabadiwala_user'));

  // Redirect unauthenticated users to login
  if (!hasUser && !isAuthRoute) {
    return <Navigate to="/login" replace />;
  }

  // Auth pages: full screen, no nav
  if (isAuthRoute) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<CollectorOnboardingPage />} />
        <Route path="/onboarding/collector" element={<CollectorOnboardingPage />} />
        <Route path="/onboarding/recycler" element={<RecyclerOnboardingPage />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout bg-[#F5F7F5] text-stone-900 min-h-screen">
      {/* Sidebar (desktop) + Top bar + Bottom nav (mobile) */}
      <Navigation />

      {/* Main content area — offset by sidebar on desktop, padded for bottom nav on mobile */}
      <main className="main-content bg-[#F5F7F5] text-stone-900 min-h-screen overflow-x-hidden">
        <Routes>
          {/* Home — dedicated dashboard with quick-access */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />

          {/* Collector routes */}
          <Route path="/prices" element={<PriceBoardPage />} />
          <Route path="/lots" element={<LotsPage />} />
          <Route path="/create-lot" element={<LotCreationPage />} />
          <Route path="/match/:lotId" element={<RecyclerMatchPage />} />
          <Route path="/handover/:lotId" element={<HandoverPage />} />
          <Route path="/ledger" element={<LedgerPage />} />
          <Route path="/recyclers" element={<RecyclerMatchPage />} />
          <Route path="/safety" element={<SafetyPage />} />
          <Route path="/minerals" element={<MineralsImpactPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/verify/:identifier" element={<VerifyPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Recycler / Admin routes with role protection */}
          <Route path="/recycler" element={<RequireRole allowedRoles={['recycler']}><RecyclerDashboardPage /></RequireRole>} />
          <Route path="/recycler/rates" element={<RequireRole allowedRoles={['recycler']}><RecyclerRatesPage /></RequireRole>} />
          <Route path="/admin/anomalies" element={<RequireRole allowedRoles={['recycler', 'admin']}><AnomalyPage /></RequireRole>} />

          {/* Legacy redirect for old "/" price board route */}
          <Route path="/price-board" element={<PriceBoardPage />} />
        </Routes>
      </main>
    </div>
  );
};

export const App: React.FC = () => (
  <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AppLayout />
  </Router>
);

export default App;
