import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Cpu, RefreshCw, BarChart2 } from 'lucide-react';
import { fetchMineralImpact, type MineralImpactRecord } from '../../data/remote/apiClient';

export const MineralsImpactPage: React.FC = () => {
  const [data, setData] = useState<MineralImpactRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState('');

  const fetchImpact = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await fetchMineralImpact());
    } catch (fetchError) {
      setData(null);
      setError(fetchError instanceof Error ? fetchError.message : 'Could not load mineral estimates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImpact();
  }, []);

  const mineralInfo: Record<string, { label: string; symbol: string; color: string; desc: string }> = {
    lithium: { label: 'Lithium', symbol: 'Li', color: 'bg-emerald-500 text-white', desc: 'EV Batteries & Grid Storage' },
    cobalt: { label: 'Cobalt', symbol: 'Co', color: 'bg-blue-600 text-white', desc: 'High-density Li-Ion Cathodes' },
    neodymium: { label: 'Neodymium', symbol: 'Nd', color: 'bg-purple-600 text-white', desc: 'Rare-Earth Permanent Magnets' },
    tantalum: { label: 'Tantalum', symbol: 'Ta', color: 'bg-amber-600 text-white', desc: 'Miniature Capacitors in Mobile/PCBs' },
    gallium: { label: 'Gallium', symbol: 'Ga', color: 'bg-indigo-600 text-white', desc: 'Semiconductors & 5G Chips' },
    indium: { label: 'Indium', symbol: 'In', color: 'bg-rose-600 text-white', desc: 'LCD/Touchscreen ITO Coatings' },
    copper: { label: 'Copper', symbol: 'Cu', color: 'bg-orange-600 text-white', desc: 'Electrical Wiring & Power Grids' },
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-4">
      {/* Header Banner */}
      <div className="bg-stone-900 text-white rounded-2xl p-4 shadow-elevated border border-stone-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-900 flex items-center justify-center font-bold shadow-md">
              <Cpu size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight flex items-center space-x-1.5">
                <span>Critical Minerals Dashboard</span>
                <Sparkles size={14} className="text-amber-400" />
              </h2>
              <p className="text-[11px] text-stone-400">Estimated material composition from completed transactions</p>
            </div>
          </div>

          <button
            onClick={fetchImpact}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="bg-stone-800/80 rounded-xl p-3 border border-stone-700 flex items-center justify-between text-xs">
          <div>
            <span className="text-stone-400 block text-[10px]">Material from Paid Transactions</span>
            <span className="text-base font-black text-amber-400">
              {data ? `${data.total_e_waste_processed_kg.toLocaleString('en-IN')} kg` : '0 kg'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-stone-400 block text-[10px]">Geographic Scope</span>
            <span className="font-bold text-stone-200">{data?.district || 'Pune Hub'}</span>
          </div>
        </div>
      </div>

      {/* Critical Minerals Cards */}
      <div className="space-y-2.5">
        <h3 className="font-bold text-stone-900 text-sm flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <BarChart2 size={16} className="text-brand-600" />
            <span>Theoretical Mineral Content Estimate</span>
          </span>
          <span className="text-[11px] font-normal text-stone-500">Estimates in Grams (g)</span>
        </h3>

        {error ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        ) : loading ? (
          <div className="p-6 text-center text-xs text-stone-500">Loading mineral estimates…</div>
        ) : data && data.total_e_waste_processed_kg > 0 ? (
          Object.entries(data.mineral_estimates).map(([key, val]) => {
            const info = mineralInfo[key] || {
              label: key.toUpperCase(),
              symbol: key.slice(0, 2).toUpperCase(),
              color: 'bg-stone-600 text-white',
              desc: 'Strategic Industrial Mineral',
            };
            const kgVal = val >= 1000 ? (val / 1000).toFixed(2) + ' kg' : val.toFixed(1) + ' g';

            return (
              <div
                key={key}
                className="bg-surface-card rounded-card p-3.5 border border-surface-border shadow-soft flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl font-mono font-black flex items-center justify-center text-sm shadow-xs ${info.color}`}>
                    {info.symbol}
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm flex items-center space-x-1.5">
                      <span>{info.label}</span>
                    </h4>
                    <p className="text-[11px] text-stone-500 font-medium">{info.desc}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black text-stone-900">{kgVal}</div>
                  <span className="text-[10px] text-stone-500 font-medium">Estimated</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-6 text-center text-xs text-stone-500">
            No paid or completed transactions are recorded for {data?.district || 'this district'} yet.
          </div>
        )}
      </div>

      {/* Ministry Policy Note */}
      <div className="bg-amber-50 rounded-card p-3.5 border border-amber-200 text-xs text-amber-900 space-y-1">
        <div className="flex items-center space-x-1.5 font-bold">
          <Shield size={16} className="text-amber-700" />
          <span>About these estimates</span>
        </div>
        <p className="text-[11px] leading-relaxed text-amber-800">
          Estimates use theoretical material-composition factors applied to recorded paid transactions. They do not represent measured or laboratory-verified mineral recovery.
        </p>
        {data && <p className="text-[11px] leading-relaxed text-amber-800">{data.estimate_basis}</p>}
      </div>
    </div>
  );
};
