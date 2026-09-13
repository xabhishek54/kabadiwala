import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IndianRupee, PlusCircle, BookOpen, ShieldAlert, WifiOff, Globe } from 'lucide-react';

export const Navigation: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('kabadiwala_lang', lang);
  };

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-surface-card border-b border-surface-border px-4 py-3 shadow-soft flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            K
          </div>
          <div>
            <h1 className="font-bold text-stone-900 text-base leading-tight">{t('appName')}</h1>
            <p className="text-xs text-stone-500 font-medium">{t('tagline')}</p>
          </div>
        </div>

        {/* Language Switcher */}
        <div className="flex items-center space-x-1 bg-surface-muted p-1 rounded-xl border border-stone-200">
          <Globe size={14} className="text-stone-500 ml-1.5 mr-0.5" />
          <button
            type="button"
            onClick={() => changeLanguage('hi')}
            className={`px-2 py-1 text-xs font-semibold rounded-lg transition-colors ${
              i18n.language === 'hi' ? 'bg-brand-600 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            हिंदी
          </button>
          <button
            type="button"
            onClick={() => changeLanguage('mr')}
            className={`px-2 py-1 text-xs font-semibold rounded-lg transition-colors ${
              i18n.language === 'mr' ? 'bg-brand-600 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            मराठी
          </button>
          <button
            type="button"
            onClick={() => changeLanguage('en')}
            className={`px-2 py-1 text-xs font-semibold rounded-lg transition-colors ${
              i18n.language === 'en' ? 'bg-brand-600 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            EN
          </button>
        </div>
      </header>

      {/* Offline Status Indicator Banner */}
      {isOffline && (
        <div className="bg-amber-500 text-white text-xs font-semibold px-4 py-1.5 flex items-center justify-center space-x-2 shadow-inner">
          <WifiOff size={14} />
          <span>ऑफलाइन मोड — डेटा लोकल सुरक्षित है (Offline Mode)</span>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface-card border-t border-surface-border shadow-elevated px-2 py-2">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-600 font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`
            }
          >
            <IndianRupee size={22} />
            <span className="text-[11px] mt-1 font-medium">{t('nav.prices')}</span>
          </NavLink>

          <NavLink
            to="/create-lot"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-600 font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`
            }
          >
            <PlusCircle size={22} />
            <span className="text-[11px] mt-1 font-medium">{t('nav.createLot')}</span>
          </NavLink>

          <NavLink
            to="/ledger"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-600 font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`
            }
          >
            <BookOpen size={22} />
            <span className="text-[11px] mt-1 font-medium">{t('nav.ledger')}</span>
          </NavLink>

          <NavLink
            to="/safety"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-600 font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`
            }
          >
            <ShieldAlert size={22} />
            <span className="text-[11px] mt-1 font-medium">{t('nav.safety')}</span>
          </NavLink>
        </div>
      </nav>
    </>
  );
};
