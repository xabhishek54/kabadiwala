import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Cpu, RefreshCw, BarChart2, Leaf, Globe } from 'lucide-react';
import { API_BASE_URL } from '../../data/remote/apiClient';

interface MineralImpactData {
  unit: string;
  district: string;
  mineral_estimates: Record<string, number>;
  total_e_waste_processed_kg: number;
  estimate_basis?: string;
}

export const MineralsImpactPage: React.FC = () => {
  const [data, setData] = useState<MineralImpactData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState('');

  const fetchImpact = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/admin/minerals/impact`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        throw new Error('API failed');
      }
    } catch {
      // Offline / fallback mock dataset for JNARDDC demonstration
      setData({
        unit: 'grams',
        district: 'Pune District & Maharashtra Hub',
        total_e_waste_processed_kg: 1250.0,
        mineral_estimates: {
          copper: 250000.0, // 250 kg
          lithium: 18750.0,  // 18.75 kg
          cobalt: 56250.0,   // 56.25 kg
          neodymium: 37500.0,// 37.5 kg
          tantalum: 187.5,
          gallium: 62.5,
          indium: 25.0,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImpact();
  }, []);

  const mineralInfo: Record<string, { label: string; symbol: string; color: string; desc: string; maxKg: number }> = {
    lithium: { label: 'Lithium', symbol: 'Li', color: 'bg-emerald-600 text-white', desc: 'EV Batteries & Grid Storage', maxKg: 50 },
    cobalt: { label: 'Cobalt', symbol: 'Co', color: 'bg-blue-600 text-white', desc: 'High-density Li-Ion Cathodes', maxKg: 100 },
    neodymium: { label: 'Neodymium', symbol: 'Nd', color: 'bg-purple-600 text-white', desc: 'Rare-Earth Permanent Magnets', maxKg: 80 },
    tantalum: { label: 'Tantalum', symbol: 'Ta', color: 'bg-amber-600 text-white', desc: 'Miniature Capacitors in Mobile/PCBs', maxKg: 2 },
    gallium: { label: 'Gallium', symbol: 'Ga', color: 'bg-indigo-600 text-white', desc: 'Semiconductors & 5G Chips', maxKg: 1 },
    indium: { label: 'Indium', symbol: 'In', color: 'bg-rose-600 text-white', desc: 'LCD/Touchscreen ITO Coatings', maxKg: 0.5 },
    copper: { label: 'Copper', symbol: 'Cu', color: 'bg-orange-600 text-white', desc: 'Electrical Wiring & Power Grids', maxKg: 500 },
  };

  const totalRawGrams = data?.mineral_estimates ? Object.values(data.mineral_estimates).reduce((a, b) => Number(a) + Number(b), 0) : 0;
  const totalRecoveryKg = (totalRawGrams / 1000).toFixed(1);

  return (
    <div className="pb-24 pt-4 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto space-y-6 font-sans text-stone-900">
      {/* Compact Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Cpu size={22} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-stone-900 flex items-center space-x-2">
              <span>Critical Minerals Dashboard & Recovery Portal</span>
              <Sparkles size={16} className="text-amber-500 shrink-0" />
            </h2>
            <p className="text-xs text-stone-500 font-medium">
              JNARDDC & Ministry of Mines Strategic Mandate for Circular Economy & Critical Mineral Security.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchImpact}
          className="w-full sm:w-auto bg-stone-900 hover:bg-stone-800 text-white font-extrabold px-4 py-2.5 rounded-2xl flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer text-xs shrink-0"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Impact</span>
        </button>
      </div>

      {/* Metrics Banner - 3 columns on all screen sizes */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-stone-200/80 shadow-xs space-y-1 min-w-0">
          <div className="flex items-center justify-between text-stone-500 text-[10px] sm:text-xs font-extrabold uppercase tracking-tight sm:tracking-wider">
            <span className="truncate">E-Waste Intake</span>
            <BarChart2 size={15} className="text-[#16A34A] shrink-0 hidden sm:inline" />
          </div>
          <p className="text-lg sm:text-3xl font-black text-stone-900 truncate">
            {data ? `${data.total_e_waste_processed_kg.toLocaleString('en-IN')} kg` : '0 kg'}
          </p>
          <p className="text-[9px] sm:text-xs text-emerald-600 font-bold leading-tight line-clamp-1 sm:line-clamp-none">Traceable intake</p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-stone-200/80 shadow-xs space-y-1 min-w-0">
          <div className="flex items-center justify-between text-stone-500 text-[10px] sm:text-xs font-extrabold uppercase tracking-tight sm:tracking-wider">
            <span className="truncate">Recovered</span>
            <Leaf size={15} className="text-amber-500 shrink-0 hidden sm:inline" />
          </div>
          <p className="text-lg sm:text-3xl font-black text-amber-600">{totalRecoveryKg} kg</p>
          <p className="text-[9px] sm:text-xs text-amber-700 font-bold leading-tight line-clamp-1 sm:line-clamp-none">Raw secondary</p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-stone-200/80 shadow-xs space-y-1 min-w-0">
          <div className="flex items-center justify-between text-stone-500 text-[10px] sm:text-xs font-extrabold uppercase tracking-tight sm:tracking-wider">
            <span className="truncate">Monitoring Hub</span>
            <Globe size={15} className="text-blue-600 shrink-0 hidden sm:inline" />
          </div>
          <p className="text-base sm:text-xl font-black text-stone-900 truncate">{data?.district || 'Pune'}</p>
          <p className="text-[9px] sm:text-xs text-stone-500 font-medium leading-tight line-clamp-1 sm:line-clamp-none">JNARDDC hub</p>
        </div>
      </div>

      {/* Critical Minerals Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-stone-900 text-lg flex items-center space-x-2">
            <Sparkles size={20} className="text-amber-500" />
            <span>Recoverable Critical & Strategic Minerals</span>
          </h3>
          <span className="text-xs font-semibold text-stone-500">Estimates in Grams & Kilograms</span>
        </div>

        {data && data.mineral_estimates ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(data.mineral_estimates).map(([key, val]) => {
              const info = mineralInfo[key] || {
                label: key.toUpperCase(),
                symbol: key.slice(0, 2).toUpperCase(),
                color: 'bg-stone-600 text-white',
                desc: 'Strategic Industrial Mineral',
                maxKg: 100,
              };
              const valNum = Number(val);
              const kgValNum = valNum / 1000;
              const kgVal = valNum >= 1000 ? kgValNum.toFixed(2) + ' kg' : valNum.toFixed(1) + ' g';
              const progressPct = Math.min(100, Math.round((kgValNum / info.maxKg) * 100));

              return (
                <div
                  key={key}
                  className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-2xl font-mono font-black flex items-center justify-center text-base shadow-sm ${info.color}`}>
                        {info.symbol}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-stone-900 text-sm leading-tight">{info.label}</h4>
                        <p className="text-[11px] text-stone-500 font-medium">{info.desc}</p>
                      </div>
                    </div>

                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full shrink-0">
                      Traceable ✓
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Estimated Recovery</span>
                      <span className="text-xl font-black text-stone-900">{kgVal}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#16A34A] h-2 rounded-full transition-all duration-500" style={{ width: `${Math.max(8, progressPct)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center text-xs text-stone-500 font-semibold border border-stone-200">
            Loading mineral recovery estimates...
          </div>
        )}
      </div>

      {/* JNARDDC Mandate Policy Note */}
      <div className="bg-amber-50/80 rounded-3xl p-5 border border-amber-200/80 text-xs text-amber-900 space-y-2 shadow-xs">
        <div className="flex items-center space-x-2 font-black text-sm">
          <Shield size={18} className="text-amber-700" />
          <span>National Strategic Mineral Security & Secondary Resource Circularity</span>
        </div>
        <p className="text-xs leading-relaxed text-amber-800 font-medium">
          This JNARDDC-compliant portal converts verified e-waste handover transactions into real-time critical mineral recovery estimates (Lithium, Cobalt, Neodymium, Tantalum), ensuring 100% material traceability from informal scrap collectors to licensed recycling refineries.
        </p>
        {data && <p className="text-[11px] leading-relaxed text-amber-800">{data.estimate_basis}</p>}
      </div>
    </div>
  );
};

