import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home, LayoutDashboard, Package, IndianRupee, MapPin, ShieldAlert, User,
  WifiOff, Factory, Tag, BookOpen, Search, ChevronDown, Leaf
} from 'lucide-react';

export const Navigation: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [user, setUser] = useState<{ name: string; role: string; id?: string } | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkUser = () => {
      const raw = localStorage.getItem('kabadiwala_user');
      try { setUser(raw ? JSON.parse(raw) : null); } catch { setUser(null); }
    };
    checkUser();
    window.addEventListener('storage', checkUser);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', checkUser);
    };
  }, []);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('kabadiwala_lang', lang);
  };

  const isRecycler = user?.role === 'recycler';

  const collectorNavItems = [
    { to: '/home', label: t('nav.home'), icon: Home, end: true },
    { to: '/lots', label: t('nav.lots'), icon: Package },
    { to: '/prices', label: t('nav.prices'), icon: IndianRupee },
    { to: '/recyclers', label: t('nav.recyclers'), icon: Search },
    { to: '/ledger', label: t('nav.ledger'), icon: IndianRupee },
    { to: '/safety', label: t('nav.safety'), icon: ShieldAlert },
    { to: '/profile', label: t('nav.profile'), icon: User },
  ];

  const recyclerNavItems = [
    { to: '/recycler', label: t('nav.dashboard'), icon: LayoutDashboard, end: true },
    { to: '/recycler/rates', label: t('nav.buyingRates'), icon: Tag },
    { to: '/admin/anomalies', label: t('nav.safetyAlerts'), icon: ShieldAlert },
    { to: '/minerals', label: t('nav.mineralRecovery'), icon: Factory },
    { to: '/verify', label: t('nav.traceability'), icon: BookOpen },
    { to: '/profile', label: t('nav.facilityProfile'), icon: User },
  ];

  const collectorBottomTabs = [
    { to: '/home', label: t('nav.home'), icon: Home, end: true },
    { to: '/lots', label: t('nav.lots'), icon: Package },
    { to: '/recyclers', label: t('nav.recyclers'), icon: MapPin },
    { to: '/profile', label: t('nav.profile'), icon: User },
  ];

  const recyclerBottomTabs = [
    { to: '/recycler', label: t('nav.dashboard'), icon: Factory, end: true },
    { to: '/recycler/queue', label: t('nav.incomingWaste'), icon: Package },
    { to: '/admin/anomalies', label: t('nav.safetyAlerts'), icon: ShieldAlert },
    { to: '/profile', label: t('nav.profile'), icon: User },
  ];

  const navItems = isRecycler ? recyclerNavItems : collectorNavItems;
  const bottomTabs = isRecycler ? recyclerBottomTabs : collectorBottomTabs;

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="sidebar">
        <div>
          {/* Logo Section */}
          <div className="flex items-center gap-3 px-5 py-6">
            <div className="w-10 h-10 rounded-full bg-[#16A34A] flex items-center justify-center text-white shrink-0 shadow-md">
              <Leaf size={22} className="fill-white" />
            </div>
            <div className="min-w-0">
              <div className="text-white font-extrabold text-base leading-tight truncate tracking-tight">EcoRecycle India</div>
              <div className="text-emerald-300/80 text-[11px] font-medium truncate">Kabadiwala Connect</div>
            </div>
          </div>

          {/* Offline warning if applicable */}
          {isOffline && (
            <div className="mx-4 mb-3 flex items-center gap-1.5 bg-amber-500/20 text-amber-300 text-[11px] font-semibold px-3 py-1.5 rounded-xl border border-amber-500/30">
              <WifiOff size={12} />
              <span>Offline Mode</span>
            </div>
          )}

          {/* Main Nav Links */}
          <nav className="px-3 py-2 space-y-1">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-[#16A34A] text-white shadow-md'
                      : 'text-stone-300 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <Icon size={18} className="shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Language Selector */}
        <div className="p-4 border-t border-white/10">
          <div className="relative">
            <select
              value={i18n.language}
              onChange={e => changeLanguage(e.target.value)}
              className="w-full bg-[#143628] hover:bg-white/10 border border-white/20 text-stone-200 text-xs font-bold rounded-xl px-3 py-2.5 appearance-none focus:outline-none cursor-pointer flex items-center justify-between"
            >
              <option value="hi" className="bg-[#1B3A2D] text-white">🌐 हिंदी</option>
              <option value="en" className="bg-[#1B3A2D] text-white">🌐 English</option>
              <option value="mr" className="bg-[#1B3A2D] text-white">🌐 मराठी</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-3 text-stone-400 pointer-events-none" />
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAV */}
      <nav className="bottom-nav">
        <div className="grid grid-cols-4 h-full w-full max-w-md mx-auto items-center">
          {bottomTabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1.5 transition-colors ${
                  isActive ? 'text-[#16A34A] font-bold' : 'text-stone-400 font-semibold hover:text-stone-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} className={isActive ? 'text-[#16A34A]' : 'text-stone-400'} />
                  <span className="text-[10px] mt-0.5 leading-none">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
};
