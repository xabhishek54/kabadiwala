import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { db, type LocalMaterial, type LocalTransaction } from '../../data/local/db';
import { getHandoverToken, confirmHandover } from '../../data/remote/apiClient';
import { CheckCircle, ArrowLeft, ShieldCheck } from 'lucide-react';

export const HandoverPage: React.FC = () => {
  const { lotId } = useParams<{ lotId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [material, setMaterial] = useState<LocalMaterial | null>(null);
  const [transaction, setTransaction] = useState<LocalTransaction | null>(null);
  const [qrToken, setQrToken] = useState<string>('');
  const [shortCode, setShortCode] = useState<string>('482910');
  const [mode, setMode] = useState<'collector' | 'recycler'>('collector');
  const [inputShortCode, setInputShortCode] = useState<string>('');
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      if (!lotId) return;
      const mat = await db.materials.get(lotId);
      const tx = await db.transactions.get(lotId);
      if (mat) setMaterial(mat);
      if (tx) {
        setTransaction(tx);
        if (tx.status === 'confirmed' || tx.status === 'paid' || tx.status === 'closed') {
          setIsConfirmed(true);
        }
      }

      const tokenData = await getHandoverToken(lotId);
      setQrToken(tokenData.handover_token);
      setShortCode(tokenData.short_code);
    }
    loadData();
  }, [lotId]);

  const handleConfirmHandover = async () => {
    if (!lotId) return;

    await confirmHandover(lotId, transaction?.recycler_id || 'rec-001', shortCode);

    // Update local IndexedDB transaction status
    await db.transactions.update(lotId, {
      status: 'confirmed',
      payment_status: 'paid',
      updated_at: new Date().toISOString(),
    });

    // Queue in sync outbox
    await db.syncOutbox.add({
      client_uuid: lotId,
      entity_type: 'transaction',
      action: 'upsert',
      payload: { status: 'confirmed', payment_status: 'paid' },
      created_at: new Date().toISOString(),
      synced: false,
    });

    setIsConfirmed(true);
  };

  if (!material) {
    return (
      <div className="p-8 text-center text-stone-500 font-medium">
        सामान की जानकारी लोड हो रही है... (Loading lot details...)
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between bg-surface-card p-3 rounded-card border border-surface-border shadow-soft">
        <button type="button" onClick={() => navigate('/ledger')} className="text-stone-500 tap-target">
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-bold text-stone-900 text-base">डिजिटल हैंडओवर (Digital Handover)</h2>
        <div className="w-8" />
      </div>

      {/* Mode Switcher Toggle */}
      <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200">
        <button
          type="button"
          onClick={() => setMode('collector')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
            mode === 'collector' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
          }`}
        >
          कलेक्टर मोड (क्यूआर कोड दिखाएं)
        </button>
        <button
          type="button"
          onClick={() => setMode('recycler')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
            mode === 'recycler' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
          }`}
        >
          रीसायकलर मोड (पुष्टि करें)
        </button>
      </div>

      {/* Confirmed State */}
      {isConfirmed ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-card p-6 text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
            <CheckCircle size={36} />
          </div>
          <h3 className="text-xl font-black text-emerald-900">हैंडओवर संपन्न! (Handover Confirmed)</h3>
          <p className="text-xs text-emerald-700 font-medium">
            डिजिटल रसीद सुरक्षित की गई है। रीसायकलर द्वारा भुगतान की पुष्टि हुई।
          </p>

          <div className="bg-white rounded-xl p-3.5 border border-emerald-200 text-left text-xs text-stone-700 space-y-1">
            <div><span className="font-bold">Lot Ref:</span> {lotId?.slice(0, 8)}</div>
            <div><span className="font-bold">सामग्री:</span> {t(`categories.${material.material_category}`)}</div>
            <div><span className="font-bold">वजन:</span> {material.approx_weight_kg} kg</div>
            <div><span className="font-bold">कुल भुगतान:</span> ₹{transaction?.quoted_price || material.estimated_value}</div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/ledger')}
            className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl shadow-md"
          >
            कमाई खाते में देखें
          </button>
        </div>
      ) : mode === 'collector' ? (
        /* Collector QR Mode */
        <div className="bg-surface-card rounded-card p-6 border border-surface-border shadow-soft text-center space-y-4">
          <div className="space-y-1">
            <h3 className="font-bold text-stone-900 text-base">रीसायकलर को यह QR कोड दिखाएं</h3>
            <p className="text-xs text-stone-500">Scan QR Code at physical handover</p>
          </div>

          {/* QR Code SVG */}
          <div className="p-4 bg-white rounded-2xl border-2 border-stone-200 inline-block shadow-sm">
            <QRCodeSVG value={qrToken || lotId || 'KC-TOKEN'} size={200} />
          </div>

          {/* Short Code Fallback */}
          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">शॉर्ट कोड (6-Digit Code)</span>
            <span className="text-2xl font-black text-stone-900 tracking-widest">{shortCode}</span>
          </div>

          <div className="flex items-center justify-center space-x-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 py-2 rounded-xl">
            <ShieldCheck size={16} />
            <span>टैम्पर-प्रूफ डिजिटल रसीद (Verifiable Traceable Event)</span>
          </div>
        </div>
      ) : (
        /* Recycler Confirmation Mode */
        <div className="bg-surface-card rounded-card p-6 border border-surface-border shadow-soft space-y-4">
          <div className="text-center space-y-1">
            <h3 className="font-bold text-stone-900 text-base">हैंडओवर की पुष्टि करें</h3>
            <p className="text-xs text-stone-500">Enter 6-digit short code or confirm receipt</p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-700">कलेक्टर का शॉर्ट कोड डालें</label>
            <input
              type="text"
              maxLength={6}
              placeholder="482910"
              value={inputShortCode}
              onChange={(e) => setInputShortCode(e.target.value)}
              className="w-full text-center text-2xl font-black tracking-widest p-3 rounded-xl border border-stone-300 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <button
            type="button"
            onClick={handleConfirmHandover}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md active:scale-95 transition-all"
          >
            हैंडओवर प्राप्त और भुगता की पुष्टि करें
          </button>
        </div>
      )}
    </div>
  );
};
