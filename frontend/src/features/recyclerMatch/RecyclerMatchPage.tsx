import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db, type LocalMaterial } from '../../data/local/db';
import { fetchRecyclerMatches } from '../../data/remote/apiClient';
import { ShieldCheck, Phone, MapPin, Truck, ArrowRight, ArrowLeft } from 'lucide-react';

export const RecyclerMatchPage: React.FC = () => {
  const { lotId } = useParams<{ lotId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [material, setMaterial] = useState<LocalMaterial | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecyclerId, setSelectedRecyclerId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!lotId) return;
      const mat = await db.materials.get(lotId);
      if (mat) {
        setMaterial(mat);
        const matchResults = await fetchRecyclerMatches(mat.material_category);
        setMatches(matchResults);
      }
      setLoading(false);
    }
    loadData();
  }, [lotId]);

  const handleSelectRecycler = async (recyclerId: string) => {
    if (!lotId) return;
    setSelectedRecyclerId(recyclerId);

    // Update local transaction status to matched
    await db.transactions.update(lotId, {
      recycler_id: recyclerId,
      status: 'matched',
      updated_at: new Date().toISOString(),
    });

    // Queue status change in outbox
    await db.syncOutbox.add({
      client_uuid: lotId,
      entity_type: 'transaction',
      action: 'upsert',
      payload: { recycler_id: recyclerId, status: 'matched' },
      created_at: new Date().toISOString(),
      synced: false,
    });

    navigate(`/handover/${lotId}`);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-stone-500 font-medium">
        उपयुक्त रीसायकलर खोजे जा रहे हैं... (Finding verified recyclers...)
      </div>
    );
  }

  if (!material) {
    return (
      <div className="p-8 text-center text-stone-500 font-medium">
        सामान नहीं मिला (Lot not found)
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-surface-card p-3 rounded-card border border-surface-border shadow-soft">
        <button type="button" onClick={() => navigate(-1)} className="text-stone-500 tap-target">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h2 className="font-bold text-stone-900 text-base">रीसायकलर चयन (Recycler Match)</h2>
          <p className="text-xs text-stone-500">{t(`categories.${material.material_category}`)} • {material.approx_weight_kg}kg</p>
        </div>
        <div className="w-8" />
      </div>

      {/* Recycler Matches List */}
      <div className="space-y-3">
        <h3 className="font-bold text-stone-900 text-sm">निकटतम सत्यापित रीसायकलर (Top Authorized Buyers)</h3>

        {matches.map((item) => {
          const rec = item.recycler;
          const isSelected = selectedRecyclerId === rec.recycler_id;

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
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-stone-500 font-medium">
                    <span className="flex items-center"><MapPin size={12} className="mr-0.5" /> {item.distance_km} km दूर</span>
                    <span className="flex items-center"><Truck size={12} className="mr-0.5" /> {item.pickup_available ? 'पिकअप उपलब्ध' : 'खुद पहुंचाएं'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-brand-600">₹{item.rate_for_category}</div>
                  <span className="text-[10px] font-semibold text-stone-500">/किग्रा</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 pt-2 border-t border-stone-100">
                <a
                  href={`tel:${rec.contact_phone}`}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center space-x-1 transition-colors"
                >
                  <Phone size={14} />
                  <span>कॉल करें</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleSelectRecycler(rec.recycler_id)}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center space-x-1 shadow-sm active:scale-95 transition-all"
                >
                  <span>चुनें और हैंडओवर करें</span>
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
