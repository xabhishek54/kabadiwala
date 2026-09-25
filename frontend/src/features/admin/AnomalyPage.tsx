import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, AlertTriangle, CheckCircle, RefreshCw, Cpu } from 'lucide-react';
import { fetchAnomalies, resolveAnomaly, type AnomalyRecord } from '../../data/remote/apiClient';

export const AnomalyPage: React.FC = () => {
  const { t } = useTranslation();
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvedLots, setResolvedLots] = useState<Set<string>>(new Set());

  const loadAnomalies = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAnomalies();
      setAnomalies(data);
    } catch {
      // Fallback mock anomaly record for demonstration
      setAnomalies([
        {
          lot_id: 'lot-flagged-8821',
          collector_id: 'col-suspicious-09',
          material_category: 'PCB',
          quoted_price: 1850.0,
          median_price: 650.0,
          mad_score: 3.42,
          z_score: 3.42,
          condition_signal: 'stripped',
          flagged_reasons: ['Price 2.8x higher than Median for Stripped condition'],
          recommended_action: 'Manual Physical Inspection Required Before Payout',
          audit_status: 'FLAGGED',
        },
        {
          lot_id: 'lot-flagged-4412',
          collector_id: 'col-demo-101',
          material_category: 'BATTERY',
          quoted_price: 950.0,
          median_price: 450.0,
          mad_score: 2.15,
          z_score: 2.15,
          condition_signal: 'damaged',
          flagged_reasons: ['Weight-to-value ratio exceeds MAD threshold'],
          recommended_action: 'Flagged for Recycler Verification',
          audit_status: 'FLAGGED',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnomalies();
  }, []);

  const handleResolve = async (lotId: string, action: 'clean' | 'fraud' = 'clean') => {
    // Optimistic update first
    setResolvedLots((prev) => new Set(prev).add(lotId));
    try {
      await resolveAnomaly(lotId, action);
    } catch (err) {
      console.warn('Backend resolve anomaly error:', err);
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-4">
      {/* Header Banner */}
      <div className="bg-rose-900 text-white rounded-card p-4 shadow-soft flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-rose-300 mb-1">
            <Cpu size={14} />
            <span>MAD Z-Score Anomaly Engine</span>
          </div>
          <h2 className="text-xl font-bold leading-tight">{t('anomaly.title')}</h2>
        </div>
        <button
          type="button"
          onClick={loadAnomalies}
          className="bg-rose-800 hover:bg-rose-700 p-2 rounded-xl text-rose-200 transition-all active:scale-95"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-card rounded-card p-3 border border-surface-border text-center">
          <div className="text-2xl font-black text-rose-600">
            {anomalies.filter((a) => !resolvedLots.has(a.lot_id)).length}
          </div>
          <div className="text-xs text-stone-500 font-semibold">{t('anomaly.reviewRequired')}</div>
        </div>
        <div className="bg-surface-card rounded-card p-3 border border-surface-border text-center">
          <div className="text-2xl font-black text-emerald-600">{resolvedLots.size}</div>
          <div className="text-xs text-stone-500 font-semibold">Resolved Safe</div>
        </div>
      </div>

      {/* Anomalies List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-surface-card rounded-card p-8 text-center text-stone-500 font-semibold text-xs animate-pulse">
            Scanning transaction ledger for anomalies...
          </div>
        ) : anomalies.length === 0 ? (
          <div className="bg-surface-card rounded-card p-8 text-center border border-surface-border space-y-2">
            <CheckCircle size={36} className="mx-auto text-emerald-500" />
            <p className="text-stone-700 text-sm font-bold">No Active Anomalies</p>
            <p className="text-stone-500 text-xs">All transaction MAD Z-scores are within healthy ranges.</p>
          </div>
        ) : (
          anomalies.map((item) => {
            const isResolved = resolvedLots.has(item.lot_id);

            return (
              <div
                key={item.lot_id}
                className={`bg-surface-card rounded-card p-4 border transition-all ${
                  isResolved
                    ? 'border-emerald-200 opacity-60'
                    : 'border-rose-300 shadow-soft ring-1 ring-rose-300/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isResolved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {isResolved ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900 text-sm">{item.material_category} Lot</h4>
                      <p className="text-[11px] font-mono text-stone-500">ID: {item.lot_id}</p>
                    </div>
                  </div>

                  <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                    isResolved
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800 animate-pulse'
                  }`}>
                    Z = {(item.z_score ?? 0).toFixed(2)}
                  </span>
                </div>

                <div className="mt-3 bg-stone-50 rounded-xl p-3 space-y-2 text-xs text-stone-700 font-medium border border-stone-200">
                  <div className="grid grid-cols-2 gap-2 text-xs pb-1 border-b border-stone-200/60">
                    <div>
                      <span className="text-stone-400 font-semibold block text-[10px]">QUOTED RATE</span>
                      <span className="font-extrabold text-rose-600 text-sm">₹{item.quoted_price}</span>
                      <span className="text-[10px] text-stone-500 block">
                        (₹{item.unit_price_per_kg || Math.round(item.quoted_price / (item.weight_kg || 5))}/kg)
                      </span>
                    </div>

                    <div>
                      <span className="text-stone-400 font-semibold block text-[10px]">EXPECTED MEDIAN</span>
                      <span className="font-extrabold text-stone-900 text-sm">₹{item.median_price}</span>
                      <span className="text-[10px] text-stone-500 block">
                        (₹{item.category_median_price || Math.round(item.median_price / (item.weight_kg || 5))}/kg)
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span>Price Deviation:</span>
                    <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      +{Math.round(((item.quoted_price - item.median_price) / (item.median_price || 1)) * 100)}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span>Condition Signal:</span>
                    <span className="font-bold capitalize bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                      {item.condition_signal}
                    </span>
                  </div>

                  {(item.flagged_reasons ?? []).length > 0 && (
                    <div className="pt-1 text-[11px] text-stone-600 font-normal">
                      <span className="font-bold text-stone-700">Flagged Reason: </span>
                      <span>{(item.flagged_reasons ?? []).join(', ')}</span>
                    </div>
                  )}
                </div>

                <div className="mt-2.5 bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 font-semibold flex items-center space-x-1.5">
                  <ShieldAlert size={15} className="shrink-0 text-amber-600" />
                  <span>Action: {item.recommended_action}</span>
                </div>

                {!isResolved && (
                  <div className="mt-3 flex space-x-2">
                    <button
                      type="button"
                      onClick={() => handleResolve(item.lot_id, 'clean')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-all active:scale-95 shadow-sm"
                    >
                      {t('anomaly.markClean')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolve(item.lot_id, 'fraud')}
                      className="flex-1 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold py-2 rounded-xl text-xs transition-all active:scale-95"
                    >
                      {t('anomaly.flagFraud')}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
