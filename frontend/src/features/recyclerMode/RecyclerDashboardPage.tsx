import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Factory, Package, CheckCircle2, Search, Filter, IndianRupee,
  Award, ShieldCheck, RefreshCw, Layers, ShieldAlert
} from 'lucide-react';
import { db } from '../../data/local/db';

interface AdminLot {
  lot_id: string;
  category: string;
  sub_category: string;
  weight_kg: number;
  condition: string;
  estimated_value: number;
  image_ref?: string;
  collector_id: string;
  status: string;
  final_sale_value?: number;
  payment_status: string;
  created_at?: string;
  recycler_id?: string;
}

interface DashboardStats {
  total_lots: number;
  total_weight_kg: number;
  total_payouts_inr: number;
  verified_recyclers_count: number;
  category_breakdown: Array<{ category: string; count: number; weight_kg: number }>;
}

export const RecyclerDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const userJson = typeof window !== 'undefined' ? localStorage.getItem('kabadiwala_user') : null;
  const currentUser = userJson ? JSON.parse(userJson) : null;
  const recyclerId = currentUser?.recycler_id || currentUser?.id || 'rec-pune-001';
  const recyclerName = currentUser?.name || 'EcoRecycle India (Pune Hub)';
  const mpcbRef = currentUser?.mpcb_ref || 'MPCB/E-WASTE/2024/089';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lots, setLots] = useState<AdminLot[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLot, setSelectedLot] = useState<AdminLot | null>(null);
  const [overridePrice, setOverridePrice] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Local IndexedDB matched transactions
      const localTxs = await db.transactions.toArray();
      const matchedLocalTxs = localTxs.filter(t => !t.recycler_id || t.recycler_id === recyclerId);
      const allLocalMats = await db.materials.toArray();
      const localMatMap = new Map();
      allLocalMats.forEach(m => localMatMap.set(m.lot_id, m));

      const localLots: AdminLot[] = matchedLocalTxs.map(tx => {
        const mat = localMatMap.get(tx.lot_id);
        return {
          lot_id: tx.lot_id,
          category: tx.material_category,
          sub_category: mat?.sub_category || tx.material_category,
          weight_kg: mat?.approx_weight_kg || 5.0,
          condition: mat?.condition || 'intact',
          estimated_value: tx.final_sale_value || tx.quoted_price || mat?.estimated_value || 0,
          collector_id: tx.collector_id,
          status: tx.status,
          final_sale_value: tx.final_sale_value,
          payment_status: tx.payment_status || 'unpaid',
          created_at: tx.created_at,
          recycler_id: tx.recycler_id || recyclerId,
        };
      });

      // 2. Backend lots
      const lotsRes: AdminLot[] = await fetch('http://localhost:8000/admin/lots')
        .then(r => (r.ok ? r.json() : []))
        .catch(() => []);

      // Scoped mock datasets for demo accounts
      const facilityMockLots: Record<string, AdminLot[]> = {
        'rec-pune-001': [
          { lot_id: 'lot-pune-101', category: 'PCB', sub_category: 'Server Motherboards & RAM', weight_kg: 25.0, condition: 'intact', estimated_value: 6500, collector_id: 'col-demo-101', status: 'matched', payment_status: 'unpaid', recycler_id: 'rec-pune-001' },
          { lot_id: 'lot-pune-102', category: 'BATTERY', sub_category: 'Li-Ion Laptop Battery Packs', weight_kg: 18.0, condition: 'damaged', estimated_value: 1620, collector_id: 'col-sub-001', status: 'confirmed', final_sale_value: 1620, payment_status: 'paid', recycler_id: 'rec-pune-001' },
          { lot_id: 'lot-pune-103', category: 'CABLE', sub_category: 'Stripped Industrial Copper Wire', weight_kg: 32.0, condition: 'stripped', estimated_value: 4800, collector_id: 'col-sub-002', status: 'closed', final_sale_value: 4800, payment_status: 'paid', recycler_id: 'rec-pune-001' },
        ],
        'rec-mum-001': [
          { lot_id: 'lot-mum-201', category: 'PCB', sub_category: 'Telecom Switching Racks & Gold PCBs', weight_kg: 45.0, condition: 'intact', estimated_value: 12825, collector_id: 'col-demo-101', status: 'matched', payment_status: 'unpaid', recycler_id: 'rec-mum-001' },
          { lot_id: 'lot-mum-202', category: 'BATTERY', sub_category: 'Industrial UPS Battery Banks', weight_kg: 60.0, condition: 'intact', estimated_value: 6300, collector_id: 'col-ind-001', status: 'confirmed', final_sale_value: 6300, payment_status: 'paid', recycler_id: 'rec-mum-001' },
        ],
        'rec-pune-002': [
          { lot_id: 'lot-chin-301', category: 'MOTOR_MAGNET', sub_category: 'Neodymium Stator Motor Assemblies', weight_kg: 40.0, condition: 'intact', estimated_value: 3000, collector_id: 'col-sub-001', status: 'matched', payment_status: 'unpaid', recycler_id: 'rec-pune-002' },
          { lot_id: 'lot-chin-302', category: 'CRT', sub_category: 'Lead Glass Vacuum Tubes', weight_kg: 50.0, condition: 'damaged', estimated_value: 2000, collector_id: 'col-sub-002', status: 'closed', final_sale_value: 2000, payment_status: 'paid', recycler_id: 'rec-pune-002' },
        ],
      };

      const fallbackList = facilityMockLots[recyclerId] || facilityMockLots['rec-pune-001'];

      // Combine & deduplicate
      const combined = [...localLots, ...lotsRes.filter(l => !l.recycler_id || l.recycler_id === recyclerId), ...fallbackList];
      const uniqueLotsMap = new Map<string, AdminLot>();
      combined.forEach(l => {
        if (!uniqueLotsMap.has(l.lot_id)) uniqueLotsMap.set(l.lot_id, l);
      });

      const finalLotList = Array.from(uniqueLotsMap.values());
      setLots(finalLotList);

      // Compute facility-specific dynamic stats
      let totalWt = 0;
      let totalPayout = 0;
      const catCount: Record<string, { count: number; weight: number }> = {};

      finalLotList.forEach(l => {
        totalWt += l.weight_kg;
        if (l.payment_status === 'paid' || l.status === 'closed') {
          totalPayout += l.final_sale_value || l.estimated_value;
        }
        if (!catCount[l.category]) catCount[l.category] = { count: 0, weight: 0 };
        catCount[l.category].count += 1;
        catCount[l.category].weight += l.weight_kg;
      });

      setStats({
        total_lots: finalLotList.length,
        total_weight_kg: Math.round(totalWt * 100) / 100,
        total_payouts_inr: Math.round(totalPayout * 100) / 100,
        verified_recyclers_count: 1,
        category_breakdown: Object.entries(catCount).map(([cat, val]) => ({
          category: cat,
          count: val.count,
          weight_kg: Math.round(val.weight * 100) / 100,
        })),
      });
    } catch {
      // Graceful error fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [recyclerId]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedLot) return;
    setActionLoading(true);
    const saleVal = overridePrice ? parseFloat(overridePrice) : selectedLot.estimated_value;

    try {
      const res = await fetch(`http://localhost:8000/admin/lots/${selectedLot.lot_id}/status?status=${newStatus}&final_sale_value=${saleVal}`, {
        method: 'PATCH',
      });
      if (res.ok) {
        setLots(prev =>
          prev.map(l => (l.lot_id === selectedLot.lot_id ? { ...l, status: newStatus, final_sale_value: saleVal, payment_status: 'paid' } : l))
        );
        setSelectedLot(null);
      }
    } catch {
      // offline optimism
      setLots(prev =>
        prev.map(l => (l.lot_id === selectedLot.lot_id ? { ...l, status: newStatus, final_sale_value: saleVal, payment_status: 'paid' } : l))
      );
      setSelectedLot(null);
    } finally {
      setActionLoading(false);
    }
  };

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
              <h2 className="text-xl font-bold tracking-tight">EcoRecycle India — Portal</h2>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center space-x-1">
                <ShieldCheck size={12} className="mr-0.5" /> MPCB Verified
              </span>
            </div>
            <p className="text-xs text-stone-400 font-medium mt-0.5">Formal E-Waste Aggregator & Processing Hub (Pune District)</p>
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

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Total Intake</span>
            <Package size={16} className="text-brand-600" />
          </div>
          <p className="text-xl font-black text-stone-900">{stats ? `${stats.total_weight_kg} kg` : '0 kg'}</p>
          <p className="text-[11px] text-emerald-600 font-medium">↑ 14% this month</p>
        </div>

        <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Disbursed Payouts</span>
            <IndianRupee size={16} className="text-emerald-600" />
          </div>
          <p className="text-xl font-black text-stone-900">₹{stats ? stats.total_payouts_inr.toLocaleString('en-IN') : '0'}</p>
          <p className="text-[11px] text-stone-500 font-medium">Direct cash & UPI</p>
        </div>

        <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Active Lots</span>
            <Layers size={16} className="text-amber-600" />
          </div>
          <p className="text-xl font-black text-stone-900">{stats ? stats.total_lots : 0}</p>
          <p className="text-[11px] text-amber-600 font-medium">Pending verification</p>
        </div>

        <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Authorized Recyclers</span>
            <Award size={16} className="text-purple-600" />
          </div>
          <p className="text-xl font-black text-stone-900">{stats ? stats.verified_recyclers_count : 1}</p>
          <p className="text-[11px] text-purple-600 font-medium">Licensed facility</p>
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
        {filteredLots.length === 0 ? (
          <div className="bg-surface-card rounded-card p-8 text-center border border-surface-border space-y-2">
            <Package size={36} className="mx-auto text-stone-300" />
            <p className="text-sm font-semibold text-stone-600">No lots found matching criteria</p>
          </div>
        ) : (
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
        )}
      </div>


    </div>
  );
};
