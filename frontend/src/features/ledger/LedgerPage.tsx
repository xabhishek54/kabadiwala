import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/local/db';
import { fetchCollectorLedger } from '../../data/remote/apiClient';
import {
  TrendingUp, IndianRupee, ArrowLeft,
  CheckCircle2, Clock, Wallet, RefreshCw, X, ShieldCheck
} from 'lucide-react';

interface PaymentEntry {
  id: string;
  title: string;
  categoryIcon: string;
  weight: string;
  amount: number;
  status: 'paid' | 'pending' | 'processing';
  date: string;
  recyclerName?: string;
  paymentMethod?: string;
}

const categoryIconMap: Record<string, string> = {
  PCB: '🖥️', BATTERY: '🔋', CABLE: '🔌',
  LCD_PANEL: '📺', CRT: '📺', MOTOR_MAGNET: '🧲', MIXED_PLASTIC: '♻️',
};

export const LedgerPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'All' | 'Paid' | 'Pending'>('All');
  const [selectedEntry, setSelectedEntry] = useState<PaymentEntry | null>(null);
  const [backendItems, setBackendItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const userStr = typeof window !== 'undefined' ? localStorage.getItem('kabadiwala_user') : null;
  const userObj = userStr ? JSON.parse(userStr) : null;
  const collectorId = localStorage.getItem('kabadiwala_collector_id') || userObj?.id || 'col-demo-101';

  const liveTransactions = useLiveQuery(
    () => db.transactions.where('collector_id').equals(collectorId).toArray(),
    [collectorId]
  ) || [];
  const liveMaterials = useLiveQuery(
    () => db.materials.where('collector_id').equals(collectorId).toArray(),
    [collectorId]
  ) || [];

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await fetchCollectorLedger(collectorId).catch(() => null);
      if (data?.items) setBackendItems(data.items);
      setLoading(false);
    }
    load();
  }, [collectorId]);

  // Build unified payment entries from local DB + backend
  const localEntries: PaymentEntry[] = liveMaterials.map((mat) => {
    const tx = liveTransactions.find((t) => t.lot_id === mat.lot_id);
    const isPaid = tx?.payment_status === 'paid' || tx?.status === 'closed';
    const isMatched = tx?.status === 'matched' || Boolean(tx?.recycler_id);
    return {
      id: mat.lot_id,
      title: mat.sub_category || mat.material_category || 'Scrap Lot',
      categoryIcon: categoryIconMap[mat.material_category] || '📦',
      weight: `${mat.approx_weight_kg ?? '–'} kg`,
      amount: tx?.quoted_price || mat.estimated_value || 0,
      status: isPaid ? 'paid' : isMatched ? 'processing' : 'pending',
      date: mat.created_at
        ? new Date(mat.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
        : 'Today',
      recyclerName: tx?.recycler_name || (tx?.recycler_id ? 'Authorized Recycler Hub' : undefined),
      paymentMethod: tx?.payment_method || (isPaid ? 'upi' : 'pending'),
    };
  });

  const entryMap = new Map<string, PaymentEntry>();
  localEntries.forEach((e) => entryMap.set(e.id, e));
  backendItems.forEach((b) => {
    if (!entryMap.has(b.lot_id)) {
      const isPaid = b.payment_status === 'paid' || b.status === 'closed';
      entryMap.set(b.lot_id, {
        id: b.lot_id,
        title: b.material_category || 'Scrap Lot',
        categoryIcon: categoryIconMap[b.material_category] || '📦',
        weight: `${b.weight_kg ?? '–'} kg`,
        amount: b.amount || 0,
        status: isPaid ? 'paid' : 'processing',
        date: b.created_at
          ? new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
          : 'Today',
        recyclerName: b.recycler_name || 'EcoRecycle India Hub',
        paymentMethod: 'upi',
      });
    }
  });

  const allEntries = Array.from(entryMap.values());

  // Financial aggregates
  const totalEarned = allEntries.filter((e) => e.status === 'paid').reduce((s, e) => s + e.amount, 0);
  const totalPending = allEntries.filter((e) => e.status !== 'paid').reduce((s, e) => s + e.amount, 0);
  const informalBenchmark = Math.round(totalEarned * 0.85);
  const savedVsInformal = totalEarned - informalBenchmark;

  const filteredEntries = allEntries.filter((e) => {
    if (activeTab === 'Paid') return e.status === 'paid';
    if (activeTab === 'Pending') return e.status !== 'paid';
    return true;
  });

  const statusMeta = (status: PaymentEntry['status']) => {
    if (status === 'paid') return { label: 'Paid ✓', cls: 'bg-emerald-100 text-emerald-800 border border-emerald-200', icon: <CheckCircle2 size={11} /> };
    if (status === 'processing') return { label: 'Processing', cls: 'bg-blue-100 text-blue-800 border border-blue-200', icon: <RefreshCw size={11} className="animate-spin" /> };
    return { label: 'Pending', cls: 'bg-amber-100 text-amber-800 border border-amber-200', icon: <Clock size={11} /> };
  };

  return (
    <div className="pb-24 pt-4 px-4 sm:px-6 max-w-xl mx-auto space-y-4 font-sans text-stone-900">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">Earnings & Payments</h1>
          <p className="text-[11px] text-stone-500 font-medium">Verified payout records & financial history</p>
        </div>
      </div>

      {/* Hero earnings card */}
      <div className="bg-[#16A34A] text-white rounded-3xl p-5 shadow-md space-y-3 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />

        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold text-white/80 uppercase tracking-wider">Total Received</p>
            <p className="text-3xl font-black tracking-tight mt-0.5">
              ₹{totalEarned.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <Wallet size={20} className="text-white" />
          </div>
        </div>

        <div className="relative grid grid-cols-2 gap-2 pt-1">
          <div className="bg-white/15 rounded-2xl p-2.5 space-y-0.5">
            <p className="text-[10px] text-white/70 font-semibold">Pending / Processing</p>
            <p className="text-sm font-black">₹{totalPending.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white/15 rounded-2xl p-2.5 space-y-0.5">
            <p className="text-[10px] text-white/70 font-semibold">vs Street Rate</p>
            <p className="text-sm font-black flex items-center gap-1">
              <TrendingUp size={13} />
              +₹{savedVsInformal.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* Tab filter */}
      <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-2xl">
        {(['All', 'Paid', 'Pending'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Payment entries */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xs font-extrabold text-stone-900 uppercase tracking-wider">Payment Log</h2>
          <span className="text-[11px] text-stone-400 font-bold">{filteredEntries.length} entries</span>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-stone-200 space-y-2">
            <RefreshCw size={22} className="mx-auto text-stone-300 animate-spin" />
            <p className="text-xs text-stone-500 font-semibold">Loading payments...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-stone-200 space-y-2">
            <IndianRupee size={28} className="mx-auto text-stone-300" />
            <p className="text-sm font-extrabold text-stone-800">No Payments Recorded</p>
            <p className="text-[11px] text-stone-500">Complete a lot handover to view payout records here.</p>
            <button
              type="button"
              onClick={() => navigate('/lots')}
              className="mt-1 text-xs font-bold text-[#16A34A] hover:underline cursor-pointer"
            >
              View My Lots →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEntries.map((entry) => {
              const meta = statusMeta(entry.status);
              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-xs flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-300 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-xl shrink-0">
                      {entry.categoryIcon}
                    </div>

                    <div className="min-w-0">
                      <div className="font-extrabold text-stone-900 text-xs truncate">{entry.title}</div>
                      <div className="text-[10px] text-stone-500 font-medium mt-0.5">
                        {entry.weight} • {entry.date}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <div className={`font-black text-xs sm:text-sm ${entry.status === 'paid' ? 'text-[#16A34A]' : 'text-stone-700'}`}>
                      ₹{entry.amount.toLocaleString('en-IN')}
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>
                      {meta.icon}
                      {meta.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Extra Saved Summary */}
      {totalEarned > 0 && (
        <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3.5 space-y-1.5 text-xs">
          <p className="font-extrabold text-stone-800 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-[#16A34A]" />
            Formal Market Advantage
          </p>
          <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium">
            <span>Estimated street rate</span>
            <span className="font-bold text-stone-700">₹{informalBenchmark.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium">
            <span>Your verified formal earnings</span>
            <span className="font-bold text-[#16A34A]">₹{totalEarned.toLocaleString('en-IN')}</span>
          </div>
          <div className="h-px bg-stone-200 my-1" />
          <div className="flex items-center justify-between text-[11px] font-extrabold text-stone-800">
            <span>Extra value gained</span>
            <span className="text-[#16A34A]">+₹{savedVsInformal.toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}

      {/* Payment Receipt Details Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-stone-200 text-stone-900 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#16A34A]" />
                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm">Payment Receipt</h3>
                  <p className="text-[10px] text-stone-400 font-mono">REC-{selectedEntry.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Receipt Main Details */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{selectedEntry.categoryIcon}</span>
                  <div>
                    <div className="font-extrabold text-stone-900 text-xs">{selectedEntry.title}</div>
                    <div className="text-[10px] text-stone-500">{selectedEntry.weight}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-stone-400 uppercase">Payout</div>
                  <div className="text-lg font-black text-[#16A34A]">₹{selectedEntry.amount.toLocaleString('en-IN')}</div>
                </div>
              </div>

              <div className="h-px bg-stone-200/70" />

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span className="text-stone-400">Date:</span>
                  <span className="font-bold text-stone-800">{selectedEntry.date}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span className="text-stone-400">Payment Status:</span>
                  <span className={`font-bold capitalize ${selectedEntry.status === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {selectedEntry.status}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span className="text-stone-400">Payment Method:</span>
                  <span className="font-bold text-stone-800 uppercase">{selectedEntry.paymentMethod || 'UPI'}</span>
                </div>
                {selectedEntry.recyclerName && (
                  <div className="flex justify-between text-stone-600">
                    <span className="text-stone-400">Facility:</span>
                    <span className="font-bold text-stone-800 truncate max-w-[170px] text-right">{selectedEntry.recyclerName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs cursor-pointer hover:bg-stone-50"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};


