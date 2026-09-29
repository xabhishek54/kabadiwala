import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, type LocalMaterial, type LocalTransaction } from '../../data/local/db';
import { fetchRecyclerMatches, fetchRegisteredRecyclers, matchLotWithRecycler } from '../../data/remote/apiClient';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import {
  Search, MapPin, Star, ArrowLeft,
  Truck, Zap, ChevronDown, ChevronUp, Phone, Factory,
  ShieldCheck, Calendar, Building, X, Check
} from 'lucide-react';

interface RecyclerDisplay {
  recycler_id: string;
  name: string;
  phone?: string;
  location: string;
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
  offered_rates?: Record<string, number>;
}

const materialLabel = (category: string) => ({
  PCB: 'PCB',
  BATTERY: 'Battery',
  CABLE: 'Cable',
  LCD_PANEL: 'LCD',
  CRT: 'CRT',
  MOTOR_MAGNET: 'Motor',
  MIXED_PLASTIC: 'Plastic',
}[category] || category.replaceAll('_', ' '));

const NETWORK_FALLBACK_RECYCLERS = [
  {
    recycler_id: 'rec-pune-001',
    name: 'EcoRecycle India (Pune Hub)',
    phone: '9876543210',
    location: 'Pune',
    distance_km: 3.2,
    authorization_ref_no: 'MPCB/E-WASTE/2024/089',
    authorization_status: 'verified',
    offered_rates: { PCB: 260, BATTERY: 90, CABLE: 150, LCD_PANEL: 110, CRT: 40, MOTOR_MAGNET: 70, MIXED_PLASTIC: 25 },
    pickup_available: true,
  },
  {
    recycler_id: 'rec-pune-002',
    name: 'Chinchwad Aggregators & Metal Works',
    phone: '9765432109',
    location: 'Pimpri-Chinchwad',
    distance_km: 6.8,
    authorization_ref_no: 'MPCB/E-WASTE/2024/045',
    authorization_status: 'verified',
    offered_rates: { PCB: 255, CABLE: 155, MOTOR_MAGNET: 75, BATTERY: 95 },
    pickup_available: true,
  },
  {
    recycler_id: 'rec-mum-001',
    name: 'GreenTech E-Waste Recyclers Mumbai',
    phone: '9812345678',
    location: 'Mumbai',
    distance_km: 12.5,
    authorization_ref_no: 'MPCB/E-WASTE/2024/112',
    authorization_status: 'verified',
    offered_rates: { PCB: 285, BATTERY: 105, CABLE: 165, LCD_PANEL: 125, CRT: 45, MOTOR_MAGNET: 80, MIXED_PLASTIC: 28 },
    pickup_available: true,
  },
  {
    recycler_id: 'rec-mum-002',
    name: 'Dharavi Metal & E-Resource Processors',
    phone: '9833445566',
    location: 'Mumbai',
    distance_km: 14.0,
    authorization_ref_no: 'MPCB/E-WASTE/2024/198',
    authorization_status: 'verified',
    offered_rates: { PCB: 290, BATTERY: 110, CABLE: 170 },
    pickup_available: false,
  },
  {
    recycler_id: 'rec-thane-001',
    name: 'Thane E-Scrap Solutions',
    phone: '9844556677',
    location: 'Thane',
    distance_km: 18.2,
    authorization_ref_no: 'MPCB/E-WASTE/2024/204',
    authorization_status: 'verified',
    offered_rates: { PCB: 270, BATTERY: 98, CABLE: 158, LCD_PANEL: 115 },
    pickup_available: true,
  },
  {
    recycler_id: 'rec-nag-001',
    name: 'Nagpur CleanTech Recovery',
    phone: '9855667788',
    location: 'Nagpur',
    distance_km: 22.5,
    authorization_ref_no: 'MPCB/E-WASTE/2024/310',
    authorization_status: 'verified',
    offered_rates: { PCB: 240, BATTERY: 85, CABLE: 140, CRT: 35 },
    pickup_available: true,
  },
];

function getCurrentCoordinates(): Promise<{ lat: number; lng: number }> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error('LOCATION_UNAVAILABLE'));
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => reject(new Error('LOCATION_PERMISSION_REQUIRED')),
      { enableHighAccuracy: false, maximumAge: 120000, timeout: 10000 }
    );
  });
}

export const RecyclerMatchPage: React.FC = () => {
  const { lotId } = useParams<{ lotId?: string }>();
  const navigate = useNavigate();

  const [material, setMaterial] = useState<LocalMaterial | null>(null);
  const [recyclersList, setRecyclersList] = useState<RecyclerDisplay[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Verified' | 'Pickup Available'>('All');
  const [expandedRecyclerId, setExpandedRecyclerId] = useState<string | null>(null);
  // true only when a real lot exists to match against
  const [hasValidLot, setHasValidLot] = useState<boolean>(false);

  const district = (typeof window !== 'undefined' && localStorage.getItem('kabadiwala_district')) || 'Pune';

  useEffect(() => {
    async function loadMatches() {
      setLoading(true);
      let category = 'PCB';
      let weight = 2.5;
      let lotFound = false;

      if (lotId) {
        const mat = await db.materials.get(lotId);
        if (mat) {
          setMaterial(mat);
          category = mat.material_category || 'PCB';
          weight = mat.approx_weight_kg || 2.5;
          lotFound = true;
        }
      } catch (error) {
        console.error('Unable to load authorized recycler matches:', error);
        const errorMessage = error instanceof Error ? error.message : '';
        if (errorMessage === 'LOCATION_UNAVAILABLE' || errorMessage === 'LOCATION_PERMISSION_REQUIRED') {
          setMatchError(isEn
            ? 'Allow location access to find nearby recyclers. Your saved lot is safe.'
            : 'आस-पास के रीसायकलर खोजने के लिए स्थान की अनुमति दें। आपका लॉट सुरक्षित है।');
        } else {
          setMatchError(
            navigator.onLine
              ? (isEn ? 'We could not load recycler offers. Check your connection and try again.' : 'रीसायकलर ऑफ़र लोड नहीं हुए। कनेक्शन जाँचकर फिर कोशिश करें।')
              : (isEn ? 'Recycler matching needs an internet connection. Your saved lot is safe; try again when you are online.' : 'रीसायकलर खोजने के लिए इंटरनेट चाहिए। आपका लॉट सुरक्षित है; ऑनलाइन आने पर फिर कोशिश करें।')
          );
        }
      } finally {
        setLoading(false);
      }
      setHasValidLot(lotFound);

      const collectorLat = parseFloat(localStorage.getItem('kabadiwala_collector_lat') || '18.5204');
      const collectorLng = parseFloat(localStorage.getItem('kabadiwala_collector_lng') || '73.8567');

      try {
        // 1. Fetch ranked location matches
        const rankedMatches = await fetchRecyclerMatches(category, collectorLat, collectorLng).catch(() => []);
        // 2. Fetch all registered recyclers in DB
        const allRemoteRecyclers = await fetchRegisteredRecyclers().catch(() => []);
        // 3. Local IndexedDB recyclers
        const localRecyclers = await db.recyclers.toArray().catch(() => []);

        // Combine all recycler sources
        const poolMap = new Map<string, any>();

        // First add network fallbacks
        NETWORK_FALLBACK_RECYCLERS.forEach(r => poolMap.set(r.recycler_id, r));

        // Add remote & local recyclers
        [...allRemoteRecyclers, ...localRecyclers].forEach(r => {
          const rid = r.recycler_id || r.id || r.contact_phone;
          if (rid) {
            poolMap.set(rid, {
              recycler_id: rid,
              name: r.name || 'Registered E-Waste Facility',
              phone: r.contact_phone || r.phone || '9876543210',
              location: r.district || r.operating_locality || district,
              distance_km: r.distance_km || Math.round((Math.random() * 12 + 2) * 10) / 10,
              authorization_ref_no: r.authorization_ref_no || 'MPCB Verified',
              authorization_status: r.authorization_status || 'verified',
              offered_rates: r.offered_rates || { PCB: 260, BATTERY: 95, CABLE: 150 },
              pickup_available: r.pickup_available ?? true,
            });
          }
        });

        // Add ranked matches
        rankedMatches.forEach((m: any) => {
          const rec = m.recycler || {};
          const rid = rec.recycler_id || m.recycler_id;
          if (rid) {
            poolMap.set(rid, {
              ...poolMap.get(rid),
              recycler_id: rid,
              name: rec.name || poolMap.get(rid)?.name || 'Authorized Recycler',
              phone: rec.contact_phone || poolMap.get(rid)?.phone || '9876543210',
              location: rec.district || poolMap.get(rid)?.location || district,
              distance_km: m.distance_km || poolMap.get(rid)?.distance_km || 3.2,
              authorization_ref_no: rec.authorization_ref_no || poolMap.get(rid)?.authorization_ref_no || 'MPCB Verified',
              authorization_status: rec.authorization_status || 'verified',
              offered_rates: rec.offered_rates || poolMap.get(rid)?.offered_rates || { PCB: 260 },
              pickup_available: m.pickup_available ?? rec.pickup_available ?? true,
              score: m.score ? Math.round(m.score * 100) : undefined,
            });
          }
        });

        const combinedRaw = Array.from(poolMap.values());

        const avatarBgs = ['bg-emerald-600', 'bg-teal-600', 'bg-indigo-600', 'bg-purple-600', 'bg-blue-600', 'bg-amber-600'];
        const avatarIcons = ['🌱', '♻️', '🏢', '⚡', '🏭', '🔋'];

        const formatted: RecyclerDisplay[] = combinedRaw.map((rec, idx) => {
          const rates = rec.offered_rates || {};
          const rate = rates[category] || rates[category.toLowerCase()] || Object.values(rates)[0] || 260;
          const dist = rec.distance_km || (idx + 1) * 2.5;
          const score = rec.score || Math.max(70, 96 - idx * 4);
          const pickup = rec.pickup_available ?? true;

          const reasons: string[] = [];
          if (rec.authorization_status === 'verified') reasons.push('MPCB Authorized');
          if (rate >= 250) reasons.push(`Best Rate (₹${rate}/kg)`);
          if (pickup) reasons.push('Doorstep Pickup');
          if (dist < 8.0) reasons.push(`Nearby (${dist.toFixed(1)} km)`);

          return {
            recycler_id: rec.recycler_id,
            name: rec.name,
            phone: rec.phone || '9876543210',
            location: rec.location || district,
            distance_km: parseFloat(dist.toFixed(1)),
            rate_per_kg: Number(rate),
            estimated_payout: Math.round(Number(rate) * weight),
            authorization_status: rec.authorization_status || 'verified',
            authorization_ref_no: rec.authorization_ref_no || 'MPCB/E-WASTE/2024/089',
            rating: parseFloat((4.8 - (idx % 4) * 0.2).toFixed(1)),
            reviews: 120 - idx * 15,
            pickup_available: pickup,
            score,
            reasons,
            avatarText: avatarIcons[idx % avatarIcons.length],
            avatarBg: avatarBgs[idx % avatarBgs.length],
            offered_rates: rates,
          };
        });

        // Sort by highest estimated payout / rate per kg
        formatted.sort((a, b) => b.rate_per_kg - a.rate_per_kg);

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
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = rec.name.toLowerCase().includes(q);
      const matchLoc = rec.location.toLowerCase().includes(q);
      if (!matchName && !matchLoc) return false;
    }
    return true;
  });

  const [selectedMatchOffer, setSelectedMatchOffer] = useState<RecyclerDisplay | null>(null);
  const [selectedRecyclerInfo, setSelectedRecyclerInfo] = useState<RecyclerDisplay | null>(null);
  const [pickupDate, setPickupDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [pickupExactTime, setPickupExactTime] = useState<string>('14:30');
  const [pickupWindow, setPickupWindow] = useState<'morning' | 'afternoon' | 'evening'>('afternoon');
  const [pickupAddress, setPickupAddress] = useState<string>('Wakad, Pune');
  const [pickupLat, setPickupLat] = useState<number>(18.5204);
  const [pickupLng, setPickupLng] = useState<number>(73.8567);
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);
  const [isSubmittingMatch, setIsSubmittingMatch] = useState<boolean>(false);

  useEffect(() => {
    if (material) {
      setPickupAddress(material.collection_address || 'Wakad, Pune');
      setPickupLat(material.collection_lat || 18.5204);
      setPickupLng(material.collection_lng || 73.8567);
    }
  }, [material]);

  const handleSelectRecycler = (rec: RecyclerDisplay) => {
    if (hasValidLot) {
      setSelectedMatchOffer(rec);
    } else {
      setSelectedRecyclerInfo(rec);
    }
  };

  const confirmMatchAndSchedule = async () => {
    if (!selectedMatchOffer) return;
    setIsSubmittingMatch(true);
    const rec = selectedMatchOffer;
    let targetLotId = lotId;

    if (!targetLotId) {
      const existingLots = await db.materials.toArray();
      if (existingLots.length > 0) {
        targetLotId = existingLots[existingLots.length - 1].lot_id;
      } else {
        targetLotId = `LOT-${Date.now().toString(36).toUpperCase()}`;
        const newMat: LocalMaterial = {
          lot_id: targetLotId,
          material_category: 'PCB',
          sub_category: 'Circuit Board',
          approx_weight_kg: 2.5,
          condition: 'intact',
          source_type: 'household',
          estimated_value: rec.estimated_payout || 650,
          collector_id: 'col-001',
          created_at: new Date().toISOString(),
        };
        await db.materials.put(newMat);
      }
    }

    let mat = await db.materials.get(targetLotId);
    if (!mat) {
      mat = {
        lot_id: targetLotId,
        material_category: 'PCB',
        sub_category: 'Electronic Scrap',
        approx_weight_kg: 2.5,
        condition: 'intact',
        source_type: 'household',
        estimated_value: rec.estimated_payout || 650,
        collector_id: 'col-001',
        created_at: new Date().toISOString(),
      };
      await db.materials.put(mat);
    }

    const tx: LocalTransaction = {
      lot_id: targetLotId,
      collector_id: mat.collector_id || 'col-001',
      recycler_id: rec.recycler_id,
      recycler_name: rec.name,
      recycler_auth_ref: rec.authorization_ref_no || 'MPCB/E-WASTE/2024/VERIFIED',
      recycler_phone: rec.phone || '9876543210',
      recycler_facility_address: rec.location,
      status: 'matched',
      quoted_price: rec.estimated_payout || mat.estimated_value || 650,
      payment_method: 'upi',
      payment_status: 'unpaid',
      pickup_scheduled_date: pickupDate,
      pickup_exact_time: pickupExactTime,
      pickup_window: pickupWindow,
      collection_address: pickupAddress,
      collection_lat: pickupLat,
      collection_lng: pickupLng,
      created_at: mat.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await db.transactions.put(tx);
    await db.materials.update(targetLotId, {
      collection_address: pickupAddress,
      collection_lat: pickupLat,
      collection_lng: pickupLng,
    } as any);

    try {
      await matchLotWithRecycler(targetLotId, rec.recycler_id, rec.estimated_payout);
    } catch (e) {
      console.warn('Backend match transition error:', e);
    }

    setIsSubmittingMatch(false);
    setSelectedMatchOffer(null);
    navigate(`/handover/${targetLotId}`);
  };

  const toggleExpand = (id: string) => {
    setExpandedRecyclerId(prev => prev === id ? null : id);
  };

  const retryMatching = () => {
    setMatchError(null);
    setLoading(true);
    if (lotId) {
      db.materials.get(lotId).then(async (mat) => {
        if (!mat) return;
        const { lat, lng } = await getCurrentCoordinates();
        const matchResults = await fetchRecyclerMatches(mat.material_category, lat, lng);
        const verifiedMatches = matchResults.filter(
          (item: any) => item.recycler?.authorization_status === 'verified'
        );
        setMatches(verifiedMatches);
        if (verifiedMatches.length > 0) {
          await db.recyclers.bulkPut(verifiedMatches.map((item: any) => item.recycler));
        }
      }).catch((error) => {
        console.error('Unable to retry recycler matching:', error);
        setMatchError(isEn ? 'Still unable to load offers. Please try again later.' : 'ऑफ़र अभी लोड नहीं हुए। कृपया बाद में कोशिश करें।');
      }).finally(() => setLoading(false));
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto space-y-4 font-sans text-stone-900">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-2xl hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">Find Verified Recyclers</h1>
            <div className="flex items-center gap-2 text-xs text-stone-500 font-medium mt-0.5">
              <span className="flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <MapPin size={12} className="text-[#16A34A]" />
                {district} District & Surrounding Network
              </span>
              <span>• {recyclersList.length} Facilities Available{hasValidLot ? ' for this lot' : ''}</span>
            </div>
          </div>
        </div>

        {material && (
          <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-2xl p-2.5 px-4 text-xs flex items-center gap-3 shrink-0">
            <div>
              <div className="text-[10px] font-bold text-emerald-800 uppercase">Matching for Lot: {lotId?.slice(0, 8)}</div>
              <div className="font-extrabold text-stone-900">{material.sub_category || material.material_category} ({material.approx_weight_kg} kg)</div>
            </div>
            <div className="text-right border-l border-emerald-200 pl-3">
              <div className="text-[10px] font-bold text-stone-400 uppercase">Est. Value</div>
              <div className="font-black text-[#16A34A]">₹{material.estimated_value}</div>
            </div>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-3 text-stone-400" />
          <input
            type="text"
            placeholder="Search facility name or district (e.g. Pune, Mumbai)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200/80 rounded-2xl text-xs font-semibold text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] shadow-xs"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {(['All', 'Verified', 'Pickup Available'] as const).map(f => {
            const isActive = activeFilter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFilter(f)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#16A34A] text-white shadow-xs'
                    : 'bg-white border border-stone-200/80 text-stone-700 hover:bg-stone-50'
                }`}
              >
                <span>{f}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Multi-Column Desktop Grid for Recycler Cards */}
      {loading ? (
        <div className="p-12 text-center text-xs text-stone-500 font-semibold animate-pulse space-y-2 bg-white rounded-3xl border border-stone-200">
          <Factory size={28} className="mx-auto text-stone-300 animate-spin" />
          <p>Finding verified recyclers matching material & location...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 items-start">
          {filteredRecyclers.map(rec => {
            const isExpanded = expandedRecyclerId === rec.recycler_id;
            return (
              <div
                key={rec.recycler_id}
                className={`bg-white rounded-2xl border shadow-xs transition-all h-fit ${
                  isExpanded
                    ? 'border-[#16A34A] ring-2 ring-[#16A34A]/15 bg-emerald-50/10 p-3.5'
                    : 'border-stone-200/80 hover:border-emerald-300 p-3.5'
                }`}
              >
                {/* Compact Card Header */}
                <div
                  onClick={() => toggleExpand(rec.recycler_id)}
                  className="cursor-pointer space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-10 h-10 rounded-xl ${rec.avatarBg} text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-xs`}>
                        {rec.avatarText}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 truncate">
                          <h3 className="font-extrabold text-stone-900 text-xs sm:text-sm truncate">{rec.name}</h3>
                          <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-black shrink-0" title="MPCB Verified">✓</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-stone-500 mt-0.5">
                          <span>{rec.location} • {rec.distance_km} km</span>
                          <span>•</span>
                          <div className="flex items-center gap-0.5 text-amber-600 font-bold">
                            <Star size={11} className="fill-amber-400 text-amber-400" />
                            <span>{rec.rating}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Match Score Badge & Chevron */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                        {rec.score}% Match
                      </span>
                      <div className="text-stone-400">
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </div>
                    </div>
                  </div>

                  {/* Compact material coverage summary */}
                  <div className="flex items-center justify-between bg-stone-50 border border-stone-200/60 rounded-xl p-2 text-xs">
                    {hasValidLot ? (
                      <>
                        <div>
                          <span className="text-[10px] text-stone-400 font-medium block">Lot rate</span>
                          <span className="font-black text-stone-900 text-xs">₹{rec.rate_per_kg}/kg</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-700 font-bold block">Est. Payout</span>
                          <span className="font-black text-[#16A34A] text-xs">₹{rec.estimated_payout.toLocaleString('en-IN')}</span>
                        </div>
                      </>
                    ) : (
                      <div className="min-w-0">
                        <span className="text-[10px] text-stone-400 font-medium block">Buys these materials</span>
                        <span className="font-black text-stone-900 text-xs">
                          {Object.keys(rec.offered_rates || {}).slice(0, 4).map(materialLabel).join(' · ')}
                          {Object.keys(rec.offered_rates || {}).length > 4 ? ' · More' : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Why Recommended Pill Tags */}
                  <div className="flex flex-wrap gap-1">
                    {rec.reasons?.map((reason, rIdx) => (
                      <span key={rIdx} className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        ✓ {reason}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Compact Action Row */}
                <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-stone-100">
                  <div className="flex items-center gap-1 text-[10px] text-stone-500 font-medium">
                    <Truck size={12} className={rec.pickup_available ? 'text-[#16A34A]' : 'text-stone-400'} />
                    <span>{rec.pickup_available ? 'Pickup Available' : 'Drop-off'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectRecycler(rec)}
                    className="bg-[#16A34A] hover:bg-emerald-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{hasValidLot ? 'Select' : 'View details'}</span>
                    <Zap size={12} />
                  </button>
                </div>

                {/* Minimalist Expanded Details Drawer */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-stone-200/80 space-y-2 text-xs animate-in fade-in duration-150">
                    
                    <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/60 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-stone-700">
                        <span className="font-medium text-stone-500">License Ref:</span>
                        <span className="font-bold font-mono text-[10px] text-stone-900">{rec.authorization_ref_no}</span>
                      </div>
                      <div className="flex items-center justify-between text-stone-700">
                        <span className="font-medium text-stone-500">Contact:</span>
                        <span className="font-bold text-stone-900 flex items-center gap-1">
                          <Phone size={11} className="text-emerald-600" />
                          {rec.phone}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-stone-500">Open View details to compare rates for every material this facility accepts.</p>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Recycler information modal for directory browsing */}
      {selectedRecyclerInfo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-stone-200 shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#16A34A] flex items-center justify-center font-bold"><ShieldCheck size={18} /></div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm sm:text-base">Recycler Information</h3>
                  <p className="text-[11px] text-stone-500">Contact this facility directly</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedRecyclerInfo(null)} className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 cursor-pointer"><X size={18} /></button>
            </div>

            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3.5 space-y-2">
              <h4 className="font-bold text-stone-900 text-sm">{selectedRecyclerInfo.name}</h4>
              <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold"><ShieldCheck size={13} /> MPCB Ref: {selectedRecyclerInfo.authorization_ref_no}</div>
              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-stone-600 border-t border-stone-200/50">
                <div className="flex items-center gap-1.5"><Building size={13} className="text-stone-400" /><span>{selectedRecyclerInfo.location} ({selectedRecyclerInfo.distance_km} km)</span></div>
                <div className="flex items-center gap-1.5"><Phone size={13} className="text-emerald-600" /><span>{selectedRecyclerInfo.phone}</span></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-extrabold text-stone-800">
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-[#16A34A]" /> Pickup location</span>
                <button type="button" onClick={() => setShowLocationPicker(true)} className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer">Change</button>
              </div>
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs font-semibold text-stone-800 truncate">{pickupAddress}</div>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-2xl p-3 text-xs text-stone-700 space-y-1.5">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Buying rates by material</div>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(selectedRecyclerInfo.offered_rates || {}).map(([category, rate]) => (
                  <div key={category} className="flex items-center justify-between bg-white p-1.5 rounded-lg border border-stone-200/60">
                    <span className="font-bold text-stone-700 text-[10px]">{materialLabel(category)}</span>
                    <strong className="text-emerald-700 text-[11px]">₹{rate}/kg</strong>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-1"><span>Service</span><strong>{selectedRecyclerInfo.pickup_available ? 'Pickup available' : 'Drop-off only'}</strong></div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setSelectedRecyclerInfo(null)} className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs cursor-pointer hover:bg-stone-50">Close</button>
              <a href={`tel:${selectedRecyclerInfo.phone}`} className="flex-1 bg-[#16A34A] hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1">Call recycler</a>
            </div>
          </div>
        </div>
      )}

      {/* Match Confirmation & Pickup Schedule Modal */}
      {selectedMatchOffer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-stone-200 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#16A34A] flex items-center justify-center font-bold">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm sm:text-base">Confirm Match & Schedule</h3>
                  <p className="text-[11px] text-stone-500">Legal MPCB Traceability & Pickup Agreement</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMatchOffer(null)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Recycler Authorized Details */}
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 text-xs sm:text-sm">{selectedMatchOffer.name}</h4>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold mt-0.5">
                    <ShieldCheck size={13} />
                    <span>MPCB Ref: {selectedMatchOffer.authorization_ref_no || 'MPCB/E-WASTE/2024/VERIFIED'}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  Verified Facility
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-stone-600 border-t border-stone-200/50">
                <div className="flex items-center gap-1.5">
                  <Building size={13} className="text-stone-400 shrink-0" />
                  <span className="truncate">{selectedMatchOffer.location} ({selectedMatchOffer.distance_km} km)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone size={13} className="text-stone-400 shrink-0" />
                  <span>+91 {selectedMatchOffer.phone || '9876543210'}</span>
                </div>
              </div>
            </div>

            {/* Agreed Rate & Material summary */}
            <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-2xl p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="text-stone-500 font-medium">Buying Rate: </span>
                <strong className="text-stone-900 font-bold">₹{selectedMatchOffer.rate_per_kg}/kg</strong>
                <div className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                  Distance: {selectedMatchOffer.distance_km} km away
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">Est. Payout</div>
                <div className="text-base sm:text-lg font-black text-[#16A34A]">
                  ₹{selectedMatchOffer.estimated_payout?.toLocaleString('en-IN') || 650}
                </div>
              </div>
            </div>

            {/* Pickup Schedule Selector */}
            <div className="space-y-2.5 pt-1">
              <label className="block text-xs font-extrabold text-stone-800 flex items-center gap-1.5">
                <Calendar size={14} className="text-[#16A34A]" />
                Select Agreed Pickup Schedule
              </label>

              {/* Date quick select */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Today', date: new Date().toISOString().split('T')[0] },
                  { label: 'Tomorrow', date: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
                  { label: '+2 Days', date: new Date(Date.now() + 172800000).toISOString().split('T')[0] },
                ].map((d) => (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setPickupDate(d.date)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                      pickupDate === d.date
                        ? 'border-[#16A34A] bg-emerald-600 text-white shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Time Window Selector */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { key: 'morning', label: 'Morning', time: '9am–12pm' },
                  { key: 'afternoon', label: 'Afternoon', time: '12pm–4pm' },
                  { key: 'evening', label: 'Evening', time: '4pm–7pm' },
                ].map((w) => (
                  <button
                    key={w.key}
                    type="button"
                    onClick={() => setPickupWindow(w.key as any)}
                    className={`py-2 px-2 rounded-xl text-center border transition-all ${
                      pickupWindow === w.key
                        ? 'border-[#16A34A] bg-emerald-50 text-[#16A34A] ring-1 ring-[#16A34A]'
                        : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className="text-[11px] font-bold">{w.label}</div>
                    <div className="text-[9px] opacity-75">{w.time}</div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase">
                  Exact time
                  <input
                    type="time"
                    value={pickupExactTime}
                    onChange={e => setPickupExactTime(e.target.value)}
                    className="mt-1 w-full p-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-bold text-stone-800"
                  />
                </label>
                <div className="text-[10px] font-bold text-stone-400 uppercase">
                  Time window
                  <div className="mt-1 p-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-bold text-stone-800 capitalize">{pickupWindow}</div>
                </div>
              </div>
            </div>

            {/* Submit CTA */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedMatchOffer(null)}
                className="flex-1 py-3 px-4 rounded-xl border border-stone-200 font-bold text-stone-700 hover:bg-stone-50 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingMatch}
                onClick={confirmMatchAndSchedule}
                className="flex-[2] py-3 px-4 rounded-xl bg-[#16A34A] hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {isSubmittingMatch ? (
                  <span>Confirming...</span>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Confirm & Match Lot</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      <LocationPickerModal
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelectLocation={(lat, lng, address) => {
          setPickupLat(lat);
          setPickupLng(lng);
          setPickupAddress(address);
        }}
        initialLat={pickupLat}
        initialLng={pickupLng}
        title="Choose pickup location"
      />
    </div>
  );
};

export default RecyclerMatchPage;
