import React, { useState, useEffect } from 'react';
import {
  Factory, Package, CheckCircle2, Search, Filter, IndianRupee,
  Award, ShieldCheck, RefreshCw, Layers
} from 'lucide-react';

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
}

interface DashboardStats {
  total_lots: number;
  total_weight_kg: number;
  total_payouts_inr: number;
  verified_recyclers_count: number;
  category_breakdown: Array<{ category: string; count: number; weight_kg: number }>;
}

export const RecyclerDashboardPage: React.FC = () => {
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
      const [statsRes, lotsRes] = await Promise.all([
        fetch('http://localhost:8000/admin/dashboard-stats').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('http://localhost:8000/admin/lots').then(r => r.ok ? r.json() : []).catch(() => []),
      ]);

      if (statsRes) {
        setStats(statsRes);
      } else {
        // Fallback mock stats if offline
        setStats({
          total_lots: 24,
          total_weight_kg: 345.5,
          total_payouts_inr: 89400,
          verified_recyclers_count: 8,
          category_breakdown: [
            { category: 'PCB', count: 10, weight_kg: 120.0 },
            { category: 'BATTERY', count: 8, weight_kg: 140.5 },
            { category: 'CABLE', count: 6, weight_kg: 85.0 },
          ],
        });
      }

      if (lotsRes && lotsRes.length > 0) {
        setLots(lotsRes);
      } else {
        // Fallback mock lots for dashboard demo
        setLots([
          {
            lot_id: 'lot-8801',
            category: 'PCB',
            sub_category: 'Server Motherboards & RAM',
            weight_kg: 25.0,
            condition: 'intact',
            estimated_value: 8750,
            collector_id: 'coll-991',
            status: 'matched',
            payment_status: 'unpaid',
            created_at: new Date().toISOString(),
          },
          {
            lot_id: 'lot-8802',
            category: 'BATTERY',
            sub_category: 'Li-Ion Laptop Packs',
            weight_kg: 18.5,
            condition: 'damaged',
            estimated_value: 3330,
            collector_id: 'coll-402',
            status: 'handed_over',
            payment_status: 'unpaid',
            created_at: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            lot_id: 'lot-8803',
            category: 'CABLE',
            sub_category: 'Heavy Copper Wiring',
            weight_kg: 42.0,
            condition: 'stripped',
            estimated_value: 7560,
            collector_id: 'coll-104',
            status: 'confirmed',
            final_sale_value: 7560,
            payment_status: 'paid',
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
        ]);
      }
    } catch {
      // offline silent fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

        <button
          onClick={fetchData}
          className="tap-target px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center space-x-1.5 border border-stone-700 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Queue</span>
        </button>
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
                  {lot.category.slice(0, 3)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-stone-900">{lot.lot_id}</span>
                    <span className="bg-stone-100 text-stone-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-stone-200">
                      {lot.category}
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

                {lot.status !== 'confirmed' && lot.status !== 'paid' && (
                  <button
                    onClick={() => {
                      setSelectedLot(lot);
                      setOverridePrice((lot.final_sale_value || lot.estimated_value).toString());
                    }}
                    className="tap-target px-3 py-1.5 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-xs transition-colors"
                  >
                    Verify & Confirm
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Verify & Price Override Modal */}
      {selectedLot && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-card border border-surface-border shadow-elevated p-5 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="font-bold text-stone-900 text-base">Verify & Settle Lot</h3>
                <p className="text-xs text-stone-500 font-mono">Lot ID: {selectedLot.lot_id}</p>
              </div>
              <button
                onClick={() => setSelectedLot(null)}
                className="text-stone-400 hover:text-stone-600 font-bold text-sm px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-stone-700">
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Material Category:</span>
                <span className="font-bold">{selectedLot.category} ({selectedLot.sub_category})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Weight & Condition:</span>
                <span className="font-bold">{selectedLot.weight_kg} kg — {selectedLot.condition}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">System Estimated Value:</span>
                <span className="font-bold">₹{selectedLot.estimated_value.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-bold text-stone-800">
                Final Agreed Value (₹) — Recycler Grade Refinement:
              </label>
              <input
                type="number"
                value={overridePrice}
                onChange={e => setOverridePrice(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold border border-stone-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setSelectedLot(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus('confirmed')}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center justify-center space-x-1"
              >
                <CheckCircle2 size={16} />
                <span>Confirm & Pay</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
