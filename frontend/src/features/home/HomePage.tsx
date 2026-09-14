import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, IndianRupee, MapPin, ArrowRight,
  Package, CheckCircle2, Clock,
  Bell, User, Star
} from 'lucide-react';

/* Category circular icons matching reference image CTA banner */
const CATEGORIES = [
  { label: 'Cables & Wire', icon: '🔌', bg: 'bg-amber-100 text-amber-800' },
  { label: 'Batteries',     icon: '🔋', bg: 'bg-blue-100 text-blue-800' },
  { label: 'PCBs',          icon: '🖥️', bg: 'bg-emerald-100 text-emerald-800' },
  { label: 'Metals',        icon: '⚙️', bg: 'bg-stone-200 text-stone-800' },
  { label: 'Plastics',      icon: '🧴', bg: 'bg-cyan-100 text-cyan-800' },
  { label: 'CRT/LCD',       icon: '📺', bg: 'bg-purple-100 text-purple-800' },
  { label: 'Motors',        icon: '⚡', bg: 'bg-orange-100 text-orange-800' },
];

/* Sample nearby recyclers matching reference image */
const NEARBY_RECYCLERS = [
  {
    id: 'rec-001',
    name: 'GreenCycle Recyclers',
    distance: '2.4 km',
    authorized: true,
    rating: '4.6',
    reviews: 120,
    avatarBg: 'bg-emerald-600',
    avatarText: '🌱',
  },
  {
    id: 'rec-002',
    name: 'EcoMetal Solutions',
    distance: '3.8 km',
    authorized: true,
    rating: '4.3',
    reviews: 86,
    avatarBg: 'bg-teal-600',
    avatarText: '♻️',
  },
  {
    id: 'rec-003',
    name: 'Shree E-Waste Pvt. Ltd.',
    distance: '5.1 km',
    authorized: true,
    rating: '4.1',
    reviews: 64,
    avatarBg: 'bg-indigo-600',
    avatarText: '🏢',
  },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [district] = useState(localStorage.getItem('kabadiwala_district') || 'Pune, Maharashtra');

  useEffect(() => {
    const raw = localStorage.getItem('kabadiwala_user');
    try { setUser(raw ? JSON.parse(raw) : null); } catch { /* */ }
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'Ramesh';

  // Desktop Recent Lots sample list merged with live data
  const sampleRecentLots = [
    { id: 'lot-101', name: 'Copper Cable', category: 'Cables & Wire', weight: 5, estimate: '₹1,300', range: '1.1k – 1.5k', status: 'Matched', statusColor: 'bg-blue-100 text-blue-800' },
    { id: 'lot-102', name: 'PCB Boards', category: 'PCBs', weight: 2.5, estimate: '₹520', range: '450 – 600', status: 'Pending', statusColor: 'bg-amber-100 text-amber-800' },
    { id: 'lot-103', name: 'Mixed E-Waste', category: 'Mixed', weight: 8, estimate: '₹1,800', range: '1.5k – 2.2k', status: 'Draft', statusColor: 'bg-stone-200 text-stone-700' },
  ];

  return (
    <div className="pb-24 pt-4 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* ══════════════════════════════════════════════════════════════
          DESKTOP TOP HEADER BAR (Namaste, Ramesh! + Location + Bell)
      ══════════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            👋 Namaste, {firstName}!
          </h1>
          <p className="text-sm text-stone-500 font-medium mt-0.5">
            Let's make recycling simple, safe and profitable.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Location Selector */}
          <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-full px-4 py-2 text-xs font-bold text-stone-800 shadow-xs cursor-pointer hover:border-brand-500 transition-all">
            <MapPin size={15} className="text-brand-600" />
            <span>{district}</span>
          </div>

          {/* Bell Icon */}
          <button type="button" className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-600 hover:text-stone-900 shadow-xs transition-all">
            <Bell size={16} />
          </button>

          {/* Avatar Icon */}
          <button type="button" onClick={() => navigate('/profile')} className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <User size={18} />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MOBILE HEADER (👋 नमस्ते, Ramesh!)
      ══════════════════════════════════════════════════════════════ */}
      <div className="md:hidden space-y-1">
        <h1 className="text-xl font-black text-stone-900 tracking-tight">
          👋 नमस्ते, {firstName}!
        </h1>
        <p className="text-xs text-stone-500 font-semibold">
          कबाड़ा नहीं, संसाधन है!
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          DESKTOP 4 STAT CARDS ROW
      ══════════════════════════════════════════════════════════════ */}
      <div className="hidden md:grid grid-cols-4 gap-4">
        {/* Total Intake */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Package size={20} />
          </div>
          <div>
            <div className="text-xs text-stone-500 font-semibold">Total Intake</div>
            <div className="text-2xl font-black text-stone-900">92 kg</div>
            <div className="text-xs font-bold text-emerald-600 mt-0.5">↑ 14% this month</div>
          </div>
        </div>

        {/* Disbursed Payouts */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <IndianRupee size={20} />
          </div>
          <div>
            <div className="text-xs text-stone-500 font-semibold">Disbursed Payouts</div>
            <div className="text-2xl font-black text-stone-900">₹29,075</div>
            <div className="text-xs text-stone-400 font-medium mt-0.5">Direct cash & UPI</div>
          </div>
        </div>

        {/* Active Lots */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-xs text-stone-500 font-semibold">Active Lots</div>
            <div className="text-2xl font-black text-stone-900">11</div>
            <div className="text-xs font-bold text-amber-600 mt-0.5">Pending verification</div>
          </div>
        </div>

        {/* Authorized Recyclers */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-xs text-stone-500 font-semibold">Authorized Recyclers</div>
            <div className="text-2xl font-black text-stone-900">1</div>
            <div className="text-xs text-stone-400 font-medium mt-0.5">Licensed facility</div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          CTA BANNER: Create New Lot (Desktop & Mobile versions)
      ══════════════════════════════════════════════════════════════ */}
      {/* Desktop Version */}
      <div className="hidden md:flex items-center justify-between bg-[#F0FDF4] border border-[#DCFCE7] rounded-3xl p-6 shadow-xs">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
            <Camera size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-stone-900">Create New Lot</h2>
            <p className="text-xs text-stone-600 font-medium max-w-sm">
              Take a photo, identify material, enter weight and get instant value estimate.
            </p>
            <button
              type="button"
              onClick={() => navigate('/create-lot')}
              className="mt-2 inline-flex items-center gap-2 bg-[#16A34A] hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-md transition-all active:scale-95"
            >
              <span>Start Now</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Circular Category Icons */}
        <div className="flex items-center gap-4 overflow-x-auto py-2">
          {CATEGORIES.map(cat => (
            <div key={cat.label} className="flex flex-col items-center gap-1.5 cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('/prices')}>
              <div className={`w-12 h-12 rounded-full ${cat.bg} flex items-center justify-center text-xl shadow-xs border border-stone-200/50`}>
                {cat.icon}
              </div>
              <span className="text-[11px] font-bold text-stone-700 whitespace-nowrap">{cat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Version (matches Mobile Screen 1 in reference image) */}
      <div
        onClick={() => navigate('/create-lot')}
        className="md:hidden bg-[#16A34A] text-white rounded-3xl p-4 flex items-center justify-between shadow-md cursor-pointer active:scale-98 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <Camera size={26} className="text-white" />
          </div>
          <div>
            <div className="text-base font-black leading-tight">New Lot</div>
            <div className="text-xs text-white/80 font-medium mt-0.5">Photo • Identify • Weigh</div>
          </div>
        </div>

        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <ArrowRight size={18} className="text-white" />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MOBILE 2x2 QUICK ACCESS TILES (matches Mobile Screen 1)
      ══════════════════════════════════════════════════════════════ */}
      <div className="md:hidden grid grid-cols-2 gap-3">
        {/* Tile 1: Price Board */}
        <button
          type="button"
          onClick={() => navigate('/prices')}
          className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-left space-y-2 shadow-xs active:scale-95 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center text-xl font-bold">
            💰
          </div>
          <div>
            <div className="font-bold text-stone-900 text-sm">Price Board</div>
            <div className="text-[11px] text-stone-500 font-medium mt-0.5">जानें आज का भाव</div>
          </div>
        </button>

        {/* Tile 2: Find Recyclers */}
        <button
          type="button"
          onClick={() => navigate('/recyclers')}
          className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-left space-y-2 shadow-xs active:scale-95 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center text-xl font-bold">
            📍
          </div>
          <div>
            <div className="font-bold text-stone-900 text-sm">Find Recyclers</div>
            <div className="text-[11px] text-stone-500 font-medium mt-0.5">पास में अधिकृत रिसाइकलर</div>
          </div>
        </button>

        {/* Tile 3: My Earnings */}
        <button
          type="button"
          onClick={() => navigate('/ledger')}
          className="bg-green-50 border border-green-100 rounded-2xl p-4 text-left space-y-2 shadow-xs active:scale-95 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-800 flex items-center justify-center text-xl font-bold">
            ₹
          </div>
          <div>
            <div className="font-bold text-stone-900 text-sm">My Earnings</div>
            <div className="text-[11px] text-stone-500 font-medium mt-0.5">मेरी कमाई</div>
          </div>
        </button>

        {/* Tile 4: Safety Guide */}
        <button
          type="button"
          onClick={() => navigate('/safety')}
          className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-left space-y-2 shadow-xs active:scale-95 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center text-xl font-bold">
            🛡️
          </div>
          <div>
            <div className="font-bold text-stone-900 text-sm">Safety Guide</div>
            <div className="text-[11px] text-stone-500 font-medium mt-0.5">सुरक्षा नियम</div>
          </div>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          DESKTOP 2-COLUMN SECTION: Recent Lots (Left) + Nearby Recyclers (Right)
          (Matches top reference image desktop dashboard layout)
      ══════════════════════════════════════════════════════════════ */}
      <div className="hidden md:grid grid-cols-2 gap-6">
        
        {/* Left Column: Recent Lots */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-stone-900 text-base">Recent Lots</h3>
            <button type="button" onClick={() => navigate('/lots')} className="text-xs font-bold text-emerald-600 hover:underline">
              View All
            </button>
          </div>

          <div className="space-y-3">
            {/* Table Header */}
            <div className="grid grid-cols-12 text-[11px] font-bold text-stone-400 uppercase tracking-wider pb-1 border-b border-stone-100">
              <span className="col-span-2">Lot ID</span>
              <span className="col-span-4">Material</span>
              <span className="col-span-2">Weight</span>
              <span className="col-span-2">Estimate</span>
              <span className="col-span-2 text-right">Status</span>
            </div>

            {/* Rows */}
            {sampleRecentLots.map(lot => (
              <div key={lot.id} className="grid grid-cols-12 items-center text-xs py-2 hover:bg-stone-50 rounded-xl px-1 transition-colors">
                <span className="col-span-2 font-mono font-semibold text-stone-500">{lot.id}</span>
                <div className="col-span-4 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                    📦
                  </div>
                  <div>
                    <div className="font-bold text-stone-900">{lot.name}</div>
                    <div className="text-[10px] text-stone-400">{lot.category}</div>
                  </div>
                </div>
                <span className="col-span-2 font-semibold text-stone-700">{lot.weight} kg</span>
                <div className="col-span-2">
                  <div className="font-bold text-stone-900">{lot.estimate}</div>
                  <div className="text-[10px] text-stone-400">{lot.range}</div>
                </div>
                <div className="col-span-2 text-right">
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${lot.statusColor}`}>
                    {lot.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Nearby Authorized Recyclers */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-stone-900 text-base">Nearby Authorized Recyclers</h3>
            <button type="button" onClick={() => navigate('/recyclers')} className="text-xs font-bold text-emerald-600 hover:underline">
              View All
            </button>
          </div>

          <div className="space-y-3">
            {NEARBY_RECYCLERS.map(rec => (
              <div key={rec.id} className="flex items-center justify-between p-3 rounded-2xl border border-stone-100 bg-stone-50/60 hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl ${rec.avatarBg} text-white flex items-center justify-center text-lg font-bold shadow-xs shrink-0`}>
                    {rec.avatarText}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-stone-900 text-xs sm:text-sm">{rec.name}</span>
                      <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold" title="Verified">✓</span>
                    </div>
                    <div className="text-[11px] text-stone-500 font-medium">
                      {rec.distance} • Authorized
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 mt-0.5">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      <span>{rec.rating} ({rec.reviews})</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/recyclers')}
                  className="bg-[#16A34A] hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all active:scale-95"
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
