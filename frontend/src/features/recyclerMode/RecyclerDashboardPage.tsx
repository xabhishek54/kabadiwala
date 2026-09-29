import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Factory, Package, Search, Filter, IndianRupee,
  RefreshCw, Layers, ShieldAlert
} from 'lucide-react';
import { fetchRecyclerLots, type RecyclerLotRecord } from '../../data/remote/apiClient';

interface DashboardStats {
  assigned_weight_kg: number;
  paid_total_inr: number;
  active_lots: number;
  material_categories: number;
}

export const RecyclerDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const currentUser = (() => {
    try {
      return JSON.parse(window.localStorage?.getItem('kabadiwala_user') || '{}');
    } catch {
      return {};
    }
  })();
  const recyclerId = currentUser?.recycler_id || (currentUser?.role === 'recycler' ? currentUser?.id : '');
  const recyclerName = currentUser?.name || 'Recycler';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lots, setLots] = useState<RecyclerLotRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setLoadError('');
    if (!recyclerId) {
      setLots([]);
      setStats(null);
      setLoadError('Sign in with a recycler account to view its assigned lots.');
      setLoading(false);
      return;
    }
    try {
      const finalLotList = await fetchRecyclerLots(recyclerId);
      setLots(finalLotList);
      setStats({
        assigned_weight_kg: finalLotList.reduce((sum, lot) => sum + lot.weight_kg, 0),
        paid_total_inr: finalLotList.reduce(
          (sum, lot) => sum + (lot.payment_status === 'paid' ? lot.final_sale_value || 0 : 0),
          0,
        ),
        active_lots: finalLotList.filter(lot => lot.status !== 'closed').length,
        material_categories: new Set(finalLotList.map(lot => lot.category)).size,
      });
    } catch (error) {
      setLots([]);
      setStats(null);
      setLoadError(error instanceof Error ? error.message : 'Could not load assigned lots.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [recyclerId]);

  const filteredLots = lots.filter(lot => {
    const matchesStatus = statusFilter === 'all' || lot.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || lot.category === categoryFilter;
    const matchesSearch =
      searchQuery === '' ||
      lot.lot_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.sub_category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });

  return (
    <div className="pb-24 pt-4 px-4 max-w-4xl mx-auto space-y-5">
      {/* Recycler Header */}
      <div className="bg-stone-900 text-white rounded-2xl p-5 shadow-elevated border border-stone-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-md shrink-0">
            <Factory size={26} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold tracking-tight">{recyclerName} — Portal</h2>
            </div>
            <p className="text-xs text-stone-400 font-medium mt-0.5">Recycler facility and assigned lot dashboard</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <NavLink
            to="/admin/anomalies"
            className="tap-target px-3.5 py-2 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-rose-200 text-xs font-bold flex items-center space-x-1.5 border border-rose-700/50 transition-colors"
          >
            <ShieldAlert size={14} className="text-rose-400 animate-pulse" />
            <span>{t('recycler.anomalyAlerts')}</span>
          </NavLink>

          <button
            onClick={fetchData}
            className="tap-target px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center space-x-1.5 border border-stone-700 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {loadError}
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Assigned Material</span>
            <Package size={16} className="text-brand-600" />
          </div>
          <p className="text-xl font-black text-stone-900">{stats ? `${stats.assigned_weight_kg.toFixed(2)} kg` : '—'}</p>
          <p className="text-[11px] text-stone-500 font-medium">Across assigned lots</p>
        </div>

        <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Disbursed Payouts</span>
            <IndianRupee size={16} className="text-emerald-600" />
          </div>
          <p className="text-xl font-black text-stone-900">₹{stats ? stats.paid_total_inr.toLocaleString('en-IN') : '—'}</p>
          <p className="text-[11px] text-stone-500 font-medium">Recorded paid transactions</p>
        </div>

        <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Active Lots</span>
            <Layers size={16} className="text-amber-600" />
          </div>
          <p className="text-xl font-black text-stone-900">{stats ? stats.active_lots : '—'}</p>
          <p className="text-[11px] text-amber-600 font-medium">Not yet closed</p>
        </div>

        <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Material Categories</span>
            <Layers size={16} className="text-purple-600" />
          </div>
          <p className="text-xl font-black text-stone-900">{stats ? stats.material_categories : '—'}</p>
          <p className="text-[11px] text-purple-600 font-medium">In assigned queue</p>
        </div>
      </div>

      {/* Lot Queue Filters & Search */}
      <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-stone-900 text-base flex items-center space-x-2">
            <Package size={18} className="text-brand-600" />
            <span>Incoming E-Waste Queue</span>
            <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {filteredLots.length}
            </span>
          </h3>

          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search lot ID or material..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-surface-muted focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="text-stone-500 flex items-center mr-1">
            <Filter size={14} className="mr-1" /> Status:
          </span>
          {['all', 'matched', 'handed_over', 'confirmed', 'paid'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-brand-600 text-white font-semibold shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Lot Queue Table / Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-surface-card rounded-card p-8 text-center border border-surface-border text-sm text-stone-500">
            Loading assigned lots…
          </div>
        ) : filteredLots.length === 0 && !loadError ? (
          <div className="bg-surface-card rounded-card p-8 text-center border border-surface-border space-y-2">
            <Package size={36} className="mx-auto text-stone-300" />
            <p className="text-sm font-semibold text-stone-600">No assigned lots match these filters</p>
          </div>
        ) : !loadError ? (
          filteredLots.map(lot => (
            <div
              key={lot.lot_id}
              className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:border-brand-300 transition-colors"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-xl bg-brand-50 border border-brand-200/60 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {(lot.category ?? 'N/A').slice(0, 3)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-stone-900">{lot.lot_id}</span>
                    <span className="bg-stone-100 text-stone-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-stone-200">
                      {lot.category ?? 'N/A'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      lot.status === 'confirmed' || lot.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : lot.status === 'handed_over'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {lot.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 font-medium mt-0.5">
                    {lot.sub_category} • {lot.weight_kg} kg • Condition: <span className="capitalize">{lot.condition}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 self-end md:self-center">
                <div className="text-right">
                  <p className="text-sm font-bold text-stone-900">
                    ₹{(lot.final_sale_value || lot.estimated_value).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-stone-500 font-medium">
                    {lot.payment_status === 'paid' ? 'Paid ✓' : 'Awaiting Settlement'}
                  </p>
                </div>

                {lot.status !== 'confirmed' && lot.status !== 'paid' && lot.status !== 'closed' && (
                  <button
                    onClick={() => navigate(`/handover/${lot.lot_id}`)}
                    className="tap-target px-3 py-1.5 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-xs transition-colors flex items-center space-x-1"
                  >
                    <span>🔐</span>
                    <span>Digital Handover</span>
                  </button>
                )}
              </div>
            </div>
          ))
        ) : null}
      </div>


    </div>
  );
};
