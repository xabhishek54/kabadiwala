import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
const PriceBoardPage = React.lazy(() => import('./features/priceBoard/PriceBoardPage').then((module) => ({ default: module.PriceBoardPage })));
const LotCreationPage = React.lazy(() => import('./features/lotCreation/LotCreationPage').then((module) => ({ default: module.LotCreationPage })));
const RecyclerMatchPage = React.lazy(() => import('./features/recyclerMatch/RecyclerMatchPage').then((module) => ({ default: module.RecyclerMatchPage })));
const HandoverPage = React.lazy(() => import('./features/handover/HandoverPage').then((module) => ({ default: module.HandoverPage })));
const LedgerPage = React.lazy(() => import('./features/ledger/LedgerPage').then((module) => ({ default: module.LedgerPage })));
const SafetyPage = React.lazy(() => import('./features/safety/SafetyPage').then((module) => ({ default: module.SafetyPage })));
const RecyclerDashboardPage = React.lazy(() => import('./features/recyclerMode/RecyclerDashboardPage').then((module) => ({ default: module.RecyclerDashboardPage })));
const MineralsImpactPage = React.lazy(() => import('./features/minerals/MineralsImpactPage').then((module) => ({ default: module.MineralsImpactPage })));
const VerifyPage = React.lazy(() => import('./features/verify/VerifyPage').then((module) => ({ default: module.VerifyPage })));
const ProfilePage = React.lazy(() => import('./features/profile/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const LoginPage = React.lazy(() => import('./features/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const AnomalyPage = React.lazy(() => import('./features/admin/AnomalyPage').then((module) => ({ default: module.AnomalyPage })));
const CollectorOnboardingPage = React.lazy(() => import('./features/auth/CollectorOnboardingPage').then((module) => ({ default: module.CollectorOnboardingPage })));
const RecyclerOnboardingPage = React.lazy(() => import('./features/auth/RecyclerOnboardingPage').then((module) => ({ default: module.RecyclerOnboardingPage })));
const RecyclerRatesPage = React.lazy(() => import('./features/recyclerMode/RecyclerRatesPage').then((module) => ({ default: module.RecyclerRatesPage })));

const AppLayout: React.FC = () => {
  const location = useLocation();
  const isAuthRoute = location.pathname === '/login' || location.pathname.startsWith('/onboarding');
  const isPublicRoute = location.pathname === '/verify' || location.pathname.startsWith('/verify/');
  const hasUser = Boolean(window.localStorage?.getItem('kabadiwala_user'));

  if (!hasUser && !isAuthRoute && !isPublicRoute) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-surface-bg text-stone-900 font-sans overflow-x-hidden w-full max-w-full">
      {hasUser && !isAuthRoute && <Navigation />}
      <main className="overflow-x-hidden w-full max-w-full">
        <React.Suspense
          fallback={
            <div className="mx-auto flex min-h-[40vh] max-w-md items-center justify-center p-6 text-sm font-semibold text-stone-600" role="status">
              Loading…
            </div>
          }
        >
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
        </React.Suspense>
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
