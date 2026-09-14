import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/local/db';
import { ArrowLeft, TrendingUp, BarChart2, QrCode, Clock } from 'lucide-react';

export const LedgerPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'Ledger' | 'Active Lots' | 'Completed'>('Ledger');

  // Query live local IndexedDB lots & transactions
  const liveTransactions = useLiveQuery(() => db.transactions.toArray(), []) || [];
  const liveMaterials = useLiveQuery(() => db.materials.toArray(), []) || [];

  // Combine live materials and transactions into display items
  const displayItems = liveMaterials.map((mat) => {
    const tx = liveTransactions.find((t) => t.lot_id === mat.lot_id);
    const categoryIconMap: Record<string, string> = {
      PCB: '🔌', BATTERY: '🔋', CABLE: '🧵', LCD_PANEL: '🖥️', CRT: '📺', MOTOR_MAGNET: '🧲', MIXED_PLASTIC: '♻️',
    };

    const isPaid = tx?.payment_status === 'paid' || tx?.status === 'closed';
    const isMatched = tx?.status === 'matched';

    return {
      lotId: mat.lot_id,
      title: mat.sub_category || mat.material_category || 'Scrap Lot',
      category: mat.material_category,
      categoryIcon: categoryIconMap[mat.material_category] || '📦',
      weight: `${mat.approx_weight_kg} kg`,
      price: `₹${(tx?.quoted_price || mat.estimated_value || 0).toLocaleString('en-IN')}`,
      rawPrice: tx?.quoted_price || mat.estimated_value || 0,
      status: isPaid ? `Paid (${tx?.payment_method?.toUpperCase() || 'CASH'})` : isMatched ? 'Matched (Ready for Handover)' : 'Active Draft',
      statusColor: isPaid ? 'bg-emerald-100 text-emerald-800' : isMatched ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800',
      date: mat.created_at ? new Date(mat.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Today',
      photoUri: mat.image_ref,
      condition: mat.condition,
    };
  });

  // Calculate total earnings from completed transactions + estimated total
  const totalEarned = displayItems.reduce((acc, item) => acc + item.rawPrice, 0);

  const filteredItems = displayItems.filter(item => {
    if (activeTab === 'Active Lots') return !item.status.includes('Paid');
    if (activeTab === 'Completed') return item.status.includes('Paid');
    return true;
  });

  return (
    <div className="pb-24 pt-3 px-4 max-w-md mx-auto space-y-4 font-sans text-stone-900">
      {/* Header bar matching Mobile Screen 5 (< Earnings & Payments) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-stone-200 text-stone-700 font-bold transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-extrabold text-stone-900 text-base">Earnings & Payments</h2>
        </div>

        <button
          type="button"
          onClick={() => navigate('/create-lot')}
          className="text-xs font-bold bg-[#16A34A] text-white px-3 py-1.5 rounded-full shadow-xs active:scale-95 transition-all"
        >
          + New Lot
        </button>
      </div>

      {/* Tabs Row (Ledger / Active Lots / Completed) */}
      <div className="flex items-center gap-2">
        {(['Ledger', 'Active Lots', 'Completed'] as const).map(tab => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
                isActive
                  ? 'bg-[#16A34A] text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Total Earned Green Hero Card (matches Mobile Screen 5) */}
      <div className="bg-[#16A34A] text-white rounded-3xl p-5 shadow-md relative overflow-hidden space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white/80">Total Tracked Earnings</span>
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <BarChart2 size={18} className="text-white" />
          </div>
        </div>

        <div className="text-3xl font-black tracking-tight">₹{totalEarned.toLocaleString('en-IN')}</div>
        
        <div className="flex items-center gap-1 text-xs font-bold text-white/90">
          <TrendingUp size={13} />
          <span>↑ 14% higher than informal street rates</span>
        </div>
      </div>

      {/* Recent Transactions / My Lots List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-stone-900 text-sm">Recorded Lots & Handovers</h3>
          <span className="text-xs text-stone-400 font-bold">{filteredItems.length} Lots</span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-stone-200 space-y-2">
            <Clock size={32} className="mx-auto text-stone-400" />
            <p className="font-bold text-stone-800 text-sm">No Lots Recorded Yet</p>
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
          <div className="space-y-2.5">
            {filteredItems.map(tx => (
              <div
                key={tx.lotId}
                className="bg-white rounded-2xl p-3.5 border border-stone-200 shadow-xs space-y-2 transition-all hover:border-stone-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {tx.photoUri ? (
                      <img src={tx.photoUri} alt="Lot preview" className="w-10 h-10 rounded-2xl object-cover border border-stone-200 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-xl shrink-0">
                        {tx.categoryIcon}
                      </div>
                    )}
                    <div>
                      <div className="font-extrabold text-stone-900 text-xs sm:text-sm">{tx.title}</div>
                      <div className="text-[11px] text-stone-500 font-medium">
                        {tx.weight} • <span className="font-bold text-[#16A34A]">{tx.price}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full block ${tx.statusColor}`}>
                      {tx.status}
                    </span>
                    <span className="text-[10px] font-medium text-stone-400 block">{tx.date}</span>
                  </div>
                </div>

                {/* Handover & Actions Row */}
                <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-xs">
                  <span className="font-mono text-[10px] font-semibold text-stone-400">ID: {tx.lotId.slice(0, 10)}</span>

                  <button
                    type="button"
                    onClick={() => navigate(`/handover/${tx.lotId}`)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#16A34A] hover:underline"
                  >
                    <QrCode size={14} />
                    <span>View Digital Handover QR →</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

