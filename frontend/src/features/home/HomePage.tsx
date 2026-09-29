import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/local/db';
import { fetchRecyclerMatches } from '../../data/remote/apiClient';
import { formatVernacularNumber, formatVernacularCurrency } from '../../utils/vernacularFormatter';
import {
  Camera, IndianRupee, MapPin, ArrowRight,
  Package, CheckCircle2, Clock,
  Bell, User, Star
} from 'lucide-react';

/* Category circular icons matching reference image CTA banner */
const CATEGORIES = [
  { label: 'Cables & Wire', icon: '🔌', bg: 'bg-amber-100 text-amber-800' },
  { label: 'Batteries',     icon: '🔋', bg: 'bg-blue-100 text-blue-800' },
  { label: 'PCBs',          icon: '🖥️', bg: 'bg-emerald-100 text-emerald-800' },
  { label: 'Metals',        icon: '⚙️', bg: 'bg-stone-200 text-stone-800' },
  { label: 'Plastics',      icon: '🧴', bg: 'bg-cyan-100 text-cyan-800' },
  { label: 'CRT/LCD',       icon: '📺', bg: 'bg-purple-100 text-purple-800' },
  { label: 'Motors',        icon: '⚡', bg: 'bg-orange-100 text-orange-800' },
];

/* Sample nearby recyclers matching reference image */
const NEARBY_RECYCLERS = [
  {
    id: 'rec-001',
    name: 'GreenCycle Recyclers',
    distance: '2.4 km',
    authorized: true,
    rating: '4.6',
    reviews: 120,
    avatarBg: 'bg-emerald-600',
    avatarText: '🌱',
  },
  {
    id: 'rec-002',
    name: 'EcoMetal Solutions',
    distance: '3.8 km',
    authorized: true,
    rating: '4.3',
    reviews: 86,
    avatarBg: 'bg-teal-600',
    avatarText: '♻️',
  },
  {
    id: 'rec-003',
    name: 'Shree E-Waste Pvt. Ltd.',
    distance: '5.1 km',
    authorized: true,
    rating: '4.1',
    reviews: 64,
    avatarBg: 'bg-indigo-600',
    avatarText: '🏢',
  },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'en';

  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [district] = useState(localStorage.getItem('kabadiwala_district') || 'Pune, Maharashtra');
  const [showNotifications, setShowNotifications] = useState(false);
  const [nearbyRecyclersList, setNearbyRecyclersList] = useState<any[]>(NEARBY_RECYCLERS);
  const [authorizedCount, setAuthorizedCount] = useState<number>(3);
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('kabadiwala_user') || 'null'); } catch { return null; }
  })();
  const collectorId = localStorage.getItem('kabadiwala_collector_id') || storedUser?.id || 'col-demo-101';

  // Query live local IndexedDB lots & transactions
  const liveTransactions = useLiveQuery(
    () => db.transactions.where('collector_id').equals(collectorId).toArray(),
    [collectorId]
  ) || [];
  const liveMaterials = useLiveQuery(
    () => db.materials.where('collector_id').equals(collectorId).toArray(),
    [collectorId]
  ) || [];

  useEffect(() => {
    const raw = localStorage.getItem('kabadiwala_user');
    try {
      const u = raw ? JSON.parse(raw) : null;
      setUser(u);
      if (u?.role === 'recycler') {
        navigate('/recycler', { replace: true });
        return;
      }
    } catch { /* */ }

    // Fetch live recyclers
    async function loadRecyclers() {
      try {
        const matches = await fetchRecyclerMatches('PCB');
        if (matches && matches.length > 0) {
          setAuthorizedCount(matches.length);
          setNearbyRecyclersList(matches.slice(0, 3).map((m: any) => ({
            id: m.recycler?.recycler_id || m.recycler_id || 'rec-001',
            name: m.recycler?.name || m.name || 'EcoRecycle Facility',
            distance: m.distance_km ? `${m.distance_km.toFixed(1)} km` : '2.4 km',
            authorized: true,
            rating: m.match_score ? (m.match_score * 5).toFixed(1) : '4.6',
            reviews: 42,
            avatarBg: 'bg-emerald-600',
            avatarText: '🌱',
          })));
        }
      } catch (err) {
        console.warn('Failed to fetch live recyclers for home page:', err);
      }
    }
    loadRecyclers();
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'Collector';

  // Compute dynamic metrics
  const liveTotalWeight = liveMaterials.reduce((acc, m) => acc + (m.approx_weight_kg || 0), 0);
  const liveTotalPayouts = liveTransactions.reduce((acc, t) => {
    if (t.payment_status === 'paid' || t.status === 'closed') {
      return acc + (t.final_sale_value || t.quoted_price || 0);
    }
    return acc;
  }, 0);
  const liveActiveCount = liveMaterials.filter(m => {
    const tx = liveTransactions.find(t => t.lot_id === m.lot_id);
    return !tx || (tx.status !== 'closed' && tx.payment_status !== 'paid');
  }).length;

  const displayTotalWeight = `${formatVernacularNumber(liveTotalWeight, currentLang)} kg`;
  const displayTotalPayouts = formatVernacularCurrency(liveTotalPayouts, currentLang);
  const displayActiveLots = formatVernacularNumber(liveActiveCount, currentLang);

  // Desktop Recent Lots list merged with live data
  const recentLotsList = liveMaterials.slice(0, 5).map(mat => {
    const tx = liveTransactions.find(t => t.lot_id === mat.lot_id);
    const isPaid = tx?.payment_status === 'paid' || tx?.status === 'closed';
    const isMatched = tx?.status === 'matched';
    const estVal = tx?.quoted_price || mat.estimated_value || 0;
    return {
      fullId: mat.lot_id,
      id: mat.lot_id.length > 12 ? `${mat.lot_id.slice(0, 10)}...` : mat.lot_id,
      name: mat.sub_category || mat.material_category || 'Scrap Lot',
      category: mat.material_category,
      weight: formatVernacularNumber(mat.approx_weight_kg || 0, currentLang),
      estimate: formatVernacularCurrency(estVal, currentLang),
      status: isPaid ? 'Paid' : isMatched ? 'Matched' : 'Draft',
      statusColor: isPaid ? 'bg-emerald-100 text-emerald-800' : isMatched ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800',
    };
  });

  return (
    <div className="pb-24 pt-4 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto space-y-5 font-sans">
      
      {/* DESKTOP TOP HEADER BAR */}
      <div className="hidden md:flex items-center justify-between">
        <h1 className="text-2xl font-black text-stone-900 tracking-tight">
          👋 {t('home.greeting', { name: firstName })}
        </h1>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-full px-4 py-2 text-xs font-bold text-stone-800 shadow-xs cursor-pointer hover:border-brand-500 transition-all">
            <MapPin size={15} className="text-brand-600" />
            <span>{district}</span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-600 hover:text-stone-900 shadow-xs transition-all relative"
            >
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl p-3 border border-stone-200 shadow-lg z-50 text-xs space-y-2">
                <div className="font-bold text-stone-900 border-b pb-1.5 flex justify-between items-center">
                  <span>{t('home.notifications')}</span>
                  <button onClick={() => setShowNotifications(false)} className="text-[10px] text-stone-400">{t('home.close')}</button>
                </div>
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-800 font-medium text-[11px]">
                  ✓ {t('home.systemOnline')}
                </div>
              </div>
            )}
          </div>

          <button type="button" onClick={() => navigate('/profile')} className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <User size={18} />
          </button>
        </div>
      </div>

      {/* MOBILE HEADER */}
      <div className="md:hidden">
        <h1 className="text-xl font-black text-stone-900 tracking-tight">
          👋 {t('home.greeting', { name: firstName })}
        </h1>
      </div>

      {/* DESKTOP 4 STAT CARDS ROW */}
      <div className="hidden md:grid grid-cols-4 gap-4">
        {/* Total Intake */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-1">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Package size={20} />
          </div>
          <div>
            <div className="text-xs text-stone-500 font-semibold">{t('home.totalIntake')}</div>
            <div className="text-2xl font-black text-stone-900">{displayTotalWeight}</div>
          </div>
        </div>

        {/* Disbursed Payouts */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-1">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <IndianRupee size={20} />
          </div>
          <div>
            <div className="text-xs text-stone-500 font-semibold">{t('home.disbursedPayouts')}</div>
            <div className="text-2xl font-black text-stone-900">{displayTotalPayouts}</div>
          </div>
        </div>

        {/* Active Lots */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-1">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-xs text-stone-500 font-semibold">{t('home.activeLots')}</div>
            <div className="text-2xl font-black text-stone-900">{displayActiveLots}</div>
          </div>
        </div>

        {/* Authorized Recyclers */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-1">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-xs text-stone-500 font-semibold">{t('home.authorizedRecyclers')}</div>
            <div className="text-2xl font-black text-stone-900">{formatVernacularNumber(authorizedCount, currentLang)}</div>
          </div>
        </div>
      </div>

      {/* CTA BANNER: Create New Lot */}
      {/* Desktop Version */}
      <div className="hidden md:flex items-center justify-between bg-[#F0FDF4] border border-[#DCFCE7] rounded-3xl p-6 shadow-xs">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
            <Camera size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-stone-900">{t('lotCreation.title')}</h2>
            <button
              type="button"
              onClick={() => navigate('/create-lot')}
              className="mt-1 inline-flex items-center gap-2 bg-[#16A34A] hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <span>{t('onboarding.getStarted')}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Circular Category Icons */}
        <div className="flex items-center gap-4 overflow-x-auto py-2">
          {CATEGORIES.map(cat => (
            <div key={cat.label} className="flex flex-col items-center gap-1.5 cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('/prices')}>
              <div className={`w-12 h-12 rounded-full ${cat.bg} flex items-center justify-center text-xl shadow-xs border border-stone-200/50`}>
                {cat.icon}
              </div>
              <span className="text-[11px] font-bold text-stone-700 whitespace-nowrap">{cat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Version */}
      <div
        onClick={() => navigate('/create-lot')}
        className="md:hidden bg-[#16A34A] text-white rounded-3xl p-4 flex items-center justify-between shadow-md cursor-pointer active:scale-98 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <Camera size={26} className="text-white" />
          </div>
          <div>
            <div className="text-base font-black leading-tight">{t('lotCreation.title')}</div>
            <div className="text-xs text-white/80 font-medium mt-0.5">{t('home.photoSubtitle')}</div>
          </div>
        </div>

        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <ArrowRight size={18} className="text-white" />
        </div>
      </div>

      {/* MOBILE 2x2 QUICK ACCESS TILES */}
      <div className="md:hidden grid grid-cols-2 gap-4">
        {/* Tile 1: Price Board */}
        <button
          type="button"
          onClick={() => navigate('/prices')}
          className="bg-[#EFF4FF] border border-[#DCE6FF] rounded-3xl p-5 text-left shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-3.5 min-h-[96px]"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#DBE7FE] text-blue-700 flex items-center justify-center text-2xl font-bold shrink-0">
            💰
          </div>
          <div className="font-extrabold text-stone-900 text-base leading-tight">{t('nav.prices')}</div>
        </button>

        {/* Tile 2: Find Recyclers */}
        <button
          type="button"
          onClick={() => navigate('/recyclers')}
          className="bg-[#ECFDF5] border border-[#D1FAE5] rounded-3xl p-5 text-left shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-3.5 min-h-[96px]"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#A7F3D0] text-emerald-800 flex items-center justify-center text-2xl font-bold shrink-0">
            📍
          </div>
          <div className="font-extrabold text-stone-900 text-base leading-tight">{t('nav.recyclers')}</div>
        </button>

        {/* Tile 3: My Earnings */}
        <button
          type="button"
          onClick={() => navigate('/ledger')}
          className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-3xl p-5 text-left shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-3.5 min-h-[96px]"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#BBF7D0] text-green-900 flex items-center justify-center text-2xl font-bold shrink-0">
            ₹
          </div>
          <div className="font-extrabold text-stone-900 text-base leading-tight">{t('nav.ledger')}</div>
        </button>

        {/* Tile 4: Safety Guide */}
        <button
          type="button"
          onClick={() => navigate('/safety')}
          className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-3xl p-5 text-left shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-3.5 min-h-[96px]"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#FDE68A] text-amber-900 flex items-center justify-center text-2xl font-bold shrink-0">
            🛡️
          </div>
          <div className="font-extrabold text-stone-900 text-base leading-tight">{t('nav.safety')}</div>
        </button>
      </div>

      {/* DESKTOP 2-COLUMN SECTION: Recent Lots (Left) + Nearby Recyclers (Right) */}
      <div className="hidden md:grid grid-cols-2 gap-6">
        
        {/* Left Column: Recent Lots */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-stone-900 text-base">{t('nav.lots')}</h3>
            <button type="button" onClick={() => navigate('/lots')} className="text-xs font-bold text-emerald-600 hover:underline">
              {t('home.viewAll')}
            </button>
          </div>

          <div className="space-y-3">
            {/* Table Header */}
            <div className="grid grid-cols-12 text-[11px] font-bold text-stone-400 uppercase tracking-wider pb-1 border-b border-stone-100">
              <span className="col-span-2">{t('home.lotId')}</span>
              <span className="col-span-4">{t('home.material')}</span>
              <span className="col-span-2">{t('home.weight')}</span>
              <span className="col-span-2">{t('home.estimate')}</span>
              <span className="col-span-2 text-right">{t('home.status')}</span>
            </div>

            {/* Rows */}
            {recentLotsList.map(lot => (
              <div key={lot.fullId} className="grid grid-cols-12 items-center text-xs py-2 hover:bg-stone-50 rounded-xl px-1 transition-colors cursor-pointer" onClick={() => navigate('/lots')}>
                <span className="col-span-2 font-mono font-semibold text-stone-500">{lot.id}</span>
                <div className="col-span-4 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                    📦
                  </div>
                  <div>
                    <div className="font-bold text-stone-900">{lot.name}</div>
                    <div className="text-[10px] text-stone-400">{lot.category}</div>
                  </div>
                </div>
                <span className="col-span-2 font-semibold text-stone-700">{lot.weight} kg</span>
                <div className="col-span-2">
                  <div className="font-bold text-stone-900">{lot.estimate}</div>
                </div>
                <div className="col-span-2 text-right">
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${lot.statusColor}`}>
                    {lot.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Nearby Authorized Recyclers */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-stone-900 text-base">{t('match.findRecyclers')}</h3>
            <button type="button" onClick={() => navigate('/recyclers')} className="text-xs font-bold text-emerald-600 hover:underline">
              {t('home.viewAll')}
            </button>
          </div>

          <div className="space-y-3">
            {nearbyRecyclersList.map(rec => (
              <div key={rec.id} className="flex items-center justify-between p-3 rounded-2xl border border-stone-100 bg-stone-50/60 hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl ${rec.avatarBg} text-white flex items-center justify-center text-lg font-bold shadow-xs shrink-0`}>
                    {rec.avatarText}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-stone-900 text-xs sm:text-sm">{rec.name}</span>
                      <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold" title="Verified">✓</span>
                    </div>
                    <div className="text-[11px] text-stone-500 font-medium">
                      {rec.distance} • {t('home.authorized')}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 mt-0.5">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      <span>{formatVernacularNumber(rec.rating, currentLang)} ({formatVernacularNumber(rec.reviews, currentLang)})</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/recyclers')}
                  className="bg-[#16A34A] hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  {t('home.select')}
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
