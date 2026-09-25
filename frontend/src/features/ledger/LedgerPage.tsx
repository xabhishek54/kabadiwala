import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/local/db';
import { fetchCollectorLedger } from '../../data/remote/apiClient';
import { ArrowLeft, TrendingUp, BarChart2, Clock, ChevronRight } from 'lucide-react';

export const LedgerPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'All Lots' | 'Active' | 'Completed'>('All Lots');
  const [backendItems, setBackendItems] = useState<any[]>([]);

  const userStr = typeof window !== 'undefined' ? localStorage.getItem('kabadiwala_user') : null;
  const userObj = userStr ? JSON.parse(userStr) : null;
  const collectorId = localStorage.getItem('kabadiwala_collector_id') || userObj?.id || 'col-demo-101';

  useEffect(() => {
    async function loadBackendLedger() {
      if (collectorId) {
        const data = await fetchCollectorLedger(collectorId);
        if (data && data.items) {
          setBackendItems(data.items);
        }
      }
    }
    loadBackendLedger();
  }, [collectorId]);

  // Query live local IndexedDB lots & transactions
  const liveTransactions = useLiveQuery(() => db.transactions.toArray(), []) || [];
  const liveMaterials = useLiveQuery(() => db.materials.toArray(), []) || [];

  // Combine live materials and transactions into clean display items
  const localItems = liveMaterials.map((mat) => {
    const tx = liveTransactions.find((t) => t.lot_id === mat.lot_id);
    const categoryIconMap: Record<string, string> = {
      PCB: '🔌', BATTERY: '🔋', CABLE: '🧵', LCD_PANEL: '🖥️', CRT: '📺', MOTOR_MAGNET: '🧲', MIXED_PLASTIC: '♻️',
    };

    const isPaid = tx?.payment_status === 'paid' || tx?.status === 'closed';
    const isMatched = tx?.status === 'matched' || Boolean(tx?.recycler_id);

    let statusLabel = 'Select Recycler';
    let statusColor = 'bg-amber-100 text-amber-900 border border-amber-200';
    if (isPaid) {
      statusLabel = 'Paid ✓';
      statusColor = 'bg-emerald-100 text-emerald-800';
    } else if (isMatched) {
      statusLabel = 'Matched (Show QR)';
      statusColor = 'bg-blue-100 text-blue-800';
    }

    return {
      lotId: mat.lot_id,
      title: mat.sub_category || mat.material_category || 'Scrap Lot',
      category: mat.material_category,
      categoryIcon: categoryIconMap[mat.material_category] || '📦',
      weight: `${mat.approx_weight_kg} kg`,
      price: `₹${(tx?.quoted_price || mat.estimated_value || 0).toLocaleString('en-IN')}`,
      rawPrice: tx?.quoted_price || mat.estimated_value || 0,
      isPaid,
      isMatched,
      statusLabel,
      statusColor,
      date: mat.created_at ? new Date(mat.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Today',
      photoUri: mat.image_ref,
    };
  });

  // Deduplicate and combine local + backend items
  const itemMap = new Map<string, any>();
  localItems.forEach(item => itemMap.set(item.lotId, item));
  backendItems.forEach(bItem => {
    if (!itemMap.has(bItem.lot_id)) {
      const isPaid = bItem.payment_status === 'paid' || bItem.status === 'closed';
      itemMap.set(bItem.lot_id, {
        lotId: bItem.lot_id,
        title: bItem.material_category,
        category: bItem.material_category,
        categoryIcon: '📦',
        weight: `${bItem.weight_kg} kg`,
        price: `₹${(bItem.amount || 0).toLocaleString('en-IN')}`,
        rawPrice: bItem.amount || 0,
        isPaid,
        isMatched: true,
        statusLabel: isPaid ? 'Paid ✓' : 'Matched',
        statusColor: isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800',
        date: bItem.created_at ? new Date(bItem.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Today',
      });
    }
  });

  const displayItems = Array.from(itemMap.values());

  // Calculate total earnings
  const totalEarned = displayItems.reduce((acc, item) => acc + item.rawPrice, 0);
  const informalTotal = displayItems.reduce((acc, item) => acc + Math.round(item.rawPrice * 0.85), 0);
  const premiumPct = informalTotal > 0 ? Math.round(((totalEarned - informalTotal) / informalTotal) * 100) : 15;

  const filteredItems = displayItems.filter(item => {
    if (activeTab === 'Active') return !item.isPaid;
    if (activeTab === 'Completed') return item.isPaid;
    return true;
  });

  return (
    <div className="pb-24 pt-3 px-4 max-w-md mx-auto space-y-4 font-sans text-stone-900">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-stone-200 text-stone-700 font-bold transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-extrabold text-stone-900 text-base">My Lots</h2>
        </div>

        <button
          type="button"
          onClick={() => navigate('/create-lot')}
          className="text-xs font-bold bg-[#16A34A] hover:bg-emerald-700 text-white px-3 py-1.5 rounded-full shadow-xs active:scale-95 transition-all"
        >
          + New Lot
        </button>
      </div>

      {/* Simplified Tabs Row */}
      <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-2xl">
        {(['All Lots', 'Active', 'Completed'] as const).map(tab => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Total Earned Hero Card */}
      <div className="bg-[#16A34A] text-white rounded-3xl p-5 shadow-md relative overflow-hidden space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white/80">Total Tracked Value</span>
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <BarChart2 size={18} className="text-white" />
          </div>
        </div>

        <div className="text-3xl font-black tracking-tight">₹{totalEarned.toLocaleString('en-IN')}</div>
        
        <div className="flex items-center gap-1 text-xs font-bold text-white/90">
          <TrendingUp size={13} />
          <span>↑ {premiumPct}% higher than informal street rates</span>
        </div>
      </div>

      {/* Clean Simplified Lots List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-stone-900 text-sm">Recorded Lots</h3>
          <span className="text-xs text-stone-400 font-bold">{filteredItems.length} Total</span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-stone-200 space-y-2">
            <Clock size={32} className="mx-auto text-stone-400" />
            <p className="font-bold text-stone-800 text-sm">No Lots Found</p>
            <p className="text-xs text-stone-500">Create a new lot to estimate price and match with verified recyclers.</p>
            <button
              type="button"
              onClick={() => navigate('/create-lot')}
              className="mt-2 bg-[#16A34A] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs"
            >
              Create First Lot
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map(tx => (
              <div
                key={tx.lotId}
                onClick={() => {
                  if (tx.isMatched || tx.isPaid) {
                    navigate(`/handover/${tx.lotId}`);
                  } else {
                    navigate(`/match/${tx.lotId}`);
                  }
                }}
                className="bg-white rounded-2xl p-3.5 border border-stone-200 shadow-xs flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-400 hover:shadow-sm transition-all active:scale-98"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {tx.photoUri ? (
                    <img src={tx.photoUri} alt="Lot preview" className="w-10 h-10 rounded-xl object-cover border border-stone-200 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-xl shrink-0">
                      {tx.categoryIcon}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-extrabold text-stone-900 text-xs sm:text-sm truncate">{tx.title}</div>
                    <div className="text-[11px] text-stone-500 font-medium">
                      {tx.weight} • {tx.date}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="font-black text-[#16A34A] text-sm">{tx.price}</div>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-block ${tx.statusColor}`}>
                      {tx.statusLabel}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-stone-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

