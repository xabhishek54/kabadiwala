import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, AlertTriangle, CheckCircle, RefreshCw, Cpu } from 'lucide-react';
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

  const handleResolve = async (lotId: string) => {
    setActionError('');
    setResolvingLot(lotId);
    try {
      await resolveAnomaly(lotId);
      setResolvedLots((prev) => new Set(prev).add(lotId));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not save the review.');
    } finally {
      setResolvingLot(null);
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
          <div className="text-xs text-stone-500 font-semibold">Reviewed this session</div>
        </div>
      </div>

      {/* Anomalies List */}
      <div className="space-y-3">
        {loadError && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            Could not load live anomaly data: {loadError}
          </div>
        )}
        {actionError && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {actionError}
          </div>
        )}
        {isLoading ? (
          <div className="bg-surface-card rounded-card p-8 text-center text-stone-500 font-semibold text-xs animate-pulse">
            Scanning transaction ledger for anomalies...
          </div>
        ) : loadError ? null : anomalies.length === 0 ? (
          <div className="bg-surface-card rounded-card p-8 text-center border border-surface-border space-y-2">
            <CheckCircle size={36} className="mx-auto text-emerald-500" />
            <p className="text-stone-700 text-sm font-bold">No Active Anomalies</p>
            <p className="text-stone-500 text-xs">There are no live transaction records requiring review.</p>
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
                      <h4 className="font-bold text-stone-900 text-sm">{item.category} Lot</h4>
                      <p className="text-[11px] font-mono text-stone-500">ID: {item.lot_id}</p>
                    </div>
                  </div>

                  <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                    isResolved
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800 animate-pulse'
                  }`}>
                    Z = {item.modified_z_score.toFixed(2)}
                  </span>
                </div>

                <div className="mt-3 bg-stone-50 rounded-xl p-3 space-y-1 text-xs text-stone-700 font-medium border border-stone-200">
                  <div className="flex justify-between">
                    <span>Final sale value / kg:</span>
                    <span className="font-bold text-rose-600">₹{item.unit_price_per_kg}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Category median / kg:</span>
                    <span className="font-bold text-stone-900">₹{item.category_median_price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Condition Signal:</span>
                    <span className="font-bold capitalize">{item.condition}</span>
                  </div>
                  {item.reasons.length > 0 && (
                    <div className="pt-1 text-[11px] text-stone-500 italic">
                      Reason: {item.reasons.join(', ')}
                    </div>
                  )}
                </div>

                <div className="mt-2.5 bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 font-semibold flex items-center space-x-1.5">
                  <ShieldAlert size={15} className="shrink-0 text-amber-600" />
                  <span>Action: {item.recommended_action}</span>
                </div>

                {!isResolved && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => handleResolve(item.lot_id)}
                      disabled={resolvingLot === item.lot_id}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-2 rounded-xl text-xs transition-all active:scale-95 shadow-sm"
                    >
                      {resolvingLot === item.lot_id ? 'Saving review…' : t('anomaly.markClean')}
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
