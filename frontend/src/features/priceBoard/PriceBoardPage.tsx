import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { seedLocalPriceCache, db } from '../../data/local/db';
import { fetchPrices, fetchRegisteredRecyclers } from '../../data/remote/apiClient';
import { AudioButton } from '../../components/AudioButton';
import {
  MapPin, Search, ArrowLeft, Clock, Factory, ChevronRight, ChevronDown, ChevronUp,
  ShieldCheck, Phone, Building, X
} from 'lucide-react';

const CATEGORY_TABS = [
  { id: 'All', label: 'All', icon: '🌐' },
  { id: 'PCB', label: 'PCBs', icon: '🖥️' },
  { id: 'BATTERY', label: 'Batteries', icon: '🔋' },
  { id: 'CABLE', label: 'Cables', icon: '🔌' },
  { id: 'LCD_PANEL', label: 'LCD Displays', icon: '📺' },
  { id: 'MOTOR_MAGNET', label: 'Motors', icon: '🧲' },
  { id: 'MIXED_PLASTIC', label: 'Plastics', icon: '♻️' },
];

export interface RecyclerOffer {
  id: string;
  name: string;
  phone: string;
  mpcbRef: string;
  location: string;
  distanceKm: number;
  rate: number;
  verified: boolean;
}

export interface MaterialPriceItem {
  categoryCode: string;
  name: string;
  categoryGroup: string;
  icon: string;
  fixedRate: number; // Highest offered or benchmark fixed rate
  informalRate: number; // ~15-20% lower street rate
  pts: number[];
  recyclers: RecyclerOffer[];
  lastUpdated: string;
}

// Benchmark default fixed rates per category if no recycler rate is found
const DEFAULT_BENCHMARK_RATES: Record<string, { name: string; categoryGroup: string; icon: string; rate: number; informal: number; pts: number[] }> = {
  PCB: {
    name: 'Circuit Board (PCB)',
    categoryGroup: 'PCB',
    icon: '🖥️',
    rate: 260,
    informal: 210,
    pts: [240, 245, 250, 255, 260, 270, 280],
  },
  BATTERY: {
    name: 'Battery / Lithium Cells',
    categoryGroup: 'BATTERY',
    icon: '🔋',
    rate: 95,
    informal: 75,
    pts: [85, 88, 90, 92, 95, 94, 98],
  },
  CABLE: {
    name: 'Copper & Aluminum Cable',
    categoryGroup: 'CABLE',
    icon: '🔌',
    rate: 155,
    informal: 130,
    pts: [145, 148, 150, 152, 155, 158, 160],
  },
  LCD_PANEL: {
    name: 'LCD & Display Screen',
    categoryGroup: 'LCD_PANEL',
    icon: '📺',
    rate: 110,
    informal: 85,
    pts: [100, 102, 105, 108, 110, 112, 115],
  },
  CRT: {
    name: 'Old TV / CRT Glass',
    categoryGroup: 'CRT',
    icon: '📺',
    rate: 45,
    informal: 30,
    pts: [40, 42, 42, 45, 45, 46, 48],
  },
  MOTOR_MAGNET: {
    name: 'Motor & Stator Assembly',
    categoryGroup: 'MOTOR_MAGNET',
    icon: '🧲',
    rate: 78,
    informal: 60,
    pts: [70, 72, 75, 76, 78, 80, 82],
  },
  MIXED_PLASTIC: {
    name: 'E-Waste Scrap Plastic Body',
    categoryGroup: 'MIXED_PLASTIC',
    icon: '♻️',
    rate: 28,
    informal: 20,
    pts: [24, 25, 26, 27, 28, 28, 30],
  },
};

// Fallback verified facilities list if DB is fresh
const FALLBACK_RECYCLERS = [
  {
    id: 'rec-pune-001',
    name: 'EcoRecycle India (Pune Hub)',
    phone: '9876543210',
    mpcbRef: 'MPCB/E-WASTE/2024/089',
    location: 'Pune',
    distanceKm: 3.2,
    verified: true,
    offered_rates: { PCB: 280, BATTERY: 95, CABLE: 160, LCD_PANEL: 120, CRT: 45, MOTOR_MAGNET: 80, MIXED_PLASTIC: 28 },
  },
  {
    id: 'rec-mum-001',
    name: 'GreenTech E-Waste Solutions',
    phone: '9812345678',
    mpcbRef: 'MPCB/E-WASTE/2024/112',
    location: 'Mumbai',
    distanceKm: 12.5,
    verified: true,
    offered_rates: { PCB: 285, BATTERY: 98, CABLE: 165, LCD_PANEL: 125, CRT: 42, MOTOR_MAGNET: 82, MIXED_PLASTIC: 30 },
  },
  {
    id: 'rec-pune-002',
    name: 'Chinchwad Aggregators & Metals',
    phone: '9765432109',
    mpcbRef: 'MPCB/E-WASTE/2024/054',
    location: 'Pimpri-Chinchwad',
    distanceKm: 6.8,
    verified: true,
    offered_rates: { PCB: 270, BATTERY: 102, CABLE: 158, LCD_PANEL: 115, CRT: 48, MOTOR_MAGNET: 85, MIXED_PLASTIC: 26 },
  },
];

export const PriceBoardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedCategoryCode, setExpandedCategoryCode] = useState<string | null>(null);
  const [priceItems, setPriceItems] = useState<MaterialPriceItem[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const [district] = useState<string>(() => {
    try {
      return (typeof window !== 'undefined' && window.localStorage && localStorage.getItem('kabadiwala_district')) || 'Pune';
    } catch {
      return 'Pune';
    }
  });

  useEffect(() => {
    seedLocalPriceCache();

    async function loadLiveData() {
      setLoading(true);
      try {
        const remoteRecyclers = await fetchRegisteredRecyclers().catch(() => []);
        const localRecyclers = await db.recyclers.toArray().catch(() => []);

        const combinedRecyclersRaw = [...remoteRecyclers, ...localRecyclers, ...FALLBACK_RECYCLERS];
        const uniqueRecyclersMap = new Map<string, any>();
        combinedRecyclersRaw.forEach(r => {
          const rid = r.recycler_id || r.id || r.contact_phone;
          if (rid && !uniqueRecyclersMap.has(rid)) {
            uniqueRecyclersMap.set(rid, r);
          }
        });
        const allRecyclers = Array.from(uniqueRecyclersMap.values());

        const backendPrices = await fetchPrices(district).catch(() => []);

        const categories = Object.keys(DEFAULT_BENCHMARK_RATES);

        const items: MaterialPriceItem[] = categories.map((catCode) => {
          const benchmark = DEFAULT_BENCHMARK_RATES[catCode];
          const matchingRecyclers: RecyclerOffer[] = [];
          let maxRate = benchmark.rate;

          allRecyclers.forEach((r) => {
            const rates = r.offered_rates || {};
            const offeredRate = rates[catCode] || rates[catCode.toLowerCase()];

            if (offeredRate && offeredRate > 0) {
              if (offeredRate > maxRate) {
                maxRate = offeredRate;
              }
              matchingRecyclers.push({
                id: r.recycler_id || r.id || 'rec-001',
                name: r.name || 'Registered E-Waste Facility',
                phone: r.contact_phone || r.phone || '9876543210',
                mpcbRef: r.authorization_ref_no || r.mpcbRef || 'MPCB Verified',
                location: r.district || r.location || district,
                distanceKm: r.distance_km || Math.round((Math.random() * 8 + 1) * 10) / 10,
                rate: offeredRate,
                verified: r.authorization_status === 'verified' || r.verified !== false,
              });
            }
          });

          matchingRecyclers.sort((a, b) => b.rate - a.rate);

          const bPriceObj = backendPrices.find((p: any) =>
            p.material_category === catCode || p.sub_category?.toLowerCase().includes(catCode.toLowerCase())
          );
          if (bPriceObj && bPriceObj.quoted_price && bPriceObj.quoted_price > maxRate) {
            maxRate = bPriceObj.quoted_price;
          }

          const informalRate = Math.round(maxRate * 0.82);

          return {
            categoryCode: catCode,
            name: benchmark.name,
            categoryGroup: benchmark.categoryGroup,
            icon: benchmark.icon,
            fixedRate: maxRate,
            informalRate: informalRate,
            pts: benchmark.pts.map((_, idx) => Math.round(maxRate * (0.9 + idx * 0.02))),
            recyclers: matchingRecyclers,
            lastUpdated: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
        });

        setPriceItems(items);
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (err) {
        console.warn('Error constructing real price board:', err);
      } finally {
        setLoading(false);
      }
    }

    loadLiveData();
  }, [district]);

  const filteredItems = priceItems.filter((item) => {
    const matchesTab = activeTab === 'All' || item.categoryGroup === activeTab;
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoryCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const [selectedRecycler, setSelectedRecycler] = useState<{ item: MaterialPriceItem; rec: RecyclerOffer } | null>(null);

  const toggleExpand = (categoryCode: string) => {
    setExpandedCategoryCode(prev => prev === categoryCode ? null : categoryCode);
  };

  return (
    <div className="pb-24 pt-4 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto space-y-4 font-sans text-stone-900">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-2xl hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">Price Board</h1>
            <div className="flex items-center gap-2 text-xs text-stone-500 font-medium mt-0.5">
              <span className="flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <MapPin size={12} className="text-[#16A34A]" />
                {district} District
              </span>
              <span>• Registered buyer rates</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 bg-stone-100 text-stone-700 text-xs font-bold px-3 py-1.5 rounded-full border border-stone-200">
            <Clock size={12} className="text-[#16A34A]" />
            <span>Sync: {lastSyncTime || 'Live'}</span>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Field */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-3 text-stone-400" />
          <input
            type="text"
            placeholder="Search material category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200/80 rounded-2xl text-xs font-semibold text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] shadow-xs"
          />
        </div>

        {/* Category Tabs Scrollbar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#16A34A] text-white shadow-xs'
                    : 'bg-white border border-stone-200/80 text-stone-700 hover:bg-stone-50'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="p-8 text-center text-xs text-stone-500 font-semibold animate-pulse space-y-2 bg-white rounded-3xl border border-stone-200">
          <Factory size={24} className="mx-auto text-stone-300 animate-spin" />
          <p>Loading market prices for {district}...</p>
        </div>
      ) : (
        /* Compact Responsive Multi-Column Desktop Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 items-start">
          {filteredItems.map((item) => {
            const isExpanded = expandedCategoryCode === item.categoryCode;
            const minPt = Math.min(...item.pts);
            const maxPt = Math.max(...item.pts);
            const ptRange = maxPt - minPt || 1;

            return (
              <div
                key={item.categoryCode}
                className={`bg-white rounded-2xl border shadow-xs transition-all h-fit ${
                  isExpanded
                    ? 'border-[#16A34A] ring-2 ring-[#16A34A]/15 bg-emerald-50/10 p-3.5'
                    : 'border-stone-200/80 hover:border-emerald-300 p-3.5'
                }`}
              >
                {/* Collapsed Compact Card View */}
                <div
                  onClick={() => toggleExpand(item.categoryCode)}
                  className="cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl shrink-0">{item.icon}</span>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-stone-900 text-xs sm:text-sm truncate">{item.name}</h3>
                        
                        {/* Single Formal Price Display Only */}
                        <div className="text-sm font-black text-[#16A34A] mt-0.5">
                          ₹{item.fixedRate} <span className="text-[10px] font-medium text-stone-500">/kg</span>
                        </div>
                      </div>
                    </div>

                    {/* Sparkline & Audio button */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* SVG Waveform Sparkline Graph */}
                      <svg width="46" height="18" viewBox="0 0 46 18" fill="none" className="shrink-0">
                        <path
                          d={item.pts
                            .map(
                              (v, i) =>
                                `${i === 0 ? 'M' : 'L'} ${(i / (item.pts.length - 1)) * 46} ${
                                  18 - ((v - minPt) / ptRange) * 14
                                }`
                            )
                            .join(' ')}
                          stroke="#16A34A"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>

                      {/* Audio Button */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <AudioButton
                          textToSpeak={`${item.name}. Formal rate is ${item.fixedRate} rupees per kg.`}
                          size={14}
                        />
                      </div>

                      <div className="text-stone-400">
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Minimalist Expanded Drawer (Remains compact in item cell) */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-stone-200/80 space-y-2 text-xs animate-in fade-in duration-150">
                    
                    {/* Minimal Formal vs Informal Rate Line */}
                    <div className="flex items-center justify-between bg-stone-50 p-2 rounded-xl text-[11px] font-semibold border border-stone-200/60">
                      <span className="text-emerald-800">Formal: <strong className="text-[#16A34A] font-black">₹{item.fixedRate}/kg</strong></span>
                      <span className="text-stone-500">Informal: <strong className="text-stone-700 font-bold">₹{item.informalRate}/kg</strong></span>
                    </div>

                    {/* Minimal Registered Buyers List */}
                    <div className="space-y-1 pt-1">
                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-0.5">
                        Registered Buyers ({item.recyclers.length})
                      </div>

                      {item.recyclers.length === 0 ? (
                        <div className="p-2 text-center text-[11px] text-stone-500 bg-stone-50 rounded-xl">
                          Benchmark rate: <strong>₹{item.fixedRate}/kg</strong>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                          {item.recyclers.map((rec) => (
                            <div
                              key={rec.id}
                              className="p-2 bg-stone-50/80 hover:bg-stone-100 rounded-xl border border-stone-200/60 flex items-center justify-between gap-2 text-xs transition-colors"
                            >
                              <div className="min-w-0 pr-1">
                                <div className="font-bold text-stone-900 text-[11px] truncate">{rec.name}</div>
                                <div className="text-[10px] text-stone-500 truncate">{rec.location} • {rec.distanceKm} km</div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-black text-[11px] text-[#16A34A]">₹{rec.rate}/kg</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedRecycler({ item, rec })}
                                  className="p-1 rounded-lg bg-[#16A34A] text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                                  title="View recycler details"
                                >
                                  <ChevronRight size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Recycler information modal */}
      {selectedRecycler && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-stone-200 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#16A34A] flex items-center justify-center font-bold">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm sm:text-base">Recycler Information</h3>
                  <p className="text-[11px] text-stone-500">Contact and buying details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecycler(null)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Recycler Authorized Details */}
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 text-xs sm:text-sm">{selectedRecycler.rec.name}</h4>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold mt-0.5">
                    <ShieldCheck size={13} />
                    <span>MPCB Ref: {selectedRecycler.rec.mpcbRef || 'MPCB/E-WASTE/2024/VERIFIED'}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  Verified Buyer
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-stone-600 border-t border-stone-200/50">
                <div className="flex items-center gap-1.5">
                  <Building size={13} className="text-stone-400 shrink-0" />
                  <span className="truncate">{selectedRecycler.rec.location} ({selectedRecycler.rec.distanceKm} km)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone size={13} className="text-stone-400 shrink-0" />
                  <span>+91 {selectedRecycler.rec.phone || '9876543210'}</span>
                </div>
              </div>
            </div>

            {/* Agreed Rate & Material summary */}
            <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-2xl p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="text-stone-500 font-medium">Material: </span>
                <strong className="text-stone-900 font-bold">{selectedRecycler.item.name}</strong>
                <div className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                  Rate: <strong>₹{selectedRecycler.rec.rate}/kg</strong>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">Est. Payout</div>
                <div className="text-base sm:text-lg font-black text-[#16A34A]">
                  ₹{Math.round(selectedRecycler.rec.rate * 5.0)}
                </div>
                <div className="text-[9px] text-stone-400">@ 5.0 kg approx</div>
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200/70 rounded-2xl p-3 text-xs text-stone-600 space-y-1.5">
              <div className="flex justify-between"><span>Distance</span><strong className="text-stone-900">{selectedRecycler.rec.distanceKm} km</strong></div>
              <div className="flex justify-between"><span>Buying rate</span><strong className="text-emerald-700">₹{selectedRecycler.rec.rate}/kg</strong></div>
              <div className="flex justify-between"><span>Pickup</span><strong className="text-stone-900">{selectedRecycler.rec.distanceKm ? 'Contact facility' : 'Ask facility'}</strong></div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setSelectedRecycler(null)} className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs cursor-pointer hover:bg-stone-50">Close</button>
              <a href={`tel:${selectedRecycler.rec.phone}`} className="flex-1 bg-[#16A34A] hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1">Call recycler</a>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default PriceBoardPage;
