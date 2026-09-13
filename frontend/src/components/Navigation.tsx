import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IndianRupee, PlusCircle, BookOpen, ShieldAlert, WifiOff, Globe, Factory, User } from 'lucide-react';

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
      <header className="sticky top-0 z-40 bg-surface-card border-b border-surface-border px-3.5 py-2.5 shadow-soft flex items-center justify-between max-w-md mx-auto sm:max-w-none">
        <div className="flex items-center space-x-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold text-base shadow-sm">
            K
          </div>
          <div>
            <h1 className="font-bold text-stone-900 text-sm sm:text-base leading-tight">{t('appName')}</h1>
            <p className="text-[10px] text-stone-500 font-medium hidden xs:block">{t('tagline')}</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Profile & Shop Account Link */}
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `tap-target p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-bold flex items-center space-x-1 border transition-colors ${
                isActive
                  ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border-stone-300'
              }`
            }
          >
            <User size={15} />
            <span className="hidden md:inline">Account</span>
          </NavLink>

          {/* Recycler Portal Switcher Link */}
          <NavLink
            to="/recycler"
            className={({ isActive }) =>
              `tap-target p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-bold flex items-center space-x-1 border transition-colors ${
                isActive
                  ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border-stone-300'
              }`
            }
          >
            <Factory size={15} />
            <span className="hidden md:inline">Recycler Portal</span>
          </NavLink>

          {/* Language Switcher */}
          <div className="flex items-center space-x-0.5 bg-surface-muted p-0.5 rounded-xl border border-stone-200 text-[11px]">
            <Globe size={13} className="text-stone-500 ml-1 mr-0.5 hidden xs:block" />
            <button
              type="button"
              onClick={() => changeLanguage('hi')}
              className={`px-1.5 py-0.5 font-bold rounded-lg transition-colors ${
                i18n.language === 'hi' ? 'bg-brand-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              हिं
            </button>
            <button
              type="button"
              onClick={() => changeLanguage('mr')}
              className={`px-1.5 py-0.5 font-bold rounded-lg transition-colors ${
                i18n.language === 'mr' ? 'bg-brand-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              म
            </button>
            <button
              type="button"
              onClick={() => changeLanguage('en')}
              className={`px-1.5 py-0.5 font-bold rounded-lg transition-colors ${
                i18n.language === 'en' ? 'bg-brand-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              EN
            </button>
          </div>
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface-card border-t border-surface-border shadow-elevated px-2 py-1.5">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-0.5">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-600 font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`
            }
          >
            <IndianRupee size={20} />
            <span className="text-[10px] mt-0.5 font-medium">{t('nav.prices')}</span>
          </NavLink>

          <NavLink
            to="/create-lot"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-600 font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`
            }
          >
            <PlusCircle size={20} />
            <span className="text-[10px] mt-0.5 font-medium">{t('nav.createLot')}</span>
          </NavLink>

          <NavLink
            to="/ledger"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-600 font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`
            }
          >
            <BookOpen size={20} />
            <span className="text-[10px] mt-0.5 font-medium">{t('nav.ledger')}</span>
          </NavLink>

          <NavLink
            to="/safety"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-600 font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`
            }
          >
            <ShieldAlert size={20} />
            <span className="text-[10px] mt-0.5 font-medium">{t('nav.safety')}</span>
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-600 font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`
            }
          >
            <User size={20} />
            <span className="text-[10px] mt-0.5 font-medium">Profile</span>
          </NavLink>
        </div>
      </nav>
    </>
  );
};
