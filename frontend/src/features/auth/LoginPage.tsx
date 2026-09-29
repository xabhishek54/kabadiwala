import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Recycle, User, Phone, ArrowRight, ShieldCheck, Truck, AlertCircle, Loader2, Sparkles, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { loginUser } from '../../data/remote/apiClient';

export const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [role, setRole] = useState<'collector' | 'recycler'>('collector');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  const currentLang = i18n.language || 'en';

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('kabadiwala_lang', lang);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) return;
    setError('');

    if (mode === 'login') {
      setIsLoading(true);
      try {
        const user = await loginUser(phone, role);

        const userObj = {
          id: user.user_id,
          name: user.name,
          phone: user.phone_number,
          role: user.role,
          accountType: user.account_type || 'independent',
          shopCode: user.shop_code || null,
          district: user.district || 'Pune',
          isNew: false,
        };
        localStorage.setItem('kabadiwala_user', JSON.stringify(userObj));
        if (user.access_token) localStorage.setItem('kabadiwala_access_token', user.access_token);
        if (user.shop_code) localStorage.setItem('kabadiwala_shop_code', user.shop_code);
        localStorage.setItem('kabadiwala_district', user.district || 'Pune');
        localStorage.setItem('kabadiwala_account_type', user.account_type || 'independent');

        navigate(role === 'recycler' ? '/recycler' : '/');
      } catch (err: any) {
        const detail = err?.message || '';
        if (detail.includes('not found') || detail.includes('404')) {
          setError('No account found for this number. Switch to "Sign Up" below.');
          setMode('signup');
        } else {
          setError(detail || 'Login failed. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!name.trim()) {
        setError('Please enter your name to continue.');
        return;
      }
      const userObj = {
        name: name.trim(),
        phone,
        role,
        isNew: true,
      };
      localStorage.setItem('kabadiwala_user', JSON.stringify(userObj));
      navigate(role === 'recycler' ? '/onboarding/recycler' : '/onboarding/collector');
    }
  };

  const DEMO_ACCOUNTS = [
    {
      title: 'Ramesh Kumar (Ganesh Kabadi Shop)',
      desc: 'Shop Owner • Pune',
      phone: '9876543210',
      role: 'collector' as const,
      tag: 'Shop Owner',
    },
    {
      title: 'Suresh Patil (Linked Feriwala)',
      desc: 'Sub-collector linked to SHOP-9876',
      phone: '9822011223',
      role: 'collector' as const,
      tag: 'Feriwala',
    },
    {
      title: 'Anil Deshmukh (Independent)',
      desc: 'Waste Collector • Shivajinagar',
      phone: '9800033333',
      role: 'collector' as const,
      tag: 'Independent',
    },
    {
      title: 'EcoRecycle India (Pune Hub)',
      desc: 'MPCB Verified Recycler Facility',
      phone: '9876543210',
      role: 'recycler' as const,
      tag: 'Recycler Hub',
    },
    {
      title: 'GreenTech E-Waste Solutions',
      desc: 'MPCB Verified Recycler • Mumbai',
      phone: '9812345678',
      role: 'recycler' as const,
      tag: 'Recycler Hub',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-stone-900 flex flex-col justify-center px-4 py-8 font-sans">
      <div className="w-full max-w-sm mx-auto space-y-6">

        {/* Language Switcher Bar */}
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-1.5 text-stone-500 font-medium">
            <Globe size={14} className="text-emerald-600" />
            <span>Language:</span>
          </div>

          <div className="flex items-center bg-white border border-stone-200 rounded-full p-0.5 shadow-xs font-semibold">
            {[
              { code: 'en', label: 'English' },
              { code: 'hi', label: 'हिंदी' },
              { code: 'mr', label: 'मराठी' },
            ].map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageChange(lang.code)}
                className={`px-2.5 py-1 rounded-full text-[11px] transition-all ${currentLang === lang.code
                    ? 'bg-[#16A34A] text-white font-bold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                  }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Minimal Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto bg-[#16A34A] text-white rounded-2xl flex items-center justify-center shadow-md">
            <Recycle size={30} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">{t('appName')}</h1>
            <p className="text-xs text-stone-500 font-medium mt-0.5">{t('tagline')}</p>
          </div>
        </div>

        {/* Clean Auth Card */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-5">

          {/* Mode Switcher: Sign In vs Sign Up */}
          <div className="flex bg-stone-100/80 p-1 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2 rounded-xl transition-all ${mode === 'login' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); }}
              className={`flex-1 py-2 rounded-xl transition-all ${mode === 'signup' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
            >
              Sign Up
            </button>
          </div>

          {/* Role Selection Tabs */}
          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => setRole('collector')}
              className={`py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2 border transition-all ${role === 'collector'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
                  : 'bg-stone-50 border-stone-200/80 text-stone-600 hover:bg-stone-100'
                }`}
            >
              <Truck size={16} className={role === 'collector' ? 'text-[#16A34A]' : 'text-stone-400'} />
              <span>Collector</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('recycler')}
              className={`py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2 border transition-all ${role === 'recycler'
                  ? 'bg-stone-900 border-stone-900 text-white shadow-xs'
                  : 'bg-stone-50 border-stone-200/80 text-stone-600 hover:bg-stone-100'
                }`}
            >
              <ShieldCheck size={16} className={role === 'recycler' ? 'text-amber-400' : 'text-stone-400'} />
              <span>Recycler</span>
            </button>
          </div>

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-3.5 text-stone-400" />
                  <input
                    type="text"
                    required
                    placeholder={role === 'recycler' ? 'e.g. Pune Metal Recyclers' : 'e.g. Ramesh Kumar'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-stone-50/70 border border-stone-200 rounded-2xl text-stone-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Mobile Number</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-3.5 text-stone-400" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                  className="w-full pl-10 pr-4 py-3 bg-stone-50/70 border border-stone-200 rounded-2xl text-stone-900 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 tracking-wider"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-800 font-medium">
                <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={phone.length < 10 || isLoading}
              className="w-full bg-[#16A34A] hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all disabled:opacity-50 text-xs cursor-pointer mt-2"
            >
              {isLoading ? (
                <><Loader2 size={16} className="animate-spin" /><span>Verifying Account...</span></>
              ) : (
                <><span>{mode === 'login' ? 'Sign In to Portal' : 'Continue Account Setup'}</span><ArrowRight size={16} /></>
              )}
            </button>
          </form>

        </div>

        {/* Minimalist Demo Accounts Drawer / Accordion */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowDemoAccounts(!showDemoAccounts)}
            className="w-full py-2.5 px-4 bg-white border border-stone-200/80 rounded-2xl flex items-center justify-between text-xs font-bold text-stone-700 hover:bg-stone-50 transition-all shadow-xs cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              <span>Quick Demo Sign-In</span>
            </div>
            {showDemoAccounts ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
          </button>

          {showDemoAccounts && (
            <div className="bg-white border border-stone-200/80 rounded-2xl p-3 space-y-2 shadow-xs text-xs animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-[11px] text-stone-500 font-medium px-1">Select a demo account to auto-fill credentials:</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isSelected = phone === acc.phone && role === acc.role;
                  return (
                    <button
                      key={`${acc.role}-${acc.phone}`}
                      type="button"
                      onClick={() => {
                        setPhone(acc.phone);
                        setRole(acc.role);
                        setMode('login');
                        setError('');
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${isSelected
                          ? 'border-[#16A34A] bg-emerald-50/60 font-bold text-emerald-950'
                          : 'border-stone-100 bg-stone-50/50 hover:bg-stone-100 text-stone-800'
                        }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-bold truncate text-xs">{acc.title}</div>
                        <div className="text-[10px] text-stone-500 truncate">{acc.desc}</div>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-stone-700 bg-white border border-stone-200 px-2 py-0.5 rounded-lg shrink-0">
                        {acc.phone}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
