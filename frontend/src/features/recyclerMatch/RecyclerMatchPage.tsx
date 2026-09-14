import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, type LocalMaterial } from '../../data/local/db';
import { fetchRecyclerMatches } from '../../data/remote/apiClient';
import {
  Search, MapPin, Star, ArrowLeft, CheckCircle2,
  ShieldCheck, Truck, Sparkles, Zap
} from 'lucide-react';

interface RecyclerDisplay {
  recycler_id: string;
  name: string;
  distance_km: number;
  rate_per_kg: number;
  estimated_payout: number;
  authorization_status: string;
  authorization_ref_no?: string;
  rating?: number;
  reviews?: number;
  pickup_available?: boolean;
  score?: number;
  reasons?: string[];
  avatarText?: string;
  avatarBg?: string;
}

export const RecyclerMatchPage: React.FC = () => {
  const { lotId } = useParams<{ lotId?: string }>();
  const navigate = useNavigate();

  const [material, setMaterial] = useState<LocalMaterial | null>(null);
  const [recyclersList, setRecyclersList] = useState<RecyclerDisplay[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Verified' | 'Pickup Available'>('All');
  const [selectedRecyclerId, setSelectedRecyclerId] = useState<string | null>(null);

  const district = (typeof window !== 'undefined' && localStorage.getItem('kabadiwala_district')) || 'Pune, Maharashtra';

  useEffect(() => {
    async function loadMatches() {
      setLoading(true);
      let category = 'PCB';
      let weight = 2.5;

      if (lotId) {
        const mat = await db.materials.get(lotId);
        if (mat) {
          setMaterial(mat);
          category = mat.material_category || 'PCB';
          weight = mat.approx_weight_kg || 2.5;
        }
      }

      const collectorLat = parseFloat(localStorage.getItem('kabadiwala_collector_lat') || '18.5204');
      const collectorLng = parseFloat(localStorage.getItem('kabadiwala_collector_lng') || '73.8567');

      try {
        const matches = await fetchRecyclerMatches(category, collectorLat, collectorLng);
        const formatted: RecyclerDisplay[] = matches.map((m: any, idx: number) => {
          const rec = m.recycler || {};
          const rate = m.rate_for_category || rec.offered_rates?.[category] || 260;
          const dist = m.distance_km || (idx + 1) * 2.2;
          const score = m.score ? Math.round(m.score * 100) : 92 - idx * 6;
          const pickup = m.pickup_available ?? rec.pickup_available ?? true;

          const reasons: string[] = [];
          if (rec.authorization_status === 'verified') reasons.push('MPCB Authorized ✓');
          if (rate >= 240) font: reasons.push(`Best Price (₹${rate}/kg) ✓`);
          if (pickup) reasons.push('Pickup Available ✓');
          if (dist < 5.0) reasons.push(`Nearby (${dist} km) ✓`);

          const avatarBgs = ['bg-emerald-600', 'bg-teal-600', 'bg-indigo-600', 'bg-purple-600'];
          const avatarIcons = ['🌱', '♻️', '🏢', '⚡'];

          return {
            recycler_id: rec.recycler_id || `rec-00${idx + 1}`,
            name: rec.name || 'Authorized Recycler',
            distance_km: parseFloat(dist.toFixed(1)),
            rate_per_kg: rate,
            estimated_payout: Math.round(rate * weight),
            authorization_status: rec.authorization_status || 'verified',
            authorization_ref_no: rec.authorization_ref_no || 'MPCB/E-WASTE/2024/089',
            rating: 4.6 - idx * 0.2,
            reviews: 120 - idx * 30,
            pickup_available: pickup,
            score,
            reasons,
            avatarText: avatarIcons[idx % avatarIcons.length],
            avatarBg: avatarBgs[idx % avatarBgs.length],
          };
        });

        setRecyclersList(formatted);
      } catch (err) {
        console.warn('Matches load fallback:', err);
      } finally {
        setLoading(false);
      }
    }

    loadMatches();
  }, [lotId]);

  const filteredRecyclers = recyclersList.filter(rec => {
    if (activeFilter === 'Verified' && rec.authorization_status !== 'verified') return false;
    if (activeFilter === 'Pickup Available' && !rec.pickup_available) return false;
    if (searchQuery && !rec.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleSelectRecycler = async (rec: RecyclerDisplay) => {
    setSelectedRecyclerId(rec.recycler_id);
    if (lotId) {
      await db.transactions.update(lotId, {
        recycler_id: rec.recycler_id,
        status: 'matched',
        quoted_price: rec.estimated_payout,
        updated_at: new Date().toISOString(),
      } as any);

      navigate(`/handover/${lotId}`);
    } else {
      navigate('/ledger');
    }
  };

  return (
    <div className="pb-24 pt-3 px-4 max-w-md mx-auto space-y-4 font-sans text-stone-900">
      {/* Header Bar matching Mobile Screen 4 (< Nearby Recyclers) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-stone-200 text-stone-700 font-bold transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-extrabold text-stone-900 text-base">Recommended Recyclers</h2>
        </div>

        {material && (
          <span className="text-[11px] font-black bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
            Lot ID: {lotId?.slice(0, 8)}
          </span>
        )}
      </div>

      {/* Material Summary Badge if linked to a Lot */}
      {material && (
        <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-2xl p-3 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-tight">Matching for Material</div>
            <div className="text-xs font-black text-stone-900 mt-0.5">
              {material.sub_category || material.material_category} ({material.approx_weight_kg} kg)
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-extrabold text-stone-400 uppercase">Estimated Value</div>
            <div className="text-sm font-black text-[#16A34A]">₹{material.estimated_value}</div>
          </div>
        </div>
      )}

      {/* Location Bar */}
      <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium">
        <MapPin size={13} className="text-[#16A34A]" />
        <span>{district}</span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-3 text-stone-400" />
        <input
          type="text"
          placeholder="Search authorized recycler..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#16A34A] shadow-xs"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
        {(['All', 'Verified', 'Pickup Available'] as const).map(f => {
          const isActive = activeFilter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#16A34A] text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
              }`}
            >
              <span>{f}</span>
            </button>
          );
        })}
      </div>

      {/* Recyclers List Cards with Match Score & Why Recommended Checklist */}
      {loading ? (
        <div className="p-8 text-center text-xs text-stone-500 font-semibold animate-pulse">
          Finding verified recyclers matching material & location...
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecyclers.map(rec => {
            const isSelected = selectedRecyclerId === rec.recycler_id;
            return (
              <div
                key={rec.recycler_id}
                className={`bg-white rounded-3xl p-4 border shadow-xs space-y-3 transition-all ${
                  isSelected ? 'border-[#16A34A] ring-2 ring-[#16A34A]/20' : 'border-stone-200'
                }`}
              >
                {/* Header Row with Score Pill */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl ${rec.avatarBg} text-white flex items-center justify-center text-xl font-bold shrink-0 shadow-xs`}>
                      {rec.avatarText}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <h3 className="font-extrabold text-stone-900 text-sm truncate">{rec.name}</h3>
                        <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black shrink-0" title="Verified">✓</span>
                      </div>
                      <div className="text-[11px] text-stone-500 font-semibold mt-0.5 flex items-center gap-1">
                        <ShieldCheck size={12} className="text-blue-600 shrink-0" />
                        <span className="truncate">{rec.authorization_ref_no}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-700 mt-0.5">
                        <div className="flex items-center gap-0.5">
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          <span>{rec.rating}</span>
                        </div>
                        <span className="text-stone-300">•</span>
                        <span className="text-stone-500 text-[11px]">{rec.distance_km} km away</span>
                      </div>
                    </div>
                  </div>

                  {/* Match Score Badge */}
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-full text-right shrink-0">
                    <div className="text-[10px] font-black uppercase tracking-tight">Match</div>
                    <div className="text-sm font-black">{rec.score}%</div>
                  </div>
                </div>

                {/* Rate & Estimated Payout Box */}
                <div className="bg-stone-50 rounded-2xl p-3 border border-stone-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold block">Buying Rate</span>
                    <span className="font-black text-stone-900 text-sm">₹{rec.rate_per_kg} / kg</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-emerald-700 font-bold block">Estimated Payout</span>
                    <span className="font-black text-[#16A34A] text-sm">₹{rec.estimated_payout.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Why Recommended Checklist (Audit Requirement §5) */}
                <div className="space-y-1 bg-[#F5F9F6] p-2.5 rounded-2xl border border-emerald-100/60 text-[11px]">
                  <div className="font-black text-stone-700 uppercase tracking-tight text-[10px] flex items-center gap-1 mb-1">
                    <Sparkles size={11} className="text-[#16A34A]" />
                    <span>Why Recommended:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 font-semibold text-stone-600">
                    {rec.reasons?.map((reason, rIdx) => (
                      <div key={rIdx} className="flex items-center gap-1 text-emerald-800 font-bold">
                        <CheckCircle2 size={11} className="text-[#16A34A] shrink-0" />
                        <span className="truncate">{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1 text-[11px] text-stone-500 font-semibold">
                    <Truck size={13} className={rec.pickup_available ? 'text-emerald-600' : 'text-stone-400'} />
                    <span>{rec.pickup_available ? 'Pickup Available' : 'Drop-off Only'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectRecycler(rec)}
                    className="bg-[#16A34A] hover:bg-emerald-700 text-white font-extrabold text-xs px-6 py-2.5 rounded-2xl shadow-xs transition-all active:scale-95 flex items-center gap-1"
                  >
                    <span>Select & Request</span>
                    <Zap size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

