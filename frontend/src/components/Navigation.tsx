import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IndianRupee, PlusCircle, BookOpen, ShieldAlert, WifiOff, Globe, Factory, User, LogOut, MapPin, Tag } from 'lucide-react';

export const Navigation: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [district, setDistrict] = useState<string>(
    localStorage.getItem('kabadiwala_district') || 'Pune'
  );

  const districts = ['Pune', 'Pimpri-Chinchwad', 'Mumbai', 'Thane', 'Nagpur', 'Nashik'];

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkUser = () => {
      const raw = localStorage.getItem('kabadiwala_user');
      if (raw) {
        try { setUser(JSON.parse(raw)); } catch { setUser(null); }
      } else {
        setUser(null);
      }
      const savedDist = localStorage.getItem('kabadiwala_district');
      if (savedDist) setDistrict(savedDist);
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

  const handleDistrictChange = (d: string) => {
    setDistrict(d);
    localStorage.setItem('kabadiwala_district', d);
    window.dispatchEvent(new Event('district_changed'));
  };

  const handleLogout = () => {
    localStorage.removeItem('kabadiwala_user');
    window.location.href = '/login';
  };

  const isRecycler = user?.role === 'recycler';

  return (
    <>
      {/* Top Header - Fixed & Desktop Responsive */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-4 h-14 flex items-center shadow-xs shrink-0">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
          {/* Logo Icon Only */}
          <NavLink to={isRecycler ? "/recycler" : "/"} className="flex items-center space-x-2 shrink-0 group" title={isRecycler ? 'Recycler Hub' : 'Kabadiwala Connect'}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm transition-transform group-hover:scale-105 ${
              isRecycler ? 'bg-stone-900' : 'bg-brand-600'
            }`}>
              {isRecycler ? <Factory size={20} /> : 'K'}
            </div>
          </NavLink>

          {/* Desktop Navigation Links (Shown on Desktop md:flex) */}
          <div className="hidden md:flex items-center space-x-1 border-l border-r border-stone-200 px-4 mx-4">
            {isRecycler ? (
              <>
                <NavLink
                  to="/recycler"
                  end
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`
                  }
                >
                  Incoming Queue
                </NavLink>
                <NavLink
                  to="/recycler/rates"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`
                  }
                >
                  My Buying Rates
                </NavLink>
                <NavLink
                  to="/admin/anomalies"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`
                  }
                >
                  Anomalies Engine
                </NavLink>
                <NavLink
                  to="/verify"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`
                  }
                >
                  Verify Hash
                </NavLink>
              </>
            ) : (
              <>
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive ? 'bg-brand-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`
                  }
                >
                  {t('nav.prices')}
                </NavLink>
                <NavLink
                  to="/create-lot"
                  className={({ isActive }) =>
                    `px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive ? 'bg-brand-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`
                  }
                >
                  {t('nav.createLot')}
                </NavLink>
                <NavLink
                  to="/ledger"
                  className={({ isActive }) =>
                    `px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive ? 'bg-brand-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`
                  }
                >
                  {t('nav.ledger')}
                </NavLink>
                <NavLink
                  to="/safety"
                  className={({ isActive }) =>
                    `px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive ? 'bg-brand-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`
                  }
                >
                  {t('nav.safety')}
                </NavLink>
              </>
            )}
          </div>

          {/* Right Control Actions (District, Language, Logout) */}
          <div className="flex items-center space-x-1.5 shrink-0 max-w-full overflow-hidden">
            {/* Connectivity Status Badge (Compact on mobile) */}
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-xl text-[11px] font-bold border transition-colors ${
              isOffline
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-emerald-50 text-emerald-900 border-emerald-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="hidden sm:inline">{isOffline ? 'Offline' : 'Synced'}</span>
            </div>

            {/* Location Selector Dropdown */}
            <div className="flex items-center space-x-1 bg-amber-50 border border-amber-300/70 rounded-xl px-2 py-1 text-xs">
              <MapPin size={13} className="text-amber-600 shrink-0" />
              <select
                value={district}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="bg-transparent text-stone-900 font-bold text-xs focus:outline-none cursor-pointer max-w-[75px] sm:max-w-none truncate"
              >
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Language Switcher Compact Select */}
            <div className="flex items-center bg-stone-100 px-1.5 py-1 rounded-xl border border-stone-200 text-xs font-bold text-stone-800">
              <Globe size={13} className="text-stone-500 mr-1 hidden sm:block" />
              <select
                value={i18n.language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="bg-transparent font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="en">EN</option>
                <option value="hi">हिं</option>
                <option value="mr">मराठी</option>
              </select>
            </div>

            {/* User Profile & Logout */}
            <NavLink
              to="/profile"
              className="p-1.5 text-stone-700 hover:bg-stone-100 rounded-xl transition-colors hidden sm:flex items-center space-x-1.5"
              title="Profile"
            >
              <User size={18} className="text-brand-600" />
              {user && <span className="text-xs font-bold max-w-[90px] truncate">{user.name}</span>}
            </NavLink>

            {user && (
              <button
                type="button"
                onClick={handleLogout}
                title="Logout"
                className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <LogOut size={16} />
              </button>
            )}
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

      {/* Bottom Navigation Bar (Fixed for Mobile Screens) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-14 z-[100] bg-white/95 backdrop-blur-md border-t border-stone-200/90 shadow-elevated px-2 flex items-center">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-0.5">
          {isRecycler ? (
            <>
              {/* RECYCLER MOBILE NAV ITEMS */}
              <NavLink
                to="/recycler"
                end
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all ${
                    isActive ? 'bg-stone-900 text-white font-bold' : 'text-stone-500 hover:text-stone-800'
                  }`
                }
              >
                <Factory size={20} />
                <span className="text-[10px] mt-0.5 font-medium">Queue</span>
              </NavLink>

              <NavLink
                to="/recycler/rates"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all ${
                    isActive ? 'bg-stone-900 text-white font-bold' : 'text-stone-500 hover:text-stone-800'
                  }`
                }
              >
                <Tag size={20} />
                <span className="text-[10px] mt-0.5 font-medium">Rates</span>
              </NavLink>

              <NavLink
                to="/admin/anomalies"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all ${
                    isActive ? 'bg-stone-900 text-white font-bold' : 'text-stone-500 hover:text-stone-800'
                  }`
                }
              >
                <ShieldAlert size={20} />
                <span className="text-[10px] mt-0.5 font-medium">Alerts</span>
              </NavLink>

              <NavLink
                to="/verify"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all ${
                    isActive ? 'bg-stone-900 text-white font-bold' : 'text-stone-500 hover:text-stone-800'
                  }`
                }
              >
                <BookOpen size={20} />
                <span className="text-[10px] mt-0.5 font-medium">Verify</span>
              </NavLink>

              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all ${
                    isActive ? 'bg-stone-900 text-white font-bold' : 'text-stone-500 hover:text-stone-800'
                  }`
                }
              >
                <User size={20} />
                <span className="text-[10px] mt-0.5 font-medium">Profile</span>
              </NavLink>
            </>
          ) : (
            <>
              {/* COLLECTOR MOBILE NAV ITEMS */}
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all ${
                    isActive ? 'bg-brand-50 text-brand-600 font-bold' : 'text-stone-500 hover:text-stone-800'
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
                    isActive ? 'bg-brand-50 text-brand-600 font-bold' : 'text-stone-500 hover:text-stone-800'
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
                    isActive ? 'bg-brand-50 text-brand-600 font-bold' : 'text-stone-500 hover:text-stone-800'
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
                    isActive ? 'bg-brand-50 text-brand-600 font-bold' : 'text-stone-500 hover:text-stone-800'
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
                    isActive ? 'bg-brand-50 text-brand-600 font-bold' : 'text-stone-500 hover:text-stone-800'
                  }`
                }
              >
                <User size={20} />
                <span className="text-[10px] mt-0.5 font-medium">Profile</span>
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </>
  );
};
