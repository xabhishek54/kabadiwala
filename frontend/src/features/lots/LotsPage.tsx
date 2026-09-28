import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/local/db';
import { fetchCollectorLedger } from '../../data/remote/apiClient';
import {
  Package, ArrowLeft, Plus, QrCode, Search,
  ShieldCheck, ChevronRight, ChevronDown, RefreshCw, Factory, Edit3
} from 'lucide-react';
import { NotificationBell } from '../../components/NotificationBell';
import { EditScheduleModal } from './EditScheduleModal';
import { HazardActionButton } from '../../components/HazardActionButton';

export interface LotItemDisplay {
  lotId: string;
  title: string;
  category: string;
  categoryIcon: string;
  weight: number;
  price: number;
  status: 'draft' | 'matched' | 'handed_over' | 'confirmed' | 'paid' | 'closed';
  statusLabel: string;
  statusColor: string;
  date: string;
  photoUri?: string;
  recyclerName?: string;
  recyclerAuthRef?: string;
  pickupScheduledDate?: string;
  pickupWindow?: string;
  collectionAddress?: string;
}

export const LotsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Matched' | 'Completed'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [backendItems, setBackendItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLotId, setExpandedLotId] = useState<string | null>(null);
  const [editingLot, setEditingLot] = useState<LotItemDisplay | null>(null);

  const userStr = typeof window !== 'undefined' ? localStorage.getItem('kabadiwala_user') : null;
  const userObj = userStr ? JSON.parse(userStr) : null;
  const collectorId = localStorage.getItem('kabadiwala_collector_id') || userObj?.id || 'col-demo-101';

  // Live IndexedDB query
  const liveTransactions = useLiveQuery(() => db.transactions.toArray(), []) || [];
  const liveMaterials = useLiveQuery(() => db.materials.toArray(), []) || [];

  useEffect(() => {
    async function loadBackendLots() {
      if (collectorId) {
        setLoading(true);
        const data = await fetchCollectorLedger(collectorId).catch(() => null);
        if (data && data.items) {
          setBackendItems(data.items);
        }
        setLoading(false);
      }
    }
    loadBackendLots();
  }, [collectorId]);

  const categoryIconMap: Record<string, string> = {
    PCB: '🖥️',
    BATTERY: '🔋',
    CABLE: '🔌',
    LCD_PANEL: '📺',
    CRT: '📺',
    MOTOR_MAGNET: '🧲',
    MIXED_PLASTIC: '♻️',
  };

  // Process local items
  const localLots: LotItemDisplay[] = liveMaterials.map((mat) => {
    const tx = liveTransactions.find((t) => t.lot_id === mat.lot_id);
    const isPaid = tx?.payment_status === 'paid' || tx?.status === 'closed' || tx?.status === 'paid';
    const isMatched = !isPaid && (
      tx?.status === 'matched' ||
      tx?.status === 'handed_over' ||
      tx?.status === 'confirmed' ||
      Boolean(tx?.recycler_id)
    );

    let status: LotItemDisplay['status'] = 'draft';
    let statusLabel = 'Draft';
    let statusColor = 'bg-amber-50 text-amber-800 border border-amber-200/70';

    if (isPaid) {
      status = 'paid';
      statusLabel = 'Paid ✓';
      statusColor = 'bg-emerald-50 text-emerald-800 border border-emerald-200/70';
    } else if (isMatched) {
      status = 'matched';
      statusLabel = 'Matched';
      statusColor = 'bg-blue-50 text-blue-800 border border-blue-200/70';
    }

    const recyclerNameMap: Record<string, string> = {
      'rec-pune-001': 'EcoRecycle India (Pune Hub)',
      'rec-pune-002': 'Chinchwad Aggregators & Metals',
      'rec-mum-001': 'GreenTech E-Waste Solutions',
      'rec-mum-002': 'Dharavi Metal & E-Resource',
      'rec-thane-001': 'Thane E-Scrap Solutions',
      'rec-nag-001': 'Nagpur CleanTech Recovery',
    };

    const recName = tx?.recycler_name || (tx?.recycler_id ? recyclerNameMap[tx.recycler_id] || tx.recycler_id : undefined);

    return {
      lotId: mat.lot_id,
      title: mat.sub_category || mat.material_category || 'Scrap Lot',
      category: mat.material_category || 'PCB',
      categoryIcon: categoryIconMap[mat.material_category] || '📦',
      weight: mat.approx_weight_kg || 0,
      price: tx?.quoted_price || mat.estimated_value || 0,
      status,
      statusLabel,
      statusColor,
      date: mat.created_at ? new Date(mat.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Today',
      photoUri: mat.image_ref,
      recyclerName: recName,
      recyclerAuthRef: tx?.recycler_auth_ref,
      pickupScheduledDate: tx?.pickup_scheduled_date,
      pickupWindow: tx?.pickup_window,
      collectionAddress: mat.collection_address || tx?.collection_address,
    };
  });

  // Deduplicate and combine local + backend items
  const lotMap = new Map<string, LotItemDisplay>();
  localLots.forEach(item => lotMap.set(item.lotId, item));

  const recyclerNameMapBackend: Record<string, string> = {
    'rec-pune-001': 'EcoRecycle India (Pune Hub)',
    'rec-pune-002': 'Chinchwad Aggregators & Metals',
    'rec-mum-001': 'GreenTech E-Waste Solutions',
  };

  backendItems.forEach(bItem => {
    if (!lotMap.has(bItem.lot_id)) {
      const isPaid = bItem.payment_status === 'paid' || bItem.status === 'closed';
      const isMatched = bItem.status === 'matched' || bItem.status === 'handed_over';

      let status: LotItemDisplay['status'] = 'draft';
      if (isPaid) status = 'paid';
      else if (isMatched) status = 'matched';

      const recName = bItem.recycler_name || (bItem.recycler_id ? recyclerNameMapBackend[bItem.recycler_id] || bItem.recycler_id : undefined);

      lotMap.set(bItem.lot_id, {
        lotId: bItem.lot_id,
        title: bItem.material_category,
        category: bItem.material_category,
        categoryIcon: categoryIconMap[bItem.material_category] || '📦',
        weight: bItem.weight_kg || 5,
        price: bItem.amount || 0,
        status,
        statusLabel: isPaid ? 'Paid ✓' : isMatched ? 'Matched' : 'Draft',
        statusColor: isPaid ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/70' : isMatched ? 'bg-blue-50 text-blue-800 border border-blue-200/70' : 'bg-amber-50 text-amber-800 border border-amber-200/70',
        date: bItem.created_at ? new Date(bItem.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Today',
        recyclerName: recName,
      });
    }
  });

  const displayLots = Array.from(lotMap.values());

  // Metrics
  const activeCount = displayLots.filter(l => l.status !== 'paid' && l.status !== 'closed').length;
  const matchedCount = displayLots.filter(l => l.status === 'matched').length;
  const completedCount = displayLots.filter(l => l.status === 'paid' || l.status === 'closed').length;
  const totalWeight = displayLots.reduce((acc, l) => acc + l.weight, 0);

  const filteredLots = displayLots.filter(l => {
    if (activeTab === 'Active' && (l.status === 'paid' || l.status === 'closed')) return false;
    if (activeTab === 'Matched' && l.status !== 'matched') return false;
    if (activeTab === 'Completed' && l.status !== 'paid' && l.status !== 'closed') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = l.lotId.toLowerCase().includes(q);
      const matchTitle = l.title.toLowerCase().includes(q);
      if (!matchId && !matchTitle) return false;
    }
    return true;
  });

  return (
    <div className="pb-24 pt-4 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto space-y-4 font-sans text-stone-900">

      {/* Top Header — compact with Notification Bell */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-full hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base font-black text-stone-900 tracking-tight">My Scrap Lots</h1>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={() => navigate('/create-lot')}
            className="bg-[#16A34A] hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-full shadow-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={13} />
            <span>New Lot</span>
          </button>
        </div>
      </div>

      {/* Compact inline stats strip */}
      <div className="flex items-center gap-3 text-[11px] font-semibold text-stone-500 bg-white border border-stone-200/80 rounded-2xl px-4 py-2.5 shadow-xs overflow-x-auto scrollbar-hide">
        <span className="shrink-0">{displayLots.length} <span className="font-black text-stone-800">Total</span></span>
        <span className="text-stone-300">·</span>
        <span className="shrink-0 text-amber-700">{activeCount} <span className="font-black">Pending</span></span>
        <span className="text-stone-300">·</span>
        <span className="shrink-0 text-blue-700">{matchedCount} <span className="font-black">Matched</span></span>
        <span className="text-stone-300">·</span>
        <span className="shrink-0 text-emerald-700">{completedCount} <span className="font-black">Done</span></span>
        <span className="text-stone-300">·</span>
        <span className="shrink-0 text-stone-500">{totalWeight} kg</span>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-3 text-stone-400" />
          <input
            type="text"
            placeholder="Search lot ID or material title..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200/80 rounded-2xl text-xs font-semibold text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] shadow-xs"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {(['All', 'Active', 'Matched', 'Completed'] as const).map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#16A34A] text-white shadow-xs'
                    : 'bg-white border border-stone-200/80 text-stone-700 hover:bg-stone-50'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lots Grid / Cards List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-stone-500 font-semibold animate-pulse space-y-2 bg-white rounded-3xl border border-stone-200">
          <RefreshCw size={24} className="mx-auto text-stone-300 animate-spin" />
          <p>Loading created scrap lots...</p>
        </div>
      ) : filteredLots.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-stone-200 space-y-3">
          <Package size={36} className="mx-auto text-stone-300" />
          <div>
            <h3 className="font-extrabold text-stone-800 text-sm">No Lots Found</h3>
            <p className="text-xs text-stone-500 mt-0.5">Create a new scrap lot to estimate market value and match with authorized recyclers.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/create-lot')}
            className="bg-[#16A34A] hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-2xl shadow-xs"
          >
            + Create First Lot
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
          {filteredLots.map(lot => {
            const isExpanded = expandedLotId === lot.lotId;
            return (
              <div
                key={lot.lotId}
                onClick={() => setExpandedLotId(isExpanded ? null : lot.lotId)}
                className={`bg-white rounded-2xl border transition-all cursor-pointer p-3 space-y-2.5 h-fit ${
                  isExpanded
                    ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500/20'
                    : 'border-stone-200/80 hover:border-stone-300 shadow-xs'
                }`}
              >
                {/* Minimalist Card Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {lot.photoUri ? (
                      <img src={lot.photoUri} alt="Lot preview" className="w-9 h-9 rounded-lg object-cover border border-stone-200 shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-lg shrink-0">
                        {lot.categoryIcon}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-stone-900 text-xs truncate leading-tight">{lot.title}</h3>
                      <div className="flex items-center gap-1 text-[10px] text-stone-400 font-medium">
                        <span className="font-mono text-stone-600 font-bold">{lot.lotId.slice(0, 8)}</span>
                        <span>•</span>
                        <span>{lot.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${lot.statusColor}`}>
                      {lot.statusLabel}
                    </span>
                    <ChevronDown size={14} className={`text-stone-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-emerald-600' : ''}`} />
                  </div>
                </div>

                {/* Ultra-compact Metrics Line */}
                <div className="bg-stone-50 border border-stone-200/60 rounded-xl p-2 flex items-center justify-between text-xs font-semibold">
                  <div className="text-[11px] text-stone-600">
                    <span className="text-stone-400">Weight:</span> <strong className="text-stone-900 font-black">{lot.weight} kg</strong>
                  </div>
                  <div className="text-[11px] text-right">
                    <span className="text-stone-400">Est. Payout:</span> <strong className="text-[#16A34A] font-black text-xs">₹{lot.price.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                {/* Micro-Expanded Section (Revealed ONLY when clicked) */}
                {isExpanded && (
                  <div
                    className="pt-2 border-t border-stone-100 space-y-2 animate-fadeIn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {lot.recyclerName && (
                      <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-2 space-y-1 text-[10px]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-900 truncate">
                            <Factory size={12} className="text-[#16A34A] shrink-0" />
                            <span className="truncate">{lot.recyclerName}</span>
                          </div>
                          {lot.recyclerAuthRef && (
                            <span className="font-mono text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">
                              {lot.recyclerAuthRef}
                            </span>
                          )}
                        </div>

                        {lot.pickupScheduledDate && (
                          <div className="text-[10px] text-stone-600 font-semibold flex items-center justify-between pt-0.5 border-t border-emerald-200/50">
                            <span>📅 Pickup: <strong className="text-stone-900">{lot.pickupScheduledDate}</strong></span>
                            <span className="capitalize text-emerald-800 font-bold">{lot.pickupWindow || 'Afternoon'}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {lot.collectionAddress && (
                      <div className="text-[10px] text-stone-500 font-medium px-1 truncate flex items-center gap-1">
                        <span>📍 Collection:</span>
                        <span className="text-stone-700 font-semibold truncate">{lot.collectionAddress}</span>
                      </div>
                    )}

                    {/* Dynamic Hazard Action Button for immediate step & auto safety logging */}
                    <div className="pt-1">
                      <HazardActionButton category={lot.category} lotId={lot.lotId} />
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {lot.status === 'matched' ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/handover/${lot.lotId}`);
                            }}
                            className="flex-1 bg-[#16A34A] hover:bg-emerald-700 text-white font-extrabold text-[11px] py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer"
                          >
                            <QrCode size={13} />
                            <span>Digital Handover QR</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingLot(lot);
                            }}
                            className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-extrabold text-[10px] rounded-xl flex items-center gap-1 border border-stone-200 transition-colors cursor-pointer"
                            title="Edit schedule or location"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>
                        </div>
                      ) : lot.status === 'draft' ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/match/${lot.lotId}`);
                            }}
                            className="flex-1 bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-[11px] py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer"
                          >
                            <span>Select Recycler & Match</span>
                            <ChevronRight size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingLot(lot);
                            }}
                            className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-extrabold text-[10px] rounded-xl flex items-center gap-1 border border-stone-200 transition-colors cursor-pointer"
                            title="Edit schedule or location"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/handover/${lot.lotId}`);
                          }}
                          className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-extrabold text-[11px] py-1.5 px-2.5 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <ShieldCheck size={13} className="text-emerald-600" />
                          <span>View Digital Receipt</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Schedule & Location Modal */}
      {editingLot && (
        <EditScheduleModal
          lotId={editingLot.lotId}
          initialDate={editingLot.pickupScheduledDate}
          initialWindow={editingLot.pickupWindow as any}
          initialAddress={editingLot.collectionAddress}
          recyclerName={editingLot.recyclerName}
          onSaveSuccess={() => {
            setEditingLot(null);
          }}
          onClose={() => setEditingLot(null)}
        />
      )}
    </div>
  );
};

export default LotsPage;

