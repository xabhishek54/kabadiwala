import React, { useState, useEffect } from 'react';
import {
  User, Store, Users, ShieldCheck, Phone, MapPin, QrCode,
  Award, ArrowRight, LogOut, Copy, CheckCheck, Loader2, RefreshCw, Factory, Tag, TrendingUp, Clock, Package
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/local/db';
import { fetchShopFeriwalas } from '../../data/remote/apiClient';

interface Feriwala {
  collector_id: string;
  display_name: string;
  phone_number: string;
  account_type: string;
  created_at: string;
}

export const ProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [accountType, setAccountType] = useState<'independent' | 'shop' | 'sub_collector' | 'recycler'>('recycler');
  const [displayName, setDisplayName] = useState<string>('EcoRecycle Center');
  const [phone, setPhone] = useState<string>('9823011223');
  const [userRole, setUserRole] = useState<string>('recycler');
  const [locality, setLocality] = useState<string>('Pune');
  const [shopCode, setShopCode] = useState<string | null>(null);
  const [mpcbRef, setMpcbRef] = useState<string>('MPCB/E-WASTE/2024/099');
  const [feriwalas, setFeriwalas] = useState<Feriwala[]>([]);
  const [loadingFeriwalas, setLoadingFeriwalas] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQRGuide, setShowQRGuide] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('kabadiwala_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u.name) setDisplayName(u.name);
        if (u.phone) setPhone(u.phone);
        if (u.role) setUserRole(u.role);
        if (u.accountType) setAccountType(u.accountType);
        if (u.district) setLocality(u.district);
        if (u.shopCode) setShopCode(u.shopCode);
        if (u.mpcb_ref) setMpcbRef(u.mpcb_ref);

        if (u.role === 'recycler') {
          setAccountType('recycler');
        }
      }

      const savedType = localStorage.getItem('kabadiwala_account_type') as any;
      if (savedType && savedType !== 'shop') {
        setAccountType(savedType);
      }
      const savedCode = localStorage.getItem('kabadiwala_shop_code');
      if (savedCode) setShopCode(savedCode);
    } catch {
      // safe fallback
    }
  }, []);

  // Load real feriwalas from backend when user is a collector shop owner
  useEffect(() => {
    if (userRole === 'collector' && accountType === 'shop' && shopCode) {
      loadFeriwalas(shopCode);
    }
  }, [userRole, accountType, shopCode]);

  const loadFeriwalas = async (code: string) => {
    setLoadingFeriwalas(true);
    try {
      const data = await fetchShopFeriwalas(code);
      setFeriwalas(data);
    } catch {
      setFeriwalas([]);
    } finally {
      setLoadingFeriwalas(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('kabadiwala_user');
    localStorage.removeItem('kabadiwala_shop_code');
    localStorage.removeItem('kabadiwala_account_type');
    window.location.href = '/login';
  };

  const handleCopyCode = () => {
    if (shopCode) {
      navigator.clipboard.writeText(shopCode).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isRecycler = userRole === 'recycler' || accountType === 'recycler';

  // Live collector activity stats from local DB
  const collectorIdForStats: string = (() => {
    try { const u = JSON.parse(localStorage.getItem('kabadiwala_user') || '{}'); return u.id || u.phone || ''; } catch { return ''; }
  })();
  const myMaterials = useLiveQuery(
    () => collectorIdForStats ? db.materials.where('collector_id').equals(collectorIdForStats).toArray() : Promise.resolve([]),
    [collectorIdForStats]
  ) || [];
  const myTransactions = useLiveQuery(
    () => collectorIdForStats ? db.transactions.where('collector_id').equals(collectorIdForStats).toArray() : Promise.resolve([]),
    [collectorIdForStats]
  ) || [];
  const txMap = new Map(myTransactions.map(tx => [tx.lot_id, tx]));
  let statsEarned = 0; let statsPending = 0;
  myMaterials.forEach(mat => {
    const tx = txMap.get(mat.lot_id);
    const val = tx?.final_sale_value || tx?.quoted_price || mat.estimated_value || 0;
    if (tx?.payment_status === 'paid' || tx?.status === 'closed') { statsEarned += val; } else { statsPending += val; }
  });

  return (
    <div className="pb-24 pt-4 px-4 max-w-md sm:max-w-2xl md:max-w-4xl mx-auto space-y-4 font-sans">
      {/* Header Profile Card */}
      <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 ${
              isRecycler ? 'bg-stone-900' : 'bg-brand-500'
            }`}>
              {isRecycler ? <Factory size={28} /> : accountType === 'shop' ? <Store size={28} /> : <User size={28} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 leading-tight">{displayName}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className="bg-brand-100 text-brand-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize">
                  {isRecycler
                    ? (isEn ? 'MPCB Authorized Recycler' : 'अधिकृत रीसायकलर')
                    : accountType === 'shop'
                      ? (isEn ? 'Shop Owner' : 'दुकानदार (Shop Owner)')
                      : accountType === 'sub_collector'
                        ? (isEn ? 'Feriwala Collector' : 'फेरीवाला (Feriwala)')
                        : (isEn ? 'Independent Collector' : 'स्वतंत्र कबाड़ीवाला')}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold flex items-center space-x-1 transition-all active:scale-95"
            title="Logout"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">{t('profile.logout')}</span>
          </button>
        </div>

        {/* Profile info row */}
        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-stone-100">
          <div className="flex items-center space-x-1.5 text-stone-600">
            <Phone size={14} className="text-brand-600 shrink-0" />
            <span className="font-semibold">{phone}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-stone-600">
            <MapPin size={14} className="text-brand-600 shrink-0" />
            <span className="font-semibold">{locality}</span>
          </div>
        </div>
      </div>

      {/* Collector Activity Stats — only shown for collector accounts */}
      {!isRecycler && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface-card rounded-xl p-3 border border-surface-border shadow-soft text-center">
            <div className="flex justify-center mb-1"><Package size={16} className="text-brand-600" /></div>
            <div className="text-xl font-black text-stone-900">{myMaterials.length}</div>
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wide">{isEn ? 'Lots' : 'लॉट'}</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 shadow-soft text-center">
            <div className="flex justify-center mb-1"><TrendingUp size={16} className="text-emerald-600" /></div>
            <div className="text-xl font-black text-emerald-800">₹{statsEarned.toLocaleString('en-IN')}</div>
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">{isEn ? 'Earned' : 'कमाई'}</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 shadow-soft text-center">
            <div className="flex justify-center mb-1"><Clock size={16} className="text-amber-600" /></div>
            <div className="text-xl font-black text-amber-800">₹{statsPending.toLocaleString('en-IN')}</div>
            <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">{isEn ? 'Pending' : 'बाकी'}</div>
          </div>
        </div>
      )}

      {/* Recycler Facility Specific Section */}
      {isRecycler ? (
        <div className="space-y-4">
          {/* MPCB License Badge Card */}
          <div className="bg-stone-900 text-white rounded-card p-4 shadow-soft space-y-3 border border-stone-800">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-stone-900 flex items-center justify-center shadow-xs shrink-0 font-bold">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-emerald-400 tracking-wider">
                    {isEn ? 'MPCB License Authorization' : 'MPCB परवाना प्रमाण'}
                  </span>
                  <h4 className="font-bold text-white text-sm leading-tight">
                    {isEn ? 'Authorized E-Waste Processing Facility' : 'अधिकृत ई-कचरा रीसायकलिंग सेंटर'}
                  </h4>
                </div>
              </div>
              <span className="bg-emerald-500 text-stone-950 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                VERIFIED ✓
              </span>
            </div>

            <div className="bg-stone-800/80 rounded-xl p-3 text-xs text-stone-300 space-y-1 font-mono">
              <div><span className="text-stone-400">{isEn ? 'Ref No:' : 'परवाना क्रमांक:'}</span> <strong>{mpcbRef}</strong></div>
              <div><span className="text-stone-400">{isEn ? 'District Hub:' : 'कार्यक्षेत्र:'}</span> <strong>{locality}</strong></div>
            </div>

            <NavLink
              to="/recycler/rates"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all"
            >
              <Tag size={15} />
              <span>{isEn ? 'Manage Buying Rates' : 'खरेदी दर व्यवस्थापित करा'}</span>
              <ArrowRight size={14} />
            </NavLink>
          </div>
        </div>
      ) : (
        /* Collector Specific Section */
        <>
          {/* Digital Authorization Badge */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-card p-4 shadow-soft space-y-2.5">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Award size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">Official License Badge</span>
                  <h4 className="font-bold text-stone-900 text-sm leading-tight">Authorized Collection Agent</h4>
                </div>
              </div>
              <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">ACTIVE ✓</span>
            </div>

            <p className="text-xs text-stone-700 font-medium">
              Issued by: <strong className="text-stone-900">EcoRecycle India (MPCB Verified)</strong><br />
              Ref No: <span className="font-mono text-stone-900 font-bold">AUTH-2024-8902</span>
            </p>

            <NavLink
              to="/verify/AUTH-2024-8902"
              className="tap-target w-full bg-white border border-emerald-300 hover:border-emerald-500 text-emerald-800 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-xs"
            >
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>Verify Digital Authorization Badge</span>
              <ArrowRight size={14} />
            </NavLink>
          </div>

          {/* Shop Owner: QR / Shop Code Panel */}
          {accountType === 'shop' && shopCode && (
            <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft space-y-3">
              <h3 className="font-bold text-stone-900 text-sm flex items-center space-x-1.5">
                <QrCode size={16} className="text-brand-600" />
                <span>Your Shop Pairing Code</span>
              </h3>

              <div className="bg-stone-900 text-white p-4 rounded-2xl space-y-2 text-center">
                <div className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Unique Shop Code</div>
                <div className="text-2xl font-black font-mono tracking-widest">{shopCode}</div>
                <div className="text-[11px] text-stone-400">Share with your door-to-door feriwalas to link them</div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center justify-center space-x-1.5 mx-auto bg-stone-700 hover:bg-stone-600 text-white text-xs font-bold py-1.5 px-4 rounded-lg transition-all"
                >
                  {copied ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowQRGuide(!showQRGuide)}
                className="w-full text-xs text-stone-500 font-semibold underline underline-offset-2"
              >
                {showQRGuide ? 'Hide guide' : 'How does feriwala linking work? ▾'}
              </button>

              {showQRGuide && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                  <p className="font-bold">How to link a feriwala:</p>
                  <ol className="list-decimal ml-4 space-y-0.5 text-[11px]">
                    <li>Feriwala downloads the app and creates an account as "Feriwala"</li>
                    <li>During onboarding they scan your QR or enter code <strong className="font-mono">{shopCode}</strong></li>
                    <li>Their transactions automatically appear under your shop</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Shop Owner: Linked Feriwalas from Backend */}
          {accountType === 'shop' && (
            <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-stone-900 text-sm flex items-center space-x-1.5">
                  <Users size={16} className="text-brand-600" />
                  <span>Linked Feriwalas ({feriwalas.length})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => shopCode && loadFeriwalas(shopCode)}
                  disabled={loadingFeriwalas}
                  className="p-1.5 rounded-lg text-stone-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={14} className={loadingFeriwalas ? 'animate-spin' : ''} />
                </button>
              </div>

              {loadingFeriwalas ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={20} className="animate-spin text-brand-600" />
                </div>
              ) : feriwalas.length === 0 ? (
                <div className="text-center py-4 space-y-1">
                  <Users size={28} className="mx-auto text-stone-300" />
                  <p className="text-xs text-stone-500 font-medium">No feriwalas linked yet.</p>
                  <p className="text-[11px] text-stone-400">Share your shop code <strong className="font-mono">{shopCode}</strong> with them.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {feriwalas.map((fw) => (
                    <div key={fw.collector_id} className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-between text-xs">
                      <div>
                        <h4 className="font-bold text-stone-900">{fw.display_name || 'Feriwala'}</h4>
                        <p className="text-[11px] text-stone-500">
                          {fw.phone_number} • Joined {new Date(fw.created_at).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Linked</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Feriwala: Show linked shop status */}
          {accountType === 'sub_collector' && (
            <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft space-y-2">
              <h3 className="font-bold text-stone-900 text-sm flex items-center space-x-1.5">
                <Store size={16} className="text-amber-600" />
                <span>Linked Shop</span>
              </h3>
              {(() => {
                const raw = localStorage.getItem('kabadiwala_user');
                const u = raw ? JSON.parse(raw) : null;
                return u?.parentShopCode ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <div className="text-xs text-amber-900">
                      <span className="font-bold">Shop Code: </span>
                      <span className="font-mono font-bold">{u.parentShopCode}</span>
                    </div>
                    <div className="text-[11px] text-amber-700 mt-1">Your collections are reported under this shop.</div>
                  </div>
                ) : (
                  <div className="text-xs text-stone-500 font-medium py-2">
                    Not yet linked to a shop. Complete onboarding to scan your shop's QR code.
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
};
