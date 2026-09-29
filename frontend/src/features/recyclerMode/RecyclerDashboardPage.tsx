import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Factory, Package, Search, Filter, IndianRupee,
  Award, ShieldCheck, RefreshCw, Layers, Tag,
  MapPin, Calendar, Phone, Check, X, QrCode, Lock, BookOpen, ArrowRight
} from 'lucide-react';
import { db } from '../../data/local/db';
import { API_BASE_URL } from '../../data/remote/apiClient';
import { NotificationBell } from '../../components/NotificationBell';

interface AdminLot {
  lot_id: string;
  category: string;
  sub_category: string;
  weight_kg: number;
  condition: string;
  estimated_value: number;
  image_ref?: string;
  collector_id: string;
  collector_phone?: string;
  status: string;
  final_sale_value?: number;
  payment_status: string;
  created_at?: string;
  recycler_id?: string;
  collection_address?: string;
  pickup_scheduled_date?: string;
  pickup_exact_time?: string;
  pickup_window?: string;
  pickup_confirmed_by_recycler?: boolean;
}

interface DashboardStats {
  assigned_weight_kg: number;
  paid_total_inr: number;
  active_lots: number;
  material_categories: number;
}

export const RecyclerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isQueuePage = location.pathname === '/recycler/queue';

  const userJson = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? localStorage.getItem('kabadiwala_user') : null;
  const currentUser = userJson ? JSON.parse(userJson) : null;
  const recyclerId = currentUser?.recycler_id || currentUser?.id || 'rec-pune-001';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lots, setLots] = useState<RecyclerLotRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDetailLot, setSelectedDetailLot] = useState<AdminLot | null>(null);
  const [isConfirmingPickup, setIsConfirmingPickup] = useState<boolean>(false);

  const fetchData = async () => {
    if (!isQueuePage) {
      setLoading(false);
      return;
    }
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
      // 1. Local IndexedDB matched transactions
      const localTxs = await db.transactions.toArray();
      const matchedLocalTxs = localTxs.filter(t => t.recycler_id === recyclerId);
      const allLocalMats = await db.materials.toArray();
      const localMatMap = new Map();
      allLocalMats.forEach(m => localMatMap.set(m.lot_id, m));

      const localLots: AdminLot[] = matchedLocalTxs.map(tx => {
        const mat = localMatMap.get(tx.lot_id);
        const cat = (tx as any).material_category || mat?.material_category || 'PCB';
        return {
          lot_id: tx.lot_id,
          category: cat,
          sub_category: mat?.sub_category || cat,
          weight_kg: mat?.approx_weight_kg || 5.0,
          condition: mat?.condition || 'intact',
          estimated_value: tx.final_sale_value || tx.quoted_price || mat?.estimated_value || 0,
          collector_id: tx.collector_id,
          collector_phone: '9876543210',
          status: tx.status,
          final_sale_value: tx.final_sale_value,
          payment_status: tx.payment_status || 'unpaid',
          created_at: tx.created_at,
          recycler_id: tx.recycler_id || recyclerId,
          collection_address: mat?.collection_address || tx.collection_address || 'Wakad, Pune',
          pickup_scheduled_date: tx.pickup_scheduled_date || new Date().toISOString().split('T')[0],
          pickup_exact_time: tx.pickup_exact_time || '14:30',
          pickup_window: tx.pickup_window || 'afternoon',
          pickup_confirmed_by_recycler: tx.pickup_confirmed_by_recycler || false,
        };
      });

      // 2. Backend lots
      const lotsRes: AdminLot[] = await fetch(`${API_BASE_URL}/admin/lots`)
        .then(r => (r.ok ? r.json() : []))
        .catch(() => []);

      const scopedBackendLots = lotsRes.filter(l => l.recycler_id === recyclerId);

      // Scoped mock datasets for demo accounts (only used if no local or backend lots exist)
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

      const realLots = [...localLots, ...scopedBackendLots];
      const fallbackList = realLots.length === 0 ? (facilityMockLots[recyclerId] || []) : [];

      // Combine & deduplicate
      const combined = [...realLots, ...fallbackList];
      const uniqueLotsMap = new Map<string, AdminLot>();
      combined.forEach(l => {
        if (!uniqueLotsMap.has(l.lot_id)) uniqueLotsMap.set(l.lot_id, l);
      });

      const finalLotList = Array.from(uniqueLotsMap.values());
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
  }, [recyclerId, isQueuePage]);

  useEffect(() => {
    if (location.pathname === '/recycler/queue') {
      const queueElement = document.getElementById('incoming-waste-queue');
      if (queueElement && typeof queueElement.scrollIntoView === 'function') {
        queueElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [location.pathname]);

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

  const [showCounterEdit, setShowCounterEdit] = useState<boolean>(false);
  const [counterDate, setCounterDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [counterTime, setCounterTime] = useState<string>('10:00');
  const [counterWindow, setCounterWindow] = useState<'morning' | 'afternoon' | 'evening'>('morning');

  const handleConfirmPickupByRecycler = async (lot: AdminLot) => {
    setIsConfirmingPickup(true);
    const nowIso = new Date().toISOString();

    // 1. Update local transaction
    await db.transactions.update(lot.lot_id, {
      pickup_confirmed_by_recycler: true,
      pickup_confirmed_at: nowIso,
      updated_at: nowIso,
    } as any);

    // 2. Notify the collector
    await db.notifications.add({
      recipient_id: lot.collector_id,
      title: `✅ Pickup Confirmed by Recycler`,
      message: `${currentUser?.name || 'Recycler Facility'} confirmed pickup for Lot ${lot.lot_id.slice(0, 8)} on ${lot.pickup_scheduled_date || 'Today'} @ ${lot.pickup_exact_time || '14:30'}`,
      type: 'pickup_confirmed',
      lot_id: lot.lot_id,
      read: false,
      created_at: nowIso,
    });

    setIsConfirmingPickup(false);
    setSelectedDetailLot(prev => prev ? { ...prev, pickup_confirmed_by_recycler: true } : null);
    fetchData();
  };

  const handleProposeCounterSchedule = async (lot: AdminLot) => {
    setIsConfirmingPickup(true);
    const nowIso = new Date().toISOString();

    await db.transactions.update(lot.lot_id, {
      pickup_scheduled_date: counterDate,
      pickup_exact_time: counterTime,
      pickup_window: counterWindow,
      pickup_confirmed_by_recycler: false,
      updated_at: nowIso,
    } as any);

    await db.notifications.add({
      recipient_id: lot.collector_id,
      title: `📩 Recycler Proposed New Pickup Schedule`,
      message: `${currentUser?.name || 'Recycler Facility'} proposed new pickup time: ${counterDate} @ ${counterTime} (${counterWindow}) for Lot ${lot.lot_id.slice(0, 8)}`,
      type: 'schedule_updated',
      lot_id: lot.lot_id,
      read: false,
      created_at: nowIso,
    });

    setIsConfirmingPickup(false);
    setShowCounterEdit(false);
    setSelectedDetailLot(prev => prev ? {
      ...prev,
      pickup_scheduled_date: counterDate,
      pickup_exact_time: counterTime,
      pickup_window: counterWindow,
      pickup_confirmed_by_recycler: false,
    } : null);
    fetchData();
  };

  return (
    <div className="pb-24 pt-4 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto space-y-6 font-sans text-stone-900">
      {/* Recycler Header — compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/80 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#16A34A] text-white flex items-center justify-center shadow-xs shrink-0">
            <Factory size={22} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">{isQueuePage ? 'Incoming Waste' : 'Recycler Dashboard'}</h1>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center space-x-1">
                <ShieldCheck size={12} /> MPCB Verified
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium">{currentUser?.name || 'EcoRecycle India'} · {currentUser?.district || 'Pune District'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          {isQueuePage && <button
            onClick={fetchData}
            className="p-2 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all cursor-pointer"
            title="Refresh incoming waste"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>}
        </div>
      </div>

      {/* Mobile quick access */}
      {!isQueuePage && <div className="grid grid-cols-2 gap-3 max-w-2xl">
        {[
          { label: 'Incoming Waste', note: 'View new lots', to: '/recycler/queue', icon: <Package size={24} />, bg: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
          { label: 'Buying Rates', note: 'Set material prices', to: '/recycler/rates', icon: <Tag size={24} />, bg: 'bg-blue-50 border-blue-200 text-blue-800' },
          { label: 'Mineral Recovery', note: 'See recovered value', to: '/minerals', icon: <Factory size={24} />, bg: 'bg-amber-50 border-amber-200 text-amber-800' },
          { label: 'Traceability', note: 'Check lot history', to: '/verify', icon: <BookOpen size={24} />, bg: 'bg-violet-50 border-violet-200 text-violet-800' },
        ].map(action => (
          <button
            key={action.to}
            type="button"
            onClick={() => navigate(action.to)}
            className={`${action.bg} border rounded-2xl p-3.5 text-left shadow-xs active:scale-95 transition-all cursor-pointer min-h-[92px] flex items-center gap-3`}
          >
            <div className="w-11 h-11 rounded-xl bg-white/80 flex items-center justify-center shrink-0">{action.icon}</div>
            <div className="min-w-0">
              <div className="font-extrabold text-stone-900 text-sm leading-tight">{action.label}</div>
              <div className="text-[10px] font-semibold text-stone-500 mt-1">{action.note}</div>
            </div>
            <ArrowRight size={14} className="ml-auto shrink-0 opacity-60" />
          </button>
        ))}
      </div>}

      {isQueuePage && <>
      {/* Metrics Banner — Responsive 4 Columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-stone-200/80 shadow-xs hover:shadow-md transition-all space-y-1 sm:space-y-2 min-w-0">
          <div className="flex items-center justify-between text-stone-500 text-[10px] sm:text-xs font-extrabold uppercase tracking-tight sm:tracking-wider">
            <span className="truncate">Total Intake</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Package size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-black text-stone-900 truncate">{stats ? `${stats.total_weight_kg} kg` : '0 kg'}</p>
          <p className="text-[10px] sm:text-xs text-emerald-600 font-bold flex items-center gap-1 leading-tight truncate">↑ 14% monthly intake</p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-stone-200/80 shadow-xs hover:shadow-md transition-all space-y-1 sm:space-y-2 min-w-0">
          <div className="flex items-center justify-between text-stone-500 text-[10px] sm:text-xs font-extrabold uppercase tracking-tight sm:tracking-wider">
            <span className="truncate">Payouts</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <IndianRupee size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-black text-stone-900 truncate">₹{stats ? stats.total_payouts_inr.toLocaleString('en-IN') : '0'}</p>
          <p className="text-[10px] sm:text-xs text-stone-500 font-medium leading-tight truncate">Direct settlements</p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-stone-200/80 shadow-xs hover:shadow-md transition-all space-y-1 sm:space-y-2 min-w-0">
          <div className="flex items-center justify-between text-stone-500 text-[10px] sm:text-xs font-extrabold uppercase tracking-tight sm:tracking-wider">
            <span className="truncate">Active Lots</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Layers size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-black text-stone-900">{stats ? stats.total_lots : 0}</p>
          <p className="text-[10px] sm:text-xs text-amber-700 font-bold leading-tight truncate">Pending verification</p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-stone-200/80 shadow-xs hover:shadow-md transition-all space-y-1 sm:space-y-2 min-w-0">
          <div className="flex items-center justify-between text-stone-500 text-[10px] sm:text-xs font-extrabold uppercase tracking-tight sm:tracking-wider">
            <span className="truncate">Recyclers</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Award size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-black text-stone-900">{stats ? stats.verified_recyclers_count : 1}</p>
          <p className="text-xs text-purple-700 font-bold">MPCB License #BO/MPCB/RO-PUNE/2024</p>
        </div>
      </div>

      {/* Lot Queue Filters & Search */}
      <div id="incoming-waste-queue" className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-4 scroll-mt-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-black text-stone-900 text-lg flex items-center space-x-2.5">
            <Package size={22} className="text-[#16A34A]" />
            <span>Incoming E-Waste Queue</span>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
              {filteredLots.length} Lots
            </span>
          </h3>

          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search lot ID or material title..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-2xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] shadow-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-bold border-t border-stone-100 pt-3">
          <span className="text-stone-400 flex items-center mr-1">
            <Filter size={14} className="mr-1" /> Filter Status:
          </span>
          {['all', 'matched', 'handed_over', 'confirmed', 'paid'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-full capitalize transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#16A34A] text-white shadow-xs font-extrabold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Lot Queue Table / Cards Grid */}
      <div className="space-y-3">
        {filteredLots.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
            <Package size={44} className="mx-auto text-stone-300" />
            <p className="text-base font-bold text-stone-700">No lots found matching criteria</p>
            <p className="text-xs text-stone-500">Incoming scrap lots assigned to your facility will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
            {filteredLots.map(lot => (
              <div
                key={lot.lot_id}
                onClick={() => setSelectedDetailLot(lot)}
                className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-xs hover:border-[#16A34A] hover:shadow-md transition-all cursor-pointer space-y-2 h-fit"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-900 flex items-center justify-center font-black text-[11px] shrink-0">
                      {(lot.category ?? 'N/A').slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-stone-900 text-xs truncate leading-tight">{lot.sub_category}</h4>
                      <div className="text-[10px] text-stone-400 font-mono truncate">{lot.lot_id.slice(0, 8)}</div>
                    </div>
                  </div>

                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full capitalize shrink-0 ${
                    lot.status === 'confirmed' || lot.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : lot.status === 'handed_over'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {lot.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="bg-stone-50 rounded-xl p-2 border border-stone-200/60 flex items-center justify-between text-xs font-semibold">
                  <div className="text-[11px]">
                    <span className="text-stone-400 text-[10px]">Weight:</span> <strong className="text-stone-900 font-black">{lot.weight_kg} kg</strong>
                  </div>
                  <div className="text-[11px] text-right">
                    <span className="text-stone-400 text-[10px]">Payout:</span> <strong className="text-[#16A34A] font-black text-xs">₹{(lot.final_sale_value || lot.estimated_value).toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] text-stone-500 font-medium">
                  <span className="truncate flex items-center gap-1">
                    <MapPin size={11} className="text-stone-400 shrink-0" />
                    <span className="truncate">{lot.collection_address || 'Wakad, Pune'}</span>
                  </span>
                  <span className="text-emerald-700 font-bold shrink-0">Tap details →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Minimalist Detailed Lot Modal Drawer */}
      {selectedDetailLot && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 font-sans text-stone-900">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-stone-200 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-center font-black text-xs">
                  {(selectedDetailLot.category ?? 'N/A').slice(0, 3)}
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm sm:text-base leading-tight">{selectedDetailLot.sub_category}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-stone-500 font-mono">
                    <span>Lot ID: {selectedDetailLot.lot_id}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetailLot(null)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Financial Summary Banner */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Scrap Weight</span>
                <div className="text-base font-black text-stone-900">{selectedDetailLot.weight_kg} kg ({selectedDetailLot.condition})</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Total Payout</span>
                <div className="text-lg font-black text-[#16A34A]">₹{(selectedDetailLot.final_sale_value || selectedDetailLot.estimated_value).toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* Agreed Pickup Schedule */}
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-stone-800 flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#16A34A]" />
                  Scheduled Pickup Time
                </span>
                <div className="flex items-center gap-1">
                  {selectedDetailLot.pickup_confirmed_by_recycler ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Check size={12} /> Accepted & Confirmed
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      Awaiting Recycler Confirmation
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCounterEdit(!showCounterEdit)}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-white border border-stone-200 px-2 py-0.5 rounded-full"
                  >
                    {showCounterEdit ? 'Close' : '✏️ Propose New Time'}
                  </button>
                </div>
              </div>

              {showCounterEdit ? (
                <div className="space-y-2 pt-2 border-t border-stone-200/80 animate-in fade-in duration-150">
                  <span className="text-[11px] font-extrabold text-stone-800 block">Propose Alternative Date & Time:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] font-bold text-stone-400 block uppercase">New Date</span>
                      <input
                        type="date"
                        value={counterDate}
                        onChange={(e) => setCounterDate(e.target.value)}
                        className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-stone-400 block uppercase">New Time</span>
                      <input
                        type="time"
                        value={counterTime}
                        onChange={(e) => setCounterTime(e.target.value)}
                        className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {(['morning', 'afternoon', 'evening'] as const).map(w => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setCounterWindow(w)}
                        className={`py-1.5 px-1 rounded-xl text-[10px] font-bold capitalize border transition-all ${
                          counterWindow === w
                            ? 'border-[#16A34A] bg-emerald-50 text-[#16A34A]'
                            : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={isConfirmingPickup}
                    onClick={() => handleProposeCounterSchedule(selectedDetailLot)}
                    className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Check size={14} />
                    <span>Send Counter Proposal to Collector</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-stone-200/60 text-stone-700">
                  <div>
                    <span className="text-[10px] text-stone-400 block font-semibold">AGREED DATE</span>
                    <strong className="text-stone-900 font-bold">{selectedDetailLot.pickup_scheduled_date || 'Today'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block font-semibold">EXACT TIME WINDOW</span>
                    <strong className="text-stone-900 font-bold">{selectedDetailLot.pickup_exact_time || '14:30'} ({selectedDetailLot.pickup_window || 'Afternoon'})</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Collection Location with Map Pin Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-extrabold text-stone-800">
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#16A34A]" />
                  Collection Address
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold">📍 Pin Verified</span>
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 text-xs font-semibold text-stone-800">
                {selectedDetailLot.collection_address || 'Wakad, Pune, Maharashtra'}
              </div>

              {/* Map Preview Image Tile */}
              <div className="relative h-32 w-full bg-stone-100 border border-stone-200 rounded-2xl overflow-hidden">
                <img
                  src={`https://staticmap.openstreetmap.de/staticmap.php?center=18.5204,73.8567&zoom=14&size=400x160&maptype=mapnik`}
                  alt="Location Map Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-7 h-7 rounded-full bg-[#16A34A] text-white flex items-center justify-center shadow-lg border-2 border-white">
                    <MapPin size={15} />
                  </div>
                </div>
              </div>
            </div>

            {/* Collector Contact info */}
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-stone-400 font-bold uppercase block">Collector</span>
                <strong className="text-stone-900 font-bold">{selectedDetailLot.collector_id}</strong>
              </div>

              <a
                href={`tel:${selectedDetailLot.collector_phone || '9876543210'}`}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1 transition-colors"
              >
                <Phone size={13} />
                <span>Call Collector</span>
              </a>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              {!selectedDetailLot.pickup_confirmed_by_recycler ? (
                <>
                  <button
                    type="button"
                    disabled={isConfirmingPickup}
                    onClick={() => handleConfirmPickupByRecycler(selectedDetailLot)}
                    className="w-full py-3 px-4 rounded-xl bg-[#16A34A] hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {isConfirmingPickup ? (
                      <span>Confirming...</span>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Accept & Confirm Pickup Time</span>
                      </>
                    )}
                  </button>

                  <div className="p-2.5 bg-stone-100 border border-stone-200 rounded-xl text-[11px] text-stone-500 text-center font-bold flex items-center justify-center gap-1.5">
                    <Lock size={13} className="text-stone-400" />
                    <span>Confirm pickup time above to unlock digital handover</span>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDetailLot(null);
                    navigate(`/handover/${selectedDetailLot.lot_id}`);
                  }}
                  className="w-full py-3 px-4 rounded-xl border border-stone-200 bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <QrCode size={16} />
                  <span>Open Digital Handover QR ✓</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}
      </>}
    </div>
  );
};
