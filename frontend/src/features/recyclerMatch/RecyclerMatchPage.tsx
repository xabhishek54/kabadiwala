import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db, type LocalMaterial } from '../../data/local/db';
import { fetchRecyclerMatches } from '../../data/remote/apiClient';
import { flushSyncOutbox } from '../../data/local/syncOutbox';
import { ShieldCheck, Phone, MapPin, Truck, ArrowRight, ArrowLeft } from 'lucide-react';

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
  const { lotId } = useParams<{ lotId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [material, setMaterial] = useState<LocalMaterial | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedRecyclerId, setSelectedRecyclerId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setMatchError(null);
      try {
        if (!lotId) return;
        const mat = await db.materials.get(lotId);
        if (mat) {
          setMaterial(mat);
          const { lat, lng } = await getCurrentCoordinates();
          const matchResults = await fetchRecyclerMatches(mat.material_category, lat, lng);
          const verifiedMatches = matchResults.filter(
            (item: any) => item.recycler?.authorization_status === 'verified'
          );
          setMatches(verifiedMatches);

          const recyclerObjs = verifiedMatches.map((item: any) => item.recycler);
          if (recyclerObjs.length > 0) {
            await db.recyclers.bulkPut(recyclerObjs);
          }
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
    }
    loadData();
  }, [lotId, isEn]);

  const handleSelectRecycler = async (recyclerId: string) => {
    if (!lotId) return;
    setSelectedRecyclerId(recyclerId);
    setIsSelecting(true);
    setSelectionError(null);
    try {
      const now = new Date().toISOString();
      await db.transaction('rw', db.transactions, db.syncOutbox, async () => {
        await db.transactions.update(lotId, {
          recycler_id: recyclerId,
          status: 'matched',
          updated_at: now,
        });
        await db.syncOutbox.add({
          client_uuid: lotId,
          entity_type: 'transaction',
          action: 'upsert',
          payload: { lot_id: lotId, recycler_id: recyclerId, status: 'matched' },
          created_at: now,
          synced: false,
        });
      });

      if (navigator.onLine) {
        const result = await flushSyncOutbox();
        if (!result.success) {
          throw new Error('Could not sync this lot with the server. Check your connection and try again.');
        }
      }
      navigate(`/handover/${lotId}`);
    } catch (error) {
      console.error('Unable to select recycler:', error);
      setSelectionError(
        error instanceof Error
          ? error.message
          : (isEn ? 'Could not select this recycler. Please try again.' : 'रीसायकलर नहीं चुना जा सका। फिर कोशिश करें।')
      );
      setSelectedRecyclerId(null);
    } finally {
      setIsSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-stone-500 font-medium">
        {isEn ? 'Finding verified recyclers near you...' : 'उपयुक्त रीसायकलर खोजे जा रहे हैं... (Finding verified recyclers...)'}
      </div>
    );
  }

  if (!material) {
    return (
      <div className="p-8 text-center text-stone-500 font-medium">
        {isEn ? 'Lot details not found' : 'सामान नहीं मिला (Lot not found)'}
      </div>
    );
  }

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
    <div className="pb-24 pt-4 px-4 max-w-md sm:max-w-2xl md:max-w-3xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-surface-card p-3 rounded-card border border-surface-border shadow-soft">
        <button type="button" onClick={() => navigate(-1)} className="text-stone-500 tap-target">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h2 className="font-bold text-stone-900 text-base">
            {isEn ? 'Select Recycler / Buyer' : 'रीसायकलर चयन (Recycler Match)'}
          </h2>
          <p className="text-xs text-stone-500">{t(`categories.${material.material_category}`)} • {material.approx_weight_kg}kg</p>
        </div>
        <div className="w-8" />
      </div>

      {/* Recycler Matches List */}
      <div className="space-y-3">
        <h3 className="font-bold text-stone-900 text-sm">
          {isEn ? 'Top Authorized Buyers & Rates' : 'निकटतम सत्यापित रीसायकलर (Top Authorized Buyers)'}
        </h3>

        {matchError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
            <p>{matchError}</p>
            {navigator.onLine && (
              <button type="button" onClick={retryMatching} className="mt-3 rounded-lg bg-amber-900 px-4 py-2 font-bold text-white">
                {isEn ? 'Try again' : 'फिर कोशिश करें'}
              </button>
            )}
          </div>
        )}

        {selectionError && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
            {selectionError}
          </p>
        )}

        {!matchError && matches.length === 0 && (
          <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
            {isEn ? 'No verified recycler currently accepts this material nearby.' : 'आस-पास कोई सत्यापित रीसायकलर यह सामग्री नहीं ले रहा है।'}
          </p>
        )}

        {matches.map((item) => {
          const rec = item.recycler;
          const isSelected = selectedRecyclerId === rec.recycler_id;
          // Real blended score calculated by ML matching engine (70% deterministic + 30% Logistic Regression completion model)
          const matchScore = Math.round((item.score || 0) * 100);

          return (
            <div
              key={rec.recycler_id}
              className={`bg-surface-card rounded-card p-4 border shadow-soft space-y-3 transition-all ${
                isSelected ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/30' : 'border-surface-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-1.5 mb-1">
                    <span className="font-bold text-stone-900 text-base">{rec.name}</span>
                    <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      {matchScore}% MATCH
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-stone-500 font-medium">
                    <span className="flex items-center"><MapPin size={12} className="mr-0.5" /> {item.distance_km} km {isEn ? 'away' : 'दूर'}</span>
                    <span className="flex items-center">
                      <Truck size={12} className="mr-0.5" />
                      {item.pickup_available
                        ? (isEn ? 'Pickup Available' : 'पिकअप उपलब्ध')
                        : (isEn ? 'Self Drop' : 'खुद पहुंचाएं')}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-brand-600">₹{item.rate_for_category}</div>
                  <span className="text-[10px] font-semibold text-stone-500">{isEn ? '/kg' : '/किग्रा'}</span>
                </div>
              </div>

              {/* Why Recommended Checklist (Audit Spec §5) */}
              <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-2.5 space-y-1 text-xs text-stone-700">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                  {isEn ? 'Why Recommended' : 'सिफारिश का कारण (Why Recommended)'}
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] font-medium">
                  <div className="flex items-center text-emerald-700">
                    <span className="mr-1">✓</span> {isEn ? `Nearby (${item.distance_km} km)` : `निकट (Distance ${item.distance_km} km)`}
                  </div>
                  <div className="flex items-center text-emerald-700">
                    <span className="mr-1">✓</span> {isEn ? `Offer ₹${item.rate_for_category}/kg` : `प्रस्तावित दर ₹${item.rate_for_category}/किग्रा`}
                  </div>
                  <div className="flex items-center text-emerald-700">
                    <span className="mr-1">✓</span> {isEn ? 'Authorization verified' : 'प्राधिकरण सत्यापित'}
                  </div>
                  <div className="flex items-center text-emerald-700">
                    <span className="mr-1">✓</span> {isEn ? 'Accepts material lot' : 'स्वीकृत सामग्री'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 pt-2 border-t border-stone-100">
                <a
                  href={`tel:${rec.contact_phone}`}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center space-x-1 transition-colors"
                >
                  <Phone size={14} />
                  <span>{isEn ? 'Call Buyer' : 'कॉल करें'}</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleSelectRecycler(rec.recycler_id)}
                  disabled={isSelecting}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center space-x-1 shadow-sm active:scale-95 transition-all"
                >
                  <span>{isSelecting ? (isEn ? 'Saving…' : 'सहेजा जा रहा है…') : (isEn ? 'Select & Handover' : 'चुनें और हैंडओवर करें')}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
