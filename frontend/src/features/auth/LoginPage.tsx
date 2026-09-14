import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Recycle, User, Phone, ArrowRight, ShieldCheck, Truck, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { loginUser } from '../../data/remote/apiClient';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [role, setRole] = useState<'collector' | 'recycler'>('collector');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) return;
    setError('');

    if (mode === 'login') {
      // ── LOGIN FLOW ─────────────────────────────────────────────────────────
      setIsLoading(true);
      try {
        const user = await loginUser(phone, role);

        // Store real DB data in localStorage
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
        if (user.shop_code) localStorage.setItem('kabadiwala_shop_code', user.shop_code);
        localStorage.setItem('kabadiwala_district', user.district || 'Pune');
        localStorage.setItem('kabadiwala_account_type', user.account_type || 'independent');

        navigate(role === 'recycler' ? '/recycler' : '/');
      } catch (err: any) {
        const detail = err?.message || '';
        if (detail.includes('not found') || detail.includes('404')) {
          // Account doesn't exist — switch to signup
          setError('No account found for this number. Sign up below.');
          setMode('signup');
        } else {
          setError(detail || 'Login failed. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      // ── SIGNUP FLOW — redirect to onboarding (account created there) ───────
      if (!name.trim()) {
        setError('Please enter your name to continue.');
        return;
      }
      // Store provisional data; onboarding page completes the API call
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

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col justify-center px-4 py-8 max-w-md mx-auto">
      {/* Header Brand */}
      <div className="text-center space-y-2 mb-8">
        <div className="w-16 h-16 mx-auto bg-brand-500 rounded-2xl flex items-center justify-center text-stone-900 shadow-md transform -rotate-3">
          <Recycle size={36} />
        </div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight">{t('appName')}</h1>
        <p className="text-xs text-stone-500 font-medium">{t('tagline')}</p>
      </div>

      {/* Login / Signup Card */}
      <div className="bg-surface-card rounded-2xl p-6 border border-surface-border shadow-soft space-y-5">
        {/* Mode toggle */}
        <div className="flex space-x-2 bg-stone-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'login' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'signup' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
            }`}
          >
            New Account
          </button>
        </div>

        <h2 className="text-lg font-bold text-stone-900 text-center">
          {mode === 'login' ? t('auth.loginTitle') : 'Create Your Account'}
        </h2>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setRole('collector')}
            className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
              role === 'collector'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Truck size={16} />
            <span>{t('profile.collector')}</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('recycler')}
            className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
              role === 'recycler'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShieldCheck size={16} />
            <span>{t('profile.recycler')}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name field — only shown for signup */}
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">{t('auth.enterName')}</label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-3 text-stone-400" />
                <input
                  type="text"
                  required
                  placeholder={role === 'recycler' ? 'e.g. Pune Metal Recyclers' : 'e.g. Ramesh Kumar'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">{t('auth.enterPhone')}</label>
            <div className="relative">
              <Phone size={18} className="absolute left-3.5 top-3 text-stone-400" />
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="9876543210"
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start space-x-2 bg-rose-50 border border-rose-200 rounded-xl p-3">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-800 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={phone.length < 10 || isLoading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md active:scale-95 transition-all disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <><Loader2 size={18} className="animate-spin" /><span>Checking...</span></>
            ) : (
              <><span>{mode === 'login' ? t('auth.continueBtn') : 'Continue to Setup'}</span><ArrowRight size={18} /></>
            )}
          </button>
        </form>

        {/* Live Demo Quick-Fill Accounts */}
        <div className="border-t border-stone-200 pt-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-stone-900">
              <Sparkles size={15} className="text-amber-500" />
              <span>Judge / Live Demo Accounts</span>
            </div>
            <span className="text-[10px] font-semibold text-stone-500">Tap to quick-fill credentials</span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {[
              {
                title: 'Ramesh Kumar (Ganesh Kabadi Shop)',
                subtitle: 'Shop Owner (Code: SHOP-9876, 2 Linked Feriwalas)',
                phone: '9876543210',
                role: 'collector' as const,
                badge: '🏬 Shop Owner',
                color: 'border-emerald-300 bg-emerald-50/70 text-emerald-900',
              },
              {
                title: 'Suresh Patil (Linked Feriwala)',
                subtitle: 'Sub-collector linked to SHOP-9876 (Marathi UI)',
                phone: '9822011223',
                role: 'collector' as const,
                badge: '🚲 Sub-Collector',
                color: 'border-blue-300 bg-blue-50/70 text-blue-900',
              },
              {
                title: 'Vikram Singh (Linked Feriwala)',
                subtitle: 'Sub-collector linked to SHOP-9876 (Hindi UI)',
                phone: '9822044556',
                role: 'collector' as const,
                badge: '🚲 Sub-Collector',
                color: 'border-blue-300 bg-blue-50/70 text-blue-900',
              },
              {
                title: 'Anil Deshmukh (Independent Collector)',
                subtitle: 'Itinerant Waste Collector — Shivajinagar, Pune',
                phone: '9800033333',
                role: 'collector' as const,
                badge: '🎒 Independent',
                color: 'border-purple-300 bg-purple-50/70 text-purple-900',
              },
              {
                title: 'EcoRecycle India (Pune Hub)',
                subtitle: 'MPCB Verified Recycler (Rates: PCB ₹260, Battery ₹90)',
                phone: '9876543210',
                role: 'recycler' as const,
                badge: '🏭 Recycler (Pune)',
                color: 'border-amber-300 bg-amber-50/70 text-amber-900',
              },
              {
                title: 'GreenTech E-Waste Solutions',
                subtitle: 'MPCB Verified Recycler (Mumbai - PCB ₹285/kg)',
                phone: '9812345678',
                role: 'recycler' as const,
                badge: '🏭 Recycler (Mumbai)',
                color: 'border-amber-300 bg-amber-50/70 text-amber-900',
              },
              {
                title: 'Chinchwad Aggregators & Metals',
                subtitle: 'Verified Battery & Metal Recycler (Battery ₹95/kg)',
                phone: '9765432109',
                role: 'recycler' as const,
                badge: '🏭 Recycler (Chinchwad)',
                color: 'border-amber-300 bg-amber-50/70 text-amber-900',
              },
            ].map((acc) => {
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
                  className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs flex items-center justify-between ${
                    isSelected
                      ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/60 font-bold'
                      : 'border-stone-200 bg-stone-50/60 hover:bg-stone-100'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-stone-900 truncate">{acc.title}</span>
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black border ${acc.color}`}>
                        {acc.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500 truncate">{acc.subtitle}</p>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-stone-700 shrink-0 bg-white px-2 py-1 rounded-md border border-stone-200">
                    {acc.phone}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
