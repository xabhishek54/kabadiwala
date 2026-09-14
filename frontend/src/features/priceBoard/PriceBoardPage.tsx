import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedLocalPriceCache, type LocalPriceCache } from '../../data/local/db';
import { AudioButton } from '../../components/AudioButton';
import {
  TrendingUp, TrendingDown, Minus, ShieldCheck, MapPin, Search,
  ArrowRight, PlusCircle, Globe, CheckCircle2, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { fetchPrices, submitFieldPriceReport, syncCommodityIndex } from '../../data/remote/apiClient';

export const PriceBoardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingIndex, setIsSyncingIndex] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    try { return localStorage.getItem('kabadiwala_last_sync'); } catch { return null; }
  });

  // Field Report Form State
  const [reportCategory, setReportCategory] = useState('PCB');
  const [reportPrice, setReportPrice] = useState('');
  const [reportNotes, setReportNotes] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const [district, setDistrict] = useState<string>(() => {
    try {
      return (typeof window !== 'undefined' && window.localStorage && localStorage.getItem('kabadiwala_district')) || 'Mumbai';
    } catch {
      return 'Mumbai';
    }
  });

  const districts = ['Mumbai', 'Pune', 'Thane', 'Nagpur', 'Nashik', 'Pimpri-Chinchwad'];

  const categoryTabList = ['All', 'Paper', 'Plastic', 'Metal', 'E-waste', 'Other'];

  const loadBackendPrices = async (targetDistrict: string = district) => {
    setIsRefreshing(true);
    try {
      const serverPrices = await fetchPrices(targetDistrict);
      if (serverPrices && serverPrices.length > 0) {
        await db.priceCache.clear();
        const now = new Date().toISOString();
        await db.priceCache.bulkPut(
          serverPrices.map((p: any) => ({
            category: p.material_category,
            sub_category: p.sub_category,
            current_price: p.current_price,
            market_range_low: p.market_range_low || p.current_price * 0.9,
            market_range_high: p.market_range_high || p.current_price * 1.1,
            informal_reference_price: p.informal_reference_price,
            last_updated: p.updated_at || now,
            trend_direction: p.trend_direction as any,
            trend_slope: p.trend_slope || 0.0,
            district: targetDistrict,
          }))
        );
        // Record last successful sync time
        const syncTs = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        localStorage.setItem('kabadiwala_last_sync', syncTs);
        setLastSyncTime(syncTs);
      }
    } catch {
      await seedLocalPriceCache();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDistrictSelect = (d: string) => {
    setDistrict(d);
    try {
      localStorage.setItem('kabadiwala_district', d);
      window.dispatchEvent(new Event('district_changed'));
    } catch {}
    loadBackendPrices(d);
  };

  const handleSyncIndex = async () => {
    setIsSyncingIndex(true);
    try {
      await syncCommodityIndex(district);
      await loadBackendPrices(district);
      setReportSuccess(isEn ? 'LME Metal Index synced successfully!' : 'LME धातु सूचकांक सिंक हो गया!');
      setTimeout(() => setReportSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to sync commodity index:', err);
    } finally {
      setIsSyncingIndex(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportPrice || isNaN(Number(reportPrice))) return;
    setIsSubmittingReport(true);
    try {
      await submitFieldPriceReport({
        category: reportCategory,
        price_per_kg: parseFloat(reportPrice),
        district,
        notes: reportNotes,
      });
      setShowReportModal(false);
      setReportPrice('');
      setReportNotes('');
      setReportSuccess(isEn ? 'Street price report recorded into price engine!' : 'स्ट्रीट भाव डेटाबेस में दर्ज किया गया!');
      setTimeout(() => setReportSuccess(null), 4000);
      await loadBackendPrices(district);
    } catch (err) {
      alert(isEn ? 'Failed to submit price report.' : 'रिपोर्ट भेजने में विफल।');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  useEffect(() => {
    seedLocalPriceCache();
    loadBackendPrices(district);
  }, []);

  const rawPrices = useLiveQuery(() => db.priceCache.toArray(), []) || [];

  // Categorize items into Paper, Plastic, Metal, E-waste, Other
  const getItemTabGroup = (cat: string): string => {
    const uppercase = cat.toUpperCase();
    if (['PCB', 'BATTERY', 'CABLE', 'LCD_PANEL', 'CRT', 'MOTOR_MAGNET', 'E_WASTE'].some(k => uppercase.includes(k))) return 'E-waste';
    if (['NEWSPAPER', 'CARTON', 'BOOKS', 'GREY_BOARD', 'COPY', 'PAPER'].some(k => uppercase.includes(k))) return 'Paper';
    if (['MIX_PLASTIC', 'SOFT_PLASTIC', 'HARD_PLASTIC', 'PLASTIC_JAR', 'POLYTHENE', 'PLASTIC'].some(k => uppercase.includes(k))) return 'Plastic';
    if (['IRON', 'TIN', 'ALUMINIUM', 'STEEL', 'METAL', 'COPPER', 'BRASS'].some(k => uppercase.includes(k))) return 'Metal';
    return 'Other';
  };

  const getItemIcon = (cat: string) => {
    const uppercase = cat.toUpperCase();
    if (uppercase.includes('NEWSPAPER')) return '📰';
    if (uppercase.includes('CARTON')) return '📦';
    if (uppercase.includes('MIX_PLASTIC') || uppercase.includes('PLASTIC')) return '🧴';
    if (uppercase.includes('BOOKS') || uppercase.includes('COPY')) return '📚';
    if (uppercase.includes('IRON')) return '⛓️';
    if (uppercase.includes('TIN')) return '🥫';
    if (uppercase.includes('GREY_BOARD')) return '📑';
    if (uppercase.includes('PCB')) return '🔌';
    if (uppercase.includes('BATTERY')) return '🔋';
    if (uppercase.includes('CABLE')) return '🧵';
    if (uppercase.includes('ALUMINIUM')) return '🥛';
    if (uppercase.includes('STEEL')) return '🥣';
    if (uppercase.includes('LCD')) return '🖥️';
    if (uppercase.includes('CRT')) return '📺';
    return '♻️';
  };

  const getDisplayName = (item: LocalPriceCache) => {
    if (item.sub_category && item.sub_category !== item.category) {
      return item.sub_category;
    }
    const mapped = t(`categories.${item.category}`, { defaultValue: item.category });
    return mapped;
  };

  // Filter items by Active Tab & Search Query
  const filteredPrices = rawPrices.filter((item) => {
    const group = getItemTabGroup(item.category);
    if (activeTab !== 'All' && group !== activeTab) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = getDisplayName(item).toLowerCase();
      const cat = item.category.toLowerCase();
      return name.includes(q) || cat.includes(q);
    }
    return true;
  });

  return (
    <div className="pb-24 pt-4 px-3 sm:px-6 max-w-md sm:max-w-3xl md:max-w-5xl lg:max-w-6xl mx-auto space-y-4 font-sans">
      {/* Top Search & Location Header Bar (Matching Light Theme) */}
      <div className="flex items-center space-x-2">
        {/* Location Selector Dropdown */}
        <div className="relative">
          <div className="flex items-center space-x-1.5 bg-surface-card border border-surface-border hover:border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 shadow-soft cursor-pointer transition-all">
            <MapPin size={14} className="text-brand-600 shrink-0" />
            <select
              value={district}
              onChange={(e) => handleDistrictSelect(e.target.value)}
              className="bg-transparent text-stone-900 font-bold focus:outline-none cursor-pointer pr-1"
            >
              {districts.map((d) => (
                <option key={d} value={d} className="bg-white text-stone-900">
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Bar Input */}
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-2.5 text-stone-400" />
          <input
            type="text"
            placeholder={isEn ? "Search any materials..." : "कोई भी सामग्री खोजें..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2 bg-surface-card border border-surface-border focus:border-brand-500 rounded-xl text-xs font-medium text-stone-900 placeholder-stone-400 shadow-soft focus:outline-none transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills (Matching Screenshot Layout in Light Theme) */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-0.5">
        {categoryTabList.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-surface-card text-stone-700 border border-surface-border hover:bg-stone-100 shadow-soft'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Success Notification Banner */}
      {reportSuccess && (
        <div className="bg-emerald-600 text-white text-xs font-bold p-3 rounded-xl shadow-md flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 size={16} />
            <span>{reportSuccess}</span>
          </div>
          <button onClick={() => setReportSuccess(null)}><X size={14} /></button>
        </div>
      )}

      {/* Strategy Transparency & Quick Action Bar */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-3 flex items-center justify-between text-xs text-stone-700 shadow-soft">
        <div className="flex items-center space-x-2">
          <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
          <span className="font-semibold text-[11px] text-stone-700">
            {isEn ? 'Live market rates (4 Dynamic Strategies)' : 'रीसायकलर व फ़ील्ड रिपोर्ट से लाइव दरें'}
          </span>
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleSyncIndex}
            disabled={isSyncingIndex}
            title="Sync LME Index"
            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 transition-all"
          >
            <Globe size={13} className={isSyncingIndex ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowReportModal(true)}
            className="bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-300 px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center space-x-1 transition-all"
          >
            <PlusCircle size={12} />
            <span>{isEn ? '+ Report Price' : '+ रिपोर्ट भाव'}</span>
          </button>
        </div>
      </div>

      {/* Last Sync Status Banner */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-semibold border ${
        isRefreshing
          ? 'bg-blue-50 border-blue-200 text-blue-700'
          : lastSyncTime
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}>
        <span>
          {isRefreshing
            ? (isEn ? '🔄 Syncing prices...' : '🔄 कीमतें सिंक हो रही हैं...')
            : lastSyncTime
              ? (isEn ? `🟢 Synced · ${lastSyncTime}` : `🟢 अपडेट · ${lastSyncTime}`)
              : (isEn ? '🟠 Showing cached prices — tap refresh' : '🟠 कैश्ड कीमतें दिख रही हैं')}
        </span>
        {!isRefreshing && (
          <button onClick={() => loadBackendPrices(district)} className="underline font-bold text-[10px]">
            {isEn ? 'Refresh' : 'रिफ्रेश'}
          </button>
        )}
      </div>

      {/* Material Grid (2 Columns Mobile / 4-5 Columns Desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filteredPrices.map((item, idx) => {
          const itemKey = `${item.category}_${item.sub_category || idx}`;
          const isExpanded = expandedCategory === itemKey;
          const displayName = getDisplayName(item);
          const icon = getItemIcon(item.category);
          // Natural spoken price in active language
          const audioText = isEn
            ? `${displayName}. Verified recycler rate: ${item.current_price} rupees per kilogram. Street reference: ${item.informal_reference_price || Math.round(item.current_price * 0.85)} rupees.`
            : `${displayName}। रीसायकलर दर: ${item.current_price} रुपये प्रति किलो। लोकल स्ट्रीट भाव: ${item.informal_reference_price || Math.round(item.current_price * 0.85)} रुपये।`;

          return (
            <div
              key={`${item.category}_${item.sub_category || ""}_${idx}`}
              className={`bg-surface-card border rounded-card p-3 cursor-pointer transition-all shadow-soft hover:shadow-elevated ${
                isExpanded
                  ? 'border-brand-500 bg-brand-50/40 col-span-2 sm:col-span-2 ring-2 ring-brand-500/20'
                  : 'border-surface-border hover:border-brand-400'
              }`}
              onClick={() => setExpandedCategory(isExpanded ? null : itemKey)}
            >
              {/* Card Header Row */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-xl shrink-0 shadow-xs">
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-stone-900 text-xs sm:text-sm truncate leading-tight">
                    {displayName}
                  </h3>
                  <div className="text-brand-600 font-black text-sm sm:text-base mt-0.5 tracking-tight">
                    ₹{item.current_price}
                    <span className="text-[10px] font-semibold text-stone-500 ml-0.5">/kg</span>
                  </div>
                </div>

                <div className="text-stone-400">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={14} />}
                </div>
              </div>

              {/* Inline Compact Expansion Drawer (Small & Non-intrusive) */}
              {isExpanded && (
                <div className="mt-3 pt-2.5 border-t border-stone-200/80 space-y-2 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                  {/* Sparkline + Trend Pill */}
                  {(() => {
                    const slope = item.trend_slope || 0;
                    const base = item.current_price;
                    // Generate 7 synthetic data points using slope
                    const pts = Array.from({ length: 7 }, (_, i) => base - slope * (6 - i) + (Math.sin(i * 1.3) * slope * 0.4));
                    const min = Math.min(...pts);
                    const max = Math.max(...pts);
                    const range = max - min || 1;
                    const w = 80; const h = 28;
                    const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / 6) * w} ${h - ((v - min) / range) * h}`).join(' ');
                    const color = item.trend_direction === 'up' ? '#10b981' : item.trend_direction === 'down' ? '#f43f5e' : '#94a3b8';
                    const pct = Math.abs(slope / base * 100 * 7).toFixed(1);
                    return (
                      <div className="flex items-center justify-between bg-white rounded-xl border border-stone-200 px-2.5 py-2 shadow-xs">
                        <div className="flex items-center space-x-2">
                          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
                            <path d={d} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                          item.trend_direction === 'up' ? 'bg-emerald-100 text-emerald-800' :
                          item.trend_direction === 'down' ? 'bg-rose-100 text-rose-800' :
                          'bg-stone-100 text-stone-600'
                        }`}>
                          {item.trend_direction === 'up' ? `↑ ${pct}%` : item.trend_direction === 'down' ? `↓ ${pct}%` : '→ Stable'}
                        </span>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Verified Recycler Price */}
                    <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200 shadow-xs">
                      <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wide">{isEn ? '✓ Verified Rate' : '✓ रीसायकलर दर'}</div>
                      <div className="font-black text-emerald-800 text-sm">₹{item.current_price}/kg</div>
                    </div>

                    {/* Informal Street Reference */}
                    <div className="bg-amber-50 p-2 rounded-xl border border-amber-200 shadow-xs">
                      <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">{isEn ? 'Street Ref' : 'लोकल भाव'}</div>
                      <div className="font-black text-amber-800 text-sm">₹{item.informal_reference_price || Math.round(item.current_price * 0.85)}/kg</div>
                    </div>
                  </div>

                  {/* Range & Audio Action Bar */}
                  <div className="bg-white p-2 rounded-xl border border-stone-200 flex items-center justify-between text-xs shadow-xs">
                    <div>
                      <span className="text-[10px] text-stone-500">{isEn ? 'Market Range' : 'बाजार सीमा'}: </span>
                      <span className="font-bold text-stone-800">₹{item.market_range_low || Math.round(item.current_price * 0.9)} – ₹{item.market_range_high || Math.round(item.current_price * 1.1)}</span>
                    </div>
                    <AudioButton textToSpeak={audioText} size={16} />
                  </div>

                  {/* Dynamic Sync Timestamp */}
                  <div className="flex items-center justify-between text-[10px] text-stone-500 bg-stone-100/80 px-2 py-1 rounded-lg">
                    <span>{lastSyncTime ? (isEn ? `Updated: ${lastSyncTime}` : `अपडेट: ${lastSyncTime}`) : (isEn ? 'Cached data' : 'कैश्ड डेटा')}</span>
                    <span className="font-semibold text-stone-700">{isEn ? 'Verified recycler offer' : 'रीसायकलर ऑफर'}</span>
                  </div>

                  {/* Create Lot Action Button */}
                  <NavLink
                    to="/create-lot"
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1 shadow-sm transition-all active:scale-95"
                  >
                    <span>{isEn ? 'Sell This Material' : 'यह सामान बेचें'}</span>
                    <ArrowRight size={14} />
                  </NavLink>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredPrices.length === 0 && (
        <div className="text-center py-12 bg-surface-card rounded-card border border-surface-border space-y-2">
          <p className="text-stone-500 text-sm font-medium">{isEn ? 'No materials match your search.' : 'कोई सामग्री नहीं मिली।'}</p>
          <button onClick={() => { setSearchQuery(''); setActiveTab('All'); }} className="text-xs text-brand-600 font-bold underline">
            {isEn ? 'Reset Filters' : 'फ़िल्टर रीसेट करें'}
          </button>
        </div>
      )}

      {/* Collector Field Price Report Modal (Strategy 3) */}
      {showReportModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full space-y-4 shadow-2xl border border-stone-200 animate-fadeIn text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="font-bold text-stone-900 text-base">{isEn ? 'Report Street Price' : 'स्ट्रीट भाव रिपोर्ट करें'}</h3>
                <p className="text-[11px] text-stone-500">{isEn ? 'Enter local scrap dealer offered rate' : 'स्थानीय कबाड़ीवाला द्वारा offered दर दर्ज करें'}</p>
              </div>
              <button onClick={() => setShowReportModal(false)} className="text-stone-400 hover:text-stone-700 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">{isEn ? 'Material Category' : 'सामग्री श्रेणी'}</label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="PCB">PCB (Circuit Boards)</option>
                  <option value="BATTERY">Battery (Lithium/Lead)</option>
                  <option value="CABLE">Copper Cables / Wires</option>
                  <option value="LCD_PANEL">LCD / Monitor Panels</option>
                  <option value="CRT">CRT TV / Monitor Glass</option>
                  <option value="IRON">Iron Scrap</option>
                  <option value="NEWSPAPER">Newspaper</option>
                  <option value="MIX_PLASTIC">Mix Plastic</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">{isEn ? 'Street Price (₹ / kg)' : 'स्ट्रीट भाव (₹ / किग्रा)'}</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  placeholder="e.g. 14"
                  value={reportPrice}
                  onChange={(e) => setReportPrice(e.target.value)}
                  className="w-full text-sm font-semibold p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">{isEn ? 'Notes (Optional)' : 'टिप्पणी (Optional)'}</label>
                <input
                  type="text"
                  placeholder="e.g. Local scrap dealer quote"
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-stone-300"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="w-1/2 py-2.5 rounded-xl text-xs font-bold border border-stone-300 text-stone-600 hover:bg-stone-50"
                >
                  {isEn ? 'Cancel' : 'रद्द करें'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="w-1/2 py-2.5 rounded-xl text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmittingReport ? '...' : (isEn ? 'Submit Report' : 'रिपोर्ट भेजें')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
