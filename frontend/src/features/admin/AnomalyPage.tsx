import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, AlertTriangle, CheckCircle, RefreshCw, Cpu, Activity, ShieldCheck } from 'lucide-react';
import { fetchAnomalies, resolveAnomaly, type AnomalyRecord } from '../../data/remote/apiClient';

export const AnomalyPage: React.FC = () => {
  const { t } = useTranslation();
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvedLots, setResolvedLots] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [resolvingLot, setResolvingLot] = useState<string | null>(null);

  const loadAnomalies = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await fetchAnomalies();
      setAnomalies(data);
    } catch (error) {
      setAnomalies([]);
      setLoadError(error instanceof Error ? error.message : 'Could not load anomaly records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnomalies();
  }, []);

  const handleResolve = async (lotId: string, action: 'clean' | 'fraud' = 'clean') => {
    setResolvedLots((prev) => new Set(prev).add(lotId));
    try {
      await resolveAnomaly(lotId, action);
    } catch (err) {
      console.warn('Backend resolve anomaly error:', err);
    }
  };

  const pendingAnomalies = anomalies.filter((a) => !resolvedLots.has(a.lot_id));

  return (
    <div className="pb-24 pt-4 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto space-y-6 font-sans text-stone-900">
      {/* Compact Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
            <Cpu size={22} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-stone-900">{t('anomaly.title')}</h2>
              <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200 flex items-center space-x-1">
                <Activity size={12} /> MAD Z-Score Engine
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium">
              Automated fraud & anomaly detection flagging statistical price deviations & suspect scrap lots.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadAnomalies}
          className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-4 py-2.5 rounded-2xl flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer text-xs shrink-0"
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          <span>Rescan Ledger</span>
        </button>
      </div>

      {/* Summary Metrics Strip - 3 columns on all screen sizes */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-stone-200/80 shadow-xs space-y-1 min-w-0">
          <div className="flex items-center justify-between text-stone-500 text-[10px] sm:text-xs font-extrabold uppercase tracking-tight sm:tracking-wider">
            <span className="truncate">Review Req</span>
            <AlertTriangle size={15} className="text-rose-600 shrink-0 hidden sm:inline" />
          </div>
          <p className="text-xl sm:text-3xl font-black text-rose-600">{pendingAnomalies.length}</p>
          <p className="text-[9px] sm:text-xs text-rose-600 font-bold leading-tight line-clamp-1 sm:line-clamp-none">Needs inspection</p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-stone-200/80 shadow-xs space-y-1 min-w-0">
          <div className="flex items-center justify-between text-stone-500 text-[10px] sm:text-xs font-extrabold uppercase tracking-tight sm:tracking-wider">
            <span className="truncate">Resolved Safe</span>
            <ShieldCheck size={15} className="text-emerald-600 shrink-0 hidden sm:inline" />
          </div>
          <p className="text-xl sm:text-3xl font-black text-emerald-600">{resolvedLots.size}</p>
          <p className="text-[9px] sm:text-xs text-emerald-600 font-bold leading-tight line-clamp-1 sm:line-clamp-none">Cleared payout</p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-stone-200/80 shadow-xs space-y-1 min-w-0">
          <div className="flex items-center justify-between text-stone-500 text-[10px] sm:text-xs font-extrabold uppercase tracking-tight sm:tracking-wider">
            <span className="truncate">Sensitivity</span>
            <Cpu size={15} className="text-purple-600 shrink-0 hidden sm:inline" />
          </div>
          <p className="text-xl sm:text-3xl font-black text-stone-900">3.0 MAD</p>
          <p className="text-[9px] sm:text-xs text-stone-500 font-medium leading-tight line-clamp-1 sm:line-clamp-none">Outlier limit</p>
        </div>
      </div>

      {/* Anomalies Cards Grid */}
      <div className="space-y-4">
        <h3 className="font-black text-stone-900 text-lg flex items-center space-x-2">
          <ShieldAlert size={20} className="text-rose-600" />
          <span>Flagged Scrap Lots Audit Queue</span>
        </h3>

        {isLoading ? (
          <div className="bg-white rounded-3xl p-12 text-center text-stone-500 font-semibold text-xs animate-pulse space-y-2 border border-stone-200">
            <RefreshCw size={24} className="mx-auto text-rose-400 animate-spin" />
            <p>Scanning transaction ledger for statistical anomalies...</p>
          </div>
        ) : anomalies.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
            <CheckCircle size={44} className="mx-auto text-emerald-500" />
            <p className="text-base font-bold text-stone-800">No Active Anomalies</p>
            <p className="text-xs text-stone-500">All transaction MAD Z-scores are within healthy statistical ranges.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {anomalies.map((item) => {
              const isResolved = resolvedLots.has(item.lot_id);

              return (
                <div
                  key={item.lot_id}
                  className={`bg-white rounded-3xl p-5 border transition-all space-y-4 flex flex-col justify-between ${
                    isResolved
                      ? 'border-emerald-200 bg-emerald-50/20 opacity-70'
                      : 'border-rose-200 shadow-xs hover:shadow-md ring-1 ring-rose-500/10'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
                          isResolved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {isResolved ? <CheckCircle size={22} /> : <AlertTriangle size={22} />}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-stone-900 text-sm leading-tight">{item.material_category} Lot</h4>
                          <p className="text-[11px] font-mono font-bold text-stone-500">ID: {item.lot_id}</p>
                        </div>
                      </div>

                      <span className={`text-xs font-black px-3 py-1 rounded-full shrink-0 ${
                        isResolved
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800 animate-pulse'
                      }`}>
                        Z = {(item.z_score ?? 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-stone-50 rounded-2xl p-4 space-y-3 text-xs text-stone-700 font-semibold border border-stone-200/70">
                      <div className="grid grid-cols-2 gap-3 pb-2 border-b border-stone-200">
                        <div>
                          <span className="text-stone-400 font-bold block text-[10px]">QUOTED RATE</span>
                          <span className="font-black text-rose-600 text-base">₹{item.quoted_price}</span>
                          <span className="text-[10px] text-stone-500 block font-medium">
                            (₹{item.unit_price_per_kg || Math.round(item.quoted_price / (item.weight_kg || 5))}/kg)
                          </span>
                        </div>

                        <div>
                          <span className="text-stone-400 font-bold block text-[10px]">EXPECTED MEDIAN</span>
                          <span className="font-black text-stone-900 text-base">₹{item.median_price}</span>
                          <span className="text-[10px] text-stone-500 block font-medium">
                            (₹{item.category_median_price || Math.round(item.median_price / (item.weight_kg || 5))}/kg)
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-stone-500">Price Deviation:</span>
                        <span className="font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                          +{Math.round(((item.quoted_price - item.median_price) / (item.median_price || 1)) * 100)}%
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-stone-500">Condition Signal:</span>
                        <span className="font-extrabold capitalize bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full">
                          {item.condition_signal}
                        </span>
                      </div>

                      {(item.flagged_reasons ?? []).length > 0 && (
                        <div className="pt-1 text-[11px] text-stone-600 font-medium">
                          <span className="font-black text-stone-800">Flagged Reason: </span>
                          <span>{(item.flagged_reasons ?? []).join(', ')}</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-900 font-bold flex items-center space-x-2">
                      <ShieldAlert size={16} className="shrink-0 text-amber-600" />
                      <span>Action: {item.recommended_action}</span>
                    </div>
                  </div>

                  {!isResolved && (
                    <div className="pt-2 border-t border-stone-100 flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleResolve(item.lot_id, 'clean')}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-2xl text-xs transition-all cursor-pointer shadow-xs"
                      >
                        {t('anomaly.markClean')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolve(item.lot_id, 'fraud')}
                        className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-extrabold py-2.5 rounded-2xl text-xs transition-all cursor-pointer border border-stone-200"
                      >
                        {t('anomaly.flagFraud')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
