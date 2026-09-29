import React, { useState, useEffect } from 'react';
import {
  User, Store, Users, ShieldCheck, Phone, MapPin, QrCode,
  Award, ArrowRight, LogOut, Copy, CheckCheck, Loader2, RefreshCw, Factory, Tag, TrendingUp, Clock, Package, Save
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../../data/local/db';
import { fetchShopFeriwalas, fetchCollectorAuthorizations, linkFeriwalaToShop } from '../../data/remote/apiClient';
import { API_BASE_URL } from '../../data/remote/apiClient';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import { formatVernacularNumber, formatVernacularCurrency, getLocalizedRoleName } from '../../utils/vernacularFormatter';

interface Feriwala {
  collector_id: string;
  display_name: string;
  phone_number: string;
  account_type: string;
  created_at: string;
}

export const ProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'en';

  const userRaw = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? localStorage.getItem('kabadiwala_user') : null;
  const initialUser = userRaw ? JSON.parse(userRaw) : null;

  const [accountType, setAccountType] = useState<'independent' | 'shop' | 'sub_collector' | 'recycler'>(initialUser?.accountType || initialUser?.role || 'independent');
  const [displayName, setDisplayName] = useState<string>(initialUser?.name || 'Collector');
  const [phone, setPhone] = useState<string>(initialUser?.phone || '');
  const [userRole, setUserRole] = useState<string>(initialUser?.role || 'collector');
  const [locality, setLocality] = useState<string>(initialUser?.district || 'Pune');
  const [shopCode, setShopCode] = useState<string | null>(initialUser?.shopCode || (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? localStorage.getItem('kabadiwala_shop_code') : null));
  const [mpcbRef, setMpcbRef] = useState<string>(initialUser?.mpcb_ref || initialUser?.authorization_ref_no || '');
  const [authBadgeRef, setAuthBadgeRef] = useState<string>(initialUser?.auth_badge_ref || `AUTH-2024-${(initialUser?.id || 'DEMO').slice(-4)}`);
  const [feriwalas, setFeriwalas] = useState<Feriwala[]>([]);
  const [loadingFeriwalas, setLoadingFeriwalas] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQRGuide, setShowQRGuide] = useState(false);
  const [shopCodeInput, setShopCodeInput] = useState('');
  const [isLinkingShop, setIsLinkingShop] = useState(false);
  const [shopLinkMessage, setShopLinkMessage] = useState('');

  // Load user from localStorage on mount & fetch backend authorization
  useEffect(() => {
    async function initProfile() {
      try {
        const raw = window.localStorage?.getItem('kabadiwala_user');
        if (raw) {
          const u = JSON.parse(raw);
          if (u.name) setDisplayName(u.name);
          if (u.phone) setPhone(u.phone);
          if (u.role) setUserRole(u.role);
          if (u.accountType) setAccountType(u.accountType);
          if (u.district) setLocality(u.district);
          if (u.shopCode) setShopCode(u.shopCode);
          if (u.mpcb_ref) setMpcbRef(u.mpcb_ref);
          const badgeRef = u.auth_badge_ref || u.mpcb_ref || `AUTH-2024-${(u.id || 'DEMO').slice(-4)}`;
          setAuthBadgeRef(badgeRef);

          if (u.role === 'recycler') {
            setAccountType('recycler');
          }

          if (u.id) {
            const auths = await fetchCollectorAuthorizations(u.id);
            if (auths && auths.length > 0) {
              setAuthBadgeRef(auths[0].authorization_id || auths[0].authorization_ref_no || badgeRef);
            }
          }
        }

        const savedType = window.localStorage?.getItem('kabadiwala_account_type') as any;
        if (savedType && savedType !== 'shop') {
          setAccountType(savedType);
        }
        const savedCode = window.localStorage?.getItem('kabadiwala_shop_code');
        if (savedCode) setShopCode(savedCode);
      } catch (err) {
        console.warn('Profile init error:', err);
      }
    }
    initProfile();
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
    window.localStorage?.removeItem('kabadiwala_user');
    window.localStorage?.removeItem('kabadiwala_shop_code');
    window.localStorage?.removeItem('kabadiwala_account_type');
    window.location.href = '/login';
  };

  const handleCopyCode = () => {
    if (shopCode) {
      navigator.clipboard.writeText(shopCode).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLinkShop = async () => {
    const collectorId = initialUser?.id;
    const code = shopCodeInput.trim().toUpperCase();
    if (!collectorId || !code) return;
    setIsLinkingShop(true);
    setShopLinkMessage('');
    try {
      const result = await linkFeriwalaToShop(collectorId, code);
      const updatedUser = { ...initialUser, accountType: 'sub_collector', parentShopCode: result.shop_code };
      localStorage.setItem('kabadiwala_user', JSON.stringify(updatedUser));
      localStorage.setItem('kabadiwala_account_type', 'sub_collector');
      setAccountType('sub_collector');
      setShopCode(result.shop_code);
      setShopCodeInput('');
      setShopLinkMessage(`Linked to ${result.shop_name}`);
    } catch (error) {
      setShopLinkMessage(error instanceof Error ? error.message : 'Shop code not found');
    } finally {
      setIsLinkingShop(false);
    }
  };

  const isRecycler = userRole === 'recycler' || accountType === 'recycler';
  const recyclerId = initialUser?.recycler_id || initialUser?.id || 'rec-pune-001';
  const [pickupAvailable, setPickupAvailable] = useState(true);
  const [serviceRadius, setServiceRadius] = useState(10);
  const [materialsAccepted, setMaterialsAccepted] = useState(['PCB', 'BATTERY', 'CABLE', 'LCD_PANEL', 'MOTOR_MAGNET']);
  const [facilityAddress, setFacilityAddress] = useState(() => typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('kabadiwala_recycler_address') || 'Hadapsar Industrial Estate, Pune' : 'Hadapsar Industrial Estate, Pune');
  const [facilityLat, setFacilityLat] = useState(() => Number(typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('kabadiwala_recycler_lat') || '18.5089' : '18.5089'));
  const [facilityLng, setFacilityLng] = useState(() => Number(typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('kabadiwala_recycler_lng') || '73.9259' : '73.9259'));
  const [showFacilityMap, setShowFacilityMap] = useState(false);
  const [savingFacilitySettings, setSavingFacilitySettings] = useState(false);
  const [facilitySettingsSaved, setFacilitySettingsSaved] = useState(false);

  const facilityMaterials = [
    ['PCB', '🖥️', 'Boards'], ['BATTERY', '🔋', 'Batteries'], ['CABLE', '🔌', 'Cables'],
    ['LCD_PANEL', '📺', 'Screens'], ['CRT', '📺', 'CRT'], ['MOTOR_MAGNET', '🧲', 'Motors'],
    ['MIXED_PLASTIC', '♻️', 'Plastic'],
  ] as const;

  const saveFacilitySettings = async () => {
    setSavingFacilitySettings(true);
    await fetch(`${API_BASE_URL}/recyclers/${encodeURIComponent(recyclerId)}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickup_available: pickupAvailable, service_radius_km: serviceRadius, materials_accepted: materialsAccepted, facility_lat: facilityLat, facility_lng: facilityLng, facility_address: facilityAddress }),
    }).catch(() => {});
    localStorage.setItem('kabadiwala_recycler_lat', String(facilityLat));
    localStorage.setItem('kabadiwala_recycler_lng', String(facilityLng));
    localStorage.setItem('kabadiwala_recycler_address', facilityAddress);
    setSavingFacilitySettings(false);
    setFacilitySettingsSaved(true);
    setTimeout(() => setFacilitySettingsSaved(false), 2500);
  };

  // Live collector activity stats from local DB
  const collectorIdForStats: string = (() => {
    try { const u = JSON.parse(window.localStorage?.getItem('kabadiwala_user') || '{}'); return u.id || u.phone || ''; } catch { return ''; }
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
    <div className="pb-24 pt-4 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto space-y-6 font-sans text-stone-900">
      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 ${
              isRecycler ? 'bg-stone-900' : 'bg-[#16A34A]'
            }`}>
              {isRecycler ? <Factory size={32} /> : accountType === 'shop' ? <Store size={32} /> : <User size={32} />}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 leading-tight">{displayName}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full capitalize">
                  {getLocalizedRoleName(isRecycler ? 'recycler' : accountType, currentLang)}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs"
            title={t('profile.logout')}
          >
            <LogOut size={16} />
            <span>{t('profile.logout')}</span>
          </button>
        </div>

        {/* Profile info row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3 border-t border-stone-100">
          <div className="flex items-center space-x-2 text-stone-600 bg-stone-50 p-3 rounded-2xl border border-stone-200/60">
            <Phone size={16} className="text-[#16A34A] shrink-0" />
            <span className="font-bold text-stone-900">{formatVernacularNumber(phone || '+91 98765 43210', currentLang)}</span>
          </div>
          <div className="flex items-center space-x-2 text-stone-600 bg-stone-50 p-3 rounded-2xl border border-stone-200/60">
            <MapPin size={16} className="text-[#16A34A] shrink-0" />
            <span className="font-bold text-stone-900">{locality}</span>
          </div>
        </div>
      </div>

      {/* Collector Activity Stats — only shown for collector accounts */}
      {!isRecycler && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs text-center space-y-1">
            <div className="flex justify-center mb-1"><Package size={20} className="text-[#16A34A]" /></div>
            <div className="text-2xl font-black text-stone-900">{formatVernacularNumber(myMaterials.length, currentLang)}</div>
            <div className="text-xs font-extrabold text-stone-500 uppercase tracking-wide">{t('profile.lotsCount')}</div>
          </div>
          <div className="bg-emerald-50/80 rounded-3xl p-4 border border-emerald-200/80 shadow-xs text-center space-y-1">
            <div className="flex justify-center mb-1"><TrendingUp size={20} className="text-[#16A34A]" /></div>
            <div className="text-2xl font-black text-emerald-900">{formatVernacularCurrency(statsEarned, currentLang)}</div>
            <div className="text-xs font-extrabold text-emerald-700 uppercase tracking-wide">{t('profile.earnedTotal')}</div>
          </div>
          <div className="bg-amber-50/80 rounded-3xl p-4 border border-amber-200/80 shadow-xs text-center space-y-1">
            <div className="flex justify-center mb-1"><Clock size={20} className="text-amber-600" /></div>
            <div className="text-2xl font-black text-amber-900">{formatVernacularCurrency(statsPending, currentLang)}</div>
            <div className="text-xs font-extrabold text-amber-700 uppercase tracking-wide">{t('profile.pendingDues')}</div>
          </div>
        </div>
      )}

      {/* Recycler Facility Specific Section */}
      {isRecycler ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* MPCB License Badge Card */}
          <div className="bg-stone-900 text-white rounded-3xl p-6 shadow-xl space-y-4 border border-stone-800 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-stone-950 flex items-center justify-center shadow-md shrink-0 font-bold">
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                      {currentLang === 'hi' ? 'MPCB लाइसेंस प्राधिकरण' : currentLang === 'mr' ? 'MPCB परवाना प्रमाण' : 'MPCB License Authorization'}
                    </span>
                    <h4 className="font-extrabold text-white text-base leading-tight">
                      {currentLang === 'hi' ? 'सत्यापित ई-कचरा रीसायकलिंग केंद्र' : currentLang === 'mr' ? 'अधिकृत ई-कचरा रीसायकलिंग सेंटर' : 'Authorized E-Waste Processing Facility'}
                    </h4>
                  </div>
                </div>
                <span className="bg-emerald-500 text-stone-950 text-xs font-black px-3 py-1 rounded-full shrink-0">
                  VERIFIED ✓
                </span>
              </div>

              <div className="bg-stone-800/90 rounded-2xl p-4 text-xs text-stone-300 space-y-2 font-mono">
                <div className="flex justify-between border-b border-stone-700 pb-1">
                  <span className="text-stone-400">{currentLang === 'hi' ? 'परवाना नंबर:' : currentLang === 'mr' ? 'परवाना क्रमांक:' : 'MPCB Ref No:'}</span>
                  <strong className="text-emerald-400">{mpcbRef || 'BO/MPCB/RO-PUNE/2024'}</strong>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-stone-400">{currentLang === 'hi' ? 'कार्यक्षेत्र:' : currentLang === 'mr' ? 'कार्यक्षेत्र:' : 'District Hub:'}</span>
                  <strong className="text-white">{locality}</strong>
                </div>
              </div>
            </div>

            <NavLink
              to="/recycler/rates"
              className="w-full bg-[#16A34A] hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer"
            >
              <Tag size={16} />
              <span>{t('profile.manageRates')}</span>
              <ArrowRight size={14} />
            </NavLink>
          </div>

          {/* Quick Operations Actions Panel */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="font-black text-stone-900 text-base flex items-center space-x-2 mb-3">
                <Factory size={20} className="text-[#16A34A]" />
                <span>{t('profile.facilityOperations')}</span>
              </h3>

              <div className="space-y-2.5">
                <NavLink
                  to="/recycler"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200/60 hover:border-emerald-300 text-stone-900 font-extrabold text-xs transition-all cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <Package size={16} className="text-[#16A34A]" />
                    <span>{t('recycler.incomingLots')}</span>
                  </span>
                  <ArrowRight size={14} className="text-stone-400" />
                </NavLink>

                <NavLink
                  to="/admin/anomalies"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/60 hover:border-rose-300 text-rose-900 font-extrabold text-xs transition-all cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <ShieldCheck size={16} className="text-rose-600" />
                    <span>MAD Z-Score Anomaly Engine</span>
                  </span>
                  <ArrowRight size={14} className="text-rose-400" />
                </NavLink>

                <NavLink
                  to="/minerals"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/60 hover:border-amber-300 text-amber-900 font-extrabold text-xs transition-all cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <TrendingUp size={16} className="text-amber-600" />
                    <span>{t('minerals.title')}</span>
                  </span>
                  <ArrowRight size={14} className="text-amber-400" />
                </NavLink>
              </div>
            </div>
          </div>

          {/* Recycler Facility Settings */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-stone-900 text-base">{t('recycler.facilitySettings')}</h3>
                <p className="text-xs text-stone-500">Set pickup, area, materials, and address.</p>
              </div>
              {facilitySettingsSaved && <span className="text-xs font-bold text-emerald-700">Saved</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center justify-between bg-stone-50 rounded-2xl p-3 border border-stone-200/60">
                <span className="text-xs font-extrabold text-stone-800">{t('recycler.pickupService')}</span>
                <button type="button" onClick={() => setPickupAvailable(value => !value)} aria-pressed={pickupAvailable} className={`relative w-10 h-5 rounded-full cursor-pointer ${pickupAvailable ? 'bg-[#16A34A]' : 'bg-stone-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${pickupAvailable ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <label className="flex items-center justify-between bg-stone-50 rounded-2xl p-3 border border-stone-200/60 text-xs font-extrabold text-stone-800">
                {t('recycler.serviceArea')}
                <select value={serviceRadius} onChange={event => setServiceRadius(Number(event.target.value))} className="p-1.5 rounded-lg border border-stone-300 bg-white text-xs font-bold">
                  {[5, 10, 20, 50, 100].map(radius => <option key={radius} value={radius}>{formatVernacularNumber(radius, currentLang)} km</option>)}
                </select>
              </label>
              <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/60">
                <div className="text-xs font-extrabold text-stone-800 mb-2">{t('recycler.materialsAccepted')}</div>
                <div className="flex flex-wrap gap-1.5">
                  {facilityMaterials.map(([id, icon, label]) => {
                    const accepted = materialsAccepted.includes(id);
                    return <button key={id} type="button" onClick={() => setMaterialsAccepted(current => accepted ? current.filter(item => item !== id) : [...current, id])} className={`px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer ${accepted ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-white border-stone-200 text-stone-500'}`}>{icon} {label}</button>;
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3">
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5"><MapPin size={14} /> {t('recycler.facilityAddress')}</div>
                <div className="text-xs font-bold text-stone-800 truncate mt-1">{facilityAddress}</div>
              </div>
              <button type="button" onClick={() => setShowFacilityMap(true)} className="shrink-0 px-3 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold cursor-pointer hover:bg-emerald-100">Change address</button>
            </div>

            <button type="button" onClick={saveFacilitySettings} disabled={savingFacilitySettings} className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer">
              <Save size={15} /> {savingFacilitySettings ? 'Saving...' : t('recycler.saveSettings')}
            </button>
          </div>

          <LocationPickerModal
            isOpen={showFacilityMap}
            onClose={() => setShowFacilityMap(false)}
            onSelectLocation={(lat, lng, address) => { setFacilityLat(lat); setFacilityLng(lng); setFacilityAddress(address); }}
            initialLat={facilityLat}
            initialLng={facilityLng}
            title="Choose facility address"
          />
        </div>
      ) : (
        /* Collector Specific Section */
        <>
          {/* Digital Authorization Badge */}
          {accountType === 'independent' ? (
            /* ── Independent Collector: QR-based Collection Agent Badge ── */
            <div className="bg-stone-900 text-white rounded-3xl p-5 space-y-4 border border-stone-800 shadow-xl">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-stone-950 flex items-center justify-center shadow-md shrink-0">
                    <Award size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                      {t('profile.agentBadge')}
                    </span>
                    <h4 className="font-extrabold text-white text-sm leading-tight">
                      {getLocalizedRoleName('independent', currentLang)}
                    </h4>
                  </div>
                </div>
                <span className="bg-emerald-500 text-stone-950 text-[10px] font-black px-2.5 py-1 rounded-full shrink-0">ACTIVE ✓</span>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center gap-3 bg-white rounded-2xl p-4">
                <QRCodeSVG
                  value={`kabadiwala://verify/${authBadgeRef}`}
                  size={140}
                  bgColor="#ffffff"
                  fgColor="#1c1917"
                  level="M"
                  includeMargin={false}
                />
                <div className="text-center">
                  <div className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Scan to Verify Agent</div>
                  <div className="font-mono text-xs font-black text-stone-900 mt-0.5">{authBadgeRef}</div>
                </div>
              </div>

              <div className="bg-stone-800/80 rounded-2xl p-3 text-xs text-stone-300 space-y-1.5 font-mono">
                <div className="flex justify-between border-b border-stone-700 pb-1.5">
                  <span className="text-stone-400">Badge Ref:</span>
                  <strong className="text-emerald-400">{authBadgeRef}</strong>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-stone-400">Operating Area:</span>
                  <strong className="text-white">{locality}</strong>
                </div>
              </div>

              <NavLink
                to={`/verify/${encodeURIComponent(authBadgeRef)}`}
                className="w-full bg-[#16A34A] hover:bg-emerald-700 text-white font-extrabold py-2.5 px-3 rounded-2xl text-xs flex items-center justify-center space-x-1.5 shadow-md transition-all"
              >
                <ShieldCheck size={16} />
                <span>Verify Agent Badge</span>
                <ArrowRight size={14} />
              </NavLink>
            </div>
          ) : (
            /* ── Shop / Feriwala: standard auth badge ── */
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-card p-4 shadow-soft space-y-2.5">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Award size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">{t('profile.agentBadge')}</span>
                    <h4 className="font-bold text-stone-900 text-sm leading-tight">{getLocalizedRoleName(accountType, currentLang)}</h4>
                  </div>
                </div>
                <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">ACTIVE ✓</span>
              </div>

              <p className="text-xs text-stone-700 font-medium">
                Issued by: <strong className="text-stone-900">EcoRecycle India (MPCB Verified)</strong><br />
                Ref No: <span className="font-mono text-stone-900 font-bold">{authBadgeRef}</span>
              </p>

              <NavLink
                to={`/verify/${encodeURIComponent(authBadgeRef)}`}
                className="tap-target w-full bg-white border border-emerald-300 hover:border-emerald-500 text-emerald-800 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>Verify Digital Authorization Badge</span>
                <ArrowRight size={14} />
              </NavLink>
            </div>
          )}

          {/* Shop Owner: QR / Shop Code Panel */}
          {accountType === 'shop' && shopCode && (
            <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft space-y-3">
              <h3 className="font-bold text-stone-900 text-sm flex items-center space-x-1.5">
                <QrCode size={16} className="text-brand-600" />
                <span>{t('profile.shopCode')}</span>
              </h3>

              <div className="bg-stone-900 text-white p-4 rounded-2xl space-y-2 text-center">
                <div className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">{t('profile.shopCode')}</div>
                <div className="text-2xl font-black font-mono tracking-widest">{shopCode}</div>
                <div className="text-[11px] text-stone-400">Share with your door-to-door feriwalas to link them</div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center justify-center space-x-1.5 mx-auto bg-stone-700 hover:bg-stone-600 text-white text-xs font-bold py-1.5 px-4 rounded-lg transition-all"
                >
                  {copied ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? t('profile.codeCopied') : t('profile.copyCode')}</span>
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
                  <span>{t('profile.linkedFeriwalas')} ({formatVernacularNumber(feriwalas.length, currentLang)})</span>
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
                          {formatVernacularNumber(fw.phone_number, currentLang)} • Joined {new Date(fw.created_at).toLocaleDateString('en-IN')}
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
                const raw = window.localStorage?.getItem('kabadiwala_user');
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
                  <div className="space-y-2 py-2">
                    <p className="text-xs text-stone-500 font-medium">Enter your shop code to link your account.</p>
                    <div className="flex gap-2">
                      <input
                        value={shopCodeInput}
                        onChange={event => setShopCodeInput(event.target.value.toUpperCase())}
                        placeholder="SHOP-1234"
                        className="min-w-0 flex-1 px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-mono font-bold uppercase"
                      />
                      <button
                        type="button"
                        onClick={handleLinkShop}
                        disabled={isLinkingShop || !shopCodeInput.trim()}
                        className="px-3 py-2 rounded-xl bg-[#16A34A] text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                      >
                        {isLinkingShop ? 'Linking...' : 'Link shop'}
                      </button>
                    </div>
                    {shopLinkMessage && <p className="text-[11px] font-semibold text-emerald-700">{shopLinkMessage}</p>}
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
