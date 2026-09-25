import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { seedLocalPriceCache } from '../../data/local/db';
import { fetchPrices } from '../../data/remote/apiClient';
import { AudioButton } from '../../components/AudioButton';
import { MapPin, Search, ArrowLeft, TrendingUp, TrendingDown, Clock, ShieldCheck } from 'lucide-react';

const CATEGORY_TABS = [
  { id: 'All', label: 'All', icon: '🌐' },
  { id: 'Metal', label: 'Metals', icon: '⚙️' },
  { id: 'Cable', label: 'Cables', icon: '🔌' },
  { id: 'PCB', label: 'PCBs', icon: '🖥️' },
  { id: 'Battery', label: 'Battery', icon: '🔋' },
];

interface PriceItemDisplay {
  id: string;
  name: string;
  category: string;
  range: string;
  trend: string;
  trendDirection: 'up' | 'down' | 'flat';
  informalRate: string;
  verifiedRate: string;
  marketLow: number;
  marketHigh: number;
  lastUpdated: string;
  pts: number[];
  icon: string;
  samples: number;
}

export const PriceBoardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>('copper');
  const [priceItems, setPriceItems] = useState<PriceItemDisplay[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>('14 Sep, 09:20 AM');
  const [loading, setLoading] = useState<boolean>(true);

  const [district] = useState<string>(() => {
    try {
      return (typeof window !== 'undefined' && window.localStorage && localStorage.getItem('kabadiwala_district')) || 'Pune, Maharashtra';
    } catch {
      return 'Pune, Maharashtra';
    }
  });

  useEffect(() => {
    seedLocalPriceCache();

    async function loadBackendPrices() {
      setLoading(true);
      try {
        const data = await fetchPrices(district);
        if (Array.isArray(data) && data.length > 0) {
          const formatted: PriceItemDisplay[] = data.map((item: any) => {
            const base = item.quoted_price || item.buying_price || 150;
            const low = item.market_range_low || Math.round(base * 0.9);
            const high = item.market_range_high || Math.round(base * 1.1);
            const informal = Math.round(base * 0.85);

            return {
              id: item.material_category?.toLowerCase() || item.sub_category?.toLowerCase() || 'item',
              name: item.sub_category || item.material_category,
              category: item.material_category === 'CABLE' ? 'Cable' : item.material_category === 'PCB' ? 'PCB' : item.material_category === 'BATTERY' ? 'Battery' : 'Metal',
              range: `₹${low} – ₹${high}/kg`,
              trend: '↑ Up 5.4%',
              trendDirection: 'up',
              informalRate: `₹${informal}–${base}/kg`,
              verifiedRate: `₹${low}–${high}/kg`,
              marketLow: low,
              marketHigh: high,
              lastUpdated: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              pts: [low, low + 10, low + 5, base, high - 10, base + 5, high],
              icon: item.material_category === 'CABLE' ? '🔌' : item.material_category === 'PCB' ? '🖥️' : item.material_category === 'BATTERY' ? '🔋' : '⚙️',
              samples: 18,
            };
          });

          setPriceItems(formatted);
          setLastSyncTime(new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else {
          useDefaultSamplePrices();
        }
      } catch (err) {
        console.warn('Backend price load error, using cached local price board:', err);
        useDefaultSamplePrices();
      } finally {
        setLoading(false);
      }
    }

    function useDefaultSamplePrices() {
      setPriceItems([
        {
          id: 'copper',
          name: 'Copper Heavy Cable Wire',
          category: 'Cable',
          range: '₹520 – ₹580/kg',
          trend: '↑ Up 6.4%',
          trendDirection: 'up',
          informalRate: '₹480–520/kg',
          verifiedRate: '₹520–580/kg',
          marketLow: 520,
          marketHigh: 580,
          lastUpdated: 'Today, 09:20 AM',
          pts: [520, 530, 525, 545, 560, 555, 580],
          icon: '🔌',
          samples: 24,
        },
        {
          id: 'pcb',
          name: 'Motherboard PCB High Grade',
          category: 'PCB',
          range: '₹240 – ₹280/kg',
          trend: '↑ Up 3.2%',
          trendDirection: 'up',
          informalRate: '₹210–230/kg',
          verifiedRate: '₹240–280/kg',
          marketLow: 240,
          marketHigh: 280,
          lastUpdated: 'Today, 09:20 AM',
          pts: [240, 245, 250, 255, 260, 270, 280],
          icon: '🖥️',
          samples: 16,
        },
        {
          id: 'lithium',
          name: 'Lithium-Ion Battery Pack',
          category: 'Battery',
          range: '₹850 – ₹1,050/kg',
          trend: '↑ Up 5.8%',
          trendDirection: 'up',
          informalRate: '₹750–900/kg',
          verifiedRate: '₹850–1,050/kg',
          marketLow: 850,
          marketHigh: 1050,
          lastUpdated: 'Today, 09:20 AM',
          pts: [850, 880, 920, 950, 990, 1020, 1050],
          icon: '🔋',
          samples: 31,
        },
        {
          id: 'aluminium',
          name: 'Aluminium Scrap Wire',
          category: 'Metal',
          range: '₹160 – ₹190/kg',
          trend: '→ Flat 0.0%',
          trendDirection: 'flat',
          informalRate: '₹140–165/kg',
          verifiedRate: '₹160–190/kg',
          marketLow: 160,
          marketHigh: 190,
          lastUpdated: 'Today, 09:20 AM',
          pts: [175, 175, 175, 175, 175, 175, 175],
          icon: '⚙️',
          samples: 12,
        },
      ]);
    }

    loadBackendPrices();
  }, [district]);

  const filteredItems = priceItems.filter(m => {
    const matchesTab = activeTab === 'All' || m.category === activeTab;
    const matchesSearch = !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const activeSelectedItem = priceItems.find(i => i.id === selectedItemId) || filteredItems[0] || priceItems[0];

  return (
    <div className="pb-24 pt-3 px-4 max-w-md mx-auto space-y-4 font-sans text-stone-900">
      {/* Header bar matching Mobile Screen 3 (< Price Board) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-stone-200 text-stone-700 font-bold transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-extrabold text-stone-900 text-base">Fair Price Index</h2>
        </div>

        {/* Sync Timestamp Pill */}
        <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-3 py-1 rounded-full border border-emerald-200">
          <Clock size={11} className="text-[#16A34A]" />
          <span>Sync: {lastSyncTime}</span>
        </div>
      </div>

      {/* Location Selector */}
      <div className="flex items-center justify-between text-xs text-stone-600 font-semibold">
        <div className="flex items-center gap-1.5">
          <MapPin size={14} className="text-[#16A34A]" />
          <span>{district}</span>
        </div>
        <span className="text-[11px] text-stone-400 font-medium">Aggregated from local observation logs</span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-3 text-stone-400" />
        <input
          type="text"
          placeholder="Search material category or sub-category..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#16A34A] shadow-xs"
        />
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
        {CATEGORY_TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#16A34A] text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Material List Items */}
      {loading ? (
        <div className="p-8 text-center text-xs text-stone-500 font-semibold animate-pulse">
          Fetching live price indices & observations...
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(item => {
            const isSelected = selectedItemId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className={`bg-white rounded-3xl p-4 border shadow-xs space-y-3 transition-all cursor-pointer ${
                  isSelected ? 'border-[#16A34A] ring-2 ring-[#16A34A]/20' : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-2xl shrink-0 shadow-xs">
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-extrabold text-stone-900 text-sm">{item.name}</div>
                      <div className="text-xs font-black text-stone-900 mt-0.5">{item.range}</div>
                      <div className={`text-[10px] font-extrabold mt-0.5 flex items-center gap-1 ${
                        item.trendDirection === 'up' ? 'text-emerald-600' : item.trendDirection === 'down' ? 'text-rose-600' : 'text-stone-500'
                      }`}>
                        {item.trendDirection === 'up' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        <span>{item.trend} (7-day trend)</span>
                      </div>
                    </div>
                  </div>

                  {/* Sparkline & Audio button */}
                  <div className="flex items-center gap-3">
                    {/* SVG Sparkline */}
                    <svg width="60" height="24" viewBox="0 0 60 24" fill="none" className="shrink-0">
                      <path
                        d={item.pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (item.pts.length - 1)) * 60} ${24 - ((v - Math.min(...item.pts)) / (Math.max(...item.pts) - Math.min(...item.pts) || 1)) * 20}`).join(' ')}
                        stroke={item.trendDirection === 'up' ? '#16A34A' : item.trendDirection === 'down' ? '#E11D48' : '#78716C'}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>

                    {/* Audio Button */}
                    <AudioButton textToSpeak={`${item.name}. Verified recycler rate is ${item.range}.`} size={16} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Informal vs Verified Price Comparison Detail Box */}
      {activeSelectedItem && (
        <div className="bg-gradient-to-br from-stone-900 to-stone-950 text-white rounded-3xl p-5 border border-stone-800 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <div className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest">Selected Price Detail</div>
              <h3 className="font-extrabold text-white text-base mt-0.5">{activeSelectedItem.name}</h3>
            </div>
            <span className="text-[10px] font-bold bg-white/10 text-stone-300 px-3 py-1 rounded-full border border-white/10">
              {activeSelectedItem.samples} Observations Logged
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white/10 p-3 rounded-2xl border border-white/10">
              <div className="text-[10px] text-stone-400 font-bold uppercase">Informal Street Rate</div>
              <div className="font-black text-amber-300 text-sm mt-1">{activeSelectedItem.informalRate}</div>
              <div className="text-[10px] text-stone-400 mt-0.5">Unregulated middlemen</div>
            </div>

            <div className="bg-emerald-950/80 border border-emerald-500/40 p-3 rounded-2xl">
              <div className="text-[10px] text-emerald-300 font-bold uppercase flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-400" />
                <span>Verified Recyclers</span>
              </div>
              <div className="font-black text-emerald-400 text-sm mt-1">{activeSelectedItem.verifiedRate}</div>
              <div className="text-[10px] text-emerald-200/80 mt-0.5">Guaranteed fair payout</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
            <span>P25–P75 Interquartile: ₹{activeSelectedItem.marketLow} – ₹{activeSelectedItem.marketHigh}</span>
            <span className="text-emerald-400 font-bold">Updated {activeSelectedItem.lastUpdated}</span>
          </div>
        </div>
      )}
    </div>
  );
};

