import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, RefreshCw, Search, Tag } from 'lucide-react';
import { updateRecyclerRates } from '../../data/remote/apiClient';

export const RecyclerRatesPage: React.FC = () => {
  const [recyclerId, setRecyclerId] = useState('rec-pune-001');
  const [recyclerName, setRecyclerName] = useState('EcoRecycle India');
  const [error, setError] = useState('');
  const [materialsAccepted, setMaterialsAccepted] = useState<string[]>([
    'PCB', 'BATTERY', 'CABLE', 'LCD_PANEL', 'CRT', 'MOTOR_MAGNET', 'MIXED_PLASTIC',
  ]);

  const [rates, setRates] = useState<Record<string, number>>({
    PCB: 260.0,
    BATTERY: 90.0,
    CABLE: 150.0,
    LCD_PANEL: 110.0,
    CRT: 40.0,
    MOTOR_MAGNET: 70.0,
    MIXED_PLASTIC: 25.0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('ALL');

  const categoryLabels: Record<string, { label: string; icon: string; benchmark: number }> = {
    PCB: { label: 'Circuit Board (PCB)', icon: '🖥️', benchmark: 275.0 },
    BATTERY: { label: 'Battery & Cells', icon: '🔋', benchmark: 95.0 },
    CABLE: { label: 'Copper Cable Wire', icon: '🔌', benchmark: 155.0 },
    LCD_PANEL: { label: 'LCD Screen Panel', icon: '📺', benchmark: 115.0 },
    CRT: { label: 'CRT TV Vacuum Glass', icon: '📺', benchmark: 42.0 },
    MOTOR_MAGNET: { label: 'Motor & Neodymium Magnet', icon: '🧲', benchmark: 75.0 },
    MIXED_PLASTIC: { label: 'Mixed E-Waste Plastic Body', icon: '♻️', benchmark: 28.0 },
    IRON: { label: 'Scrap Iron & Steel', icon: '⚙️', benchmark: 35.0 },
    ALUMINIUM: { label: 'Aluminium Heat Sinks', icon: '🔩', benchmark: 140.0 },
    NEWSPAPER: { label: 'Paper & Cardboard Packaging', icon: '📰', benchmark: 18.0 },
  };

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      try {
        const rawUser = typeof window !== 'undefined' ? localStorage.getItem('kabadiwala_user') : null;
        if (!rawUser) return;
        const u = JSON.parse(rawUser);
        if (!isMounted) return;
        if (u.name) setRecyclerName(u.name);
        const rid = u.recycler_id || u.recyclerId || u.id;
        if (rid) setRecyclerId(rid);
        if (Array.isArray(u.materials_accepted) && u.materials_accepted.length > 0) {
          setMaterialsAccepted(u.materials_accepted);
        }
        if (u.offered_rates && typeof u.offered_rates === 'object') {
          setRates(u.offered_rates);
        }
      } catch { /* ignore */ } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadProfile();
    return () => { isMounted = false; };
  }, []);

  const handleRateChange = (cat: string, val: string) => {
    const num = parseFloat(val) || 0;
    setRates((prev) => ({ ...prev, [cat]: num }));
  };

  const handleSaveRates = async () => {
    setError('');
    const activeRates = Object.fromEntries(
      Object.entries(rates).filter(
        ([category, rate]) => materialsAccepted.includes(category) && Number.isFinite(rate) && rate > 0,
      ),
    );
    if (!recyclerId) {
      setError('Recycler account is not available. Sign in again and retry.');
      return;
    }
    if (Object.keys(activeRates).length === 0) {
      setError('Select an accepted material and enter a positive buying rate.');
      return;
    }
    setIsSaving(true);
    try {
      await updateRecyclerRates(recyclerId, rates);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save facility rates.');
    } finally {
      setIsSaving(false);
    }
  };

  const availableCategories = Object.keys(rates);

  const filteredCategories = availableCategories.filter(cat => {
    const meta = categoryLabels[cat] || { label: cat, icon: '📦', benchmark: 0 };
    const matchesSearch = searchQuery === '' || meta.label.toLowerCase().includes(searchQuery.toLowerCase()) || cat.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeCategoryFilter === 'ALL' || cat === activeCategoryFilter;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="pb-24 pt-4 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto space-y-6 font-sans text-stone-900">
      {/* Compact Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Tag size={22} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-stone-900">{recyclerName} — Buying Rates</h2>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                Live Pricing Engine
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium">
              Configure your custom buying rates (₹ / kg) for automated matching with local collectors.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isSaving || isLoading || !recyclerId}
          onClick={handleSaveRates}
          className="w-full sm:w-auto bg-[#16A34A] hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-2xl flex items-center justify-center space-x-2 shadow-xs transition-all text-xs disabled:opacity-50 cursor-pointer shrink-0"
        >
          {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
          <span>{isSaving ? 'Saving...' : 'Save Rates'}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-emerald-900 text-xs font-bold flex items-center space-x-3 shadow-xs animate-fade-in">
          <CheckCircle2 size={20} className="text-[#16A34A] shrink-0" />
          <span>Rates & matching engine configuration saved successfully! (दर यशस्वीरित्या अपडेट झाले!)</span>
        </div>
      )}

      {/* Minimalist Price Board Controls (Search & Category Bar) */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search material category or rate code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-2xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] shadow-xs"
            />
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            {['ALL', 'PCB', 'BATTERY', 'CABLE', 'LCD_PANEL', 'MOTOR_MAGNET'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategoryFilter(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategoryFilter === cat
                    ? 'bg-[#16A34A] text-white shadow-xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Responsive Grid of Minimalist Buying Rate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((cat) => {
          const meta = categoryLabels[cat] || { label: cat, icon: '📦', benchmark: 0 };

          return (
            <div
              key={cat}
              className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs transition-all flex flex-col justify-between space-y-3 hover:border-emerald-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-xl shrink-0">
                    {meta.icon}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-stone-900 text-xs leading-tight">{meta.label}</h4>
                    <span className="text-[10px] font-mono text-stone-500 font-bold">Category: {cat}</span>
                  </div>
                </div>

              </div>

              {/* Rate Edit & Benchmark Section */}
              <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/60 flex items-center justify-between">
                <div>
                  <span className="text-stone-400 block text-[10px] font-semibold">MARKET BENCHMARK</span>
                  <span className="text-stone-600 font-extrabold text-xs">₹{meta.benchmark} / kg</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="text-stone-500 font-black text-xs">₹</span>
                  <input
                    type="number"
                    step="0.5"
                    value={rates[cat]}
                    onChange={(e) => handleRateChange(cat, e.target.value)}
                    className="w-24 px-3 py-1.5 text-sm font-black font-mono text-stone-900 border border-stone-300 rounded-xl text-right bg-white focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] focus:outline-none shadow-xs"
                  />
                  <span className="text-stone-500 text-[10px] font-bold">/kg</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
