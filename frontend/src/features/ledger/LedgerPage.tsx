import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LocalTransaction, type LocalMaterial, type LocalRecycler } from '../../data/local/db';
import { jsPDF } from 'jspdf';
import { Wallet, Clock, Share2, CheckCircle, Package, Download, Check, XCircle, Factory, Phone, MapPin, QrCode, UserCheck } from 'lucide-react';

export const LedgerPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  // Resolve the logged-in user's ID so ledger is scoped per account
  const collectorId: string = (() => {
    try { const u = JSON.parse(localStorage.getItem('kabadiwala_user') || '{}'); return u.id || u.phone || ''; } catch { return ''; }
  })();

  const materials = useLiveQuery(
    () => collectorId ? db.materials.where('collector_id').equals(collectorId).toArray() : Promise.resolve([]),
    [collectorId]
  ) || [];
  const transactions = useLiveQuery(
    () => collectorId ? db.transactions.where('collector_id').equals(collectorId).toArray() : Promise.resolve([]),
    [collectorId]
  ) || [];
  const recyclers = useLiveQuery(() => db.recyclers.toArray(), []) || [];

  const txMap = new Map<string, LocalTransaction>();
  transactions.forEach((tx) => txMap.set(tx.lot_id, tx));

  const recyclerMap = new Map<string, LocalRecycler>();
  recyclers.forEach((r) => recyclerMap.set(r.recycler_id, r));

  let totalEarned = 0;
  let totalPending = 0;

  materials.forEach((mat) => {
    const tx = txMap.get(mat.lot_id);
    const val = tx?.final_sale_value || tx?.quoted_price || mat.estimated_value || 0;
    if (tx?.payment_status === 'paid' || tx?.status === 'closed') {
      totalEarned += val;
    } else {
      totalPending += val;
    }
  });

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Kabadiwala Connect — Verified Income Statement', 14, 20);

    doc.setFontSize(11);
    doc.text(`Generated Date: ${new Date().toLocaleDateString('en-IN')}`, 14, 30);
    doc.text(`Total Earned: RS ${totalEarned.toLocaleString('en-IN')}`, 14, 38);
    doc.text(`Pending Dues: RS ${totalPending.toLocaleString('en-IN')}`, 14, 46);
    doc.text(`Total Verified Lots: ${materials.length}`, 14, 54);
    doc.text('------------------------------------------------------------', 14, 62);

    let y = 72;
    materials.forEach((mat, idx) => {
      const tx = txMap.get(mat.lot_id);
      const val = tx?.final_sale_value || tx?.quoted_price || mat.estimated_value || 0;
      doc.text(
        `${idx + 1}. ${mat.material_category} (${mat.approx_weight_kg}kg) - RS ${val} [${tx?.payment_status || 'unpaid'}]`,
        14,
        y
      );
      y += 8;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save('Kabadiwala_Earnings_Statement.pdf');
  };

  const handleShare = async () => {
    const shareText = `💰 Kabadiwala Connect — My Verified Earnings\n\nTotal Earned: ₹${totalEarned.toLocaleString('en-IN')}\nTotal Lots Traced: ${materials.length}\nDate: ${new Date().toLocaleDateString('en-IN')}\n\nTracked via Kabadiwala Connect PWA — Formalizing E-Waste Collection`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My E-Waste Earnings Statement',
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to copy if user cancels or share fails
      }
    }

    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const [selectedMat, setSelectedMat] = useState<LocalMaterial | null>(null);

  return (
    <div className="pb-24 pt-4 px-4 max-w-md sm:max-w-3xl md:max-w-5xl lg:max-w-6xl mx-auto space-y-4 font-sans">
      {/* Header Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500 text-white rounded-card p-4 shadow-soft">
          <div className="flex items-center space-x-1.5 opacity-90 text-xs font-semibold mb-1">
            <Wallet size={16} />
            <span>{t('ledger.earned')}</span>
          </div>
          <div className="text-2xl font-black">₹{totalEarned.toLocaleString('en-IN')}</div>
        </div>

        <div className="bg-amber-500 text-white rounded-card p-4 shadow-soft">
          <div className="flex items-center space-x-1.5 opacity-90 text-xs font-semibold mb-1">
            <Clock size={16} />
            <span>{t('ledger.pending')}</span>
          </div>
          <div className="text-2xl font-black">₹{totalPending.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Financial Identity Export & Share Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={exportPDF}
          className="tap-target bg-surface-card border border-stone-300 hover:border-brand-500 text-stone-800 font-bold py-3 px-3 rounded-xl flex items-center justify-center space-x-1.5 shadow-soft active:scale-95 transition-all text-xs"
        >
          <Download size={16} className="text-brand-600" />
          <span>{t('ledger.exportPDF')}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="tap-target bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-3 rounded-xl flex items-center justify-center space-x-1.5 shadow-soft active:scale-95 transition-all text-xs"
        >
          {copied ? <Check size={16} /> : <Share2 size={16} />}
          <span>{copied ? 'Copied ✓' : 'Share WhatsApp'}</span>
        </button>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        <h3 className="font-bold text-stone-900 text-base">{t('ledger.transactions')}</h3>

        {materials.length === 0 ? (
          <div className="bg-surface-card rounded-card p-8 text-center border border-surface-border space-y-2">
            <Package size={36} className="mx-auto text-stone-400" />
            <p className="text-stone-500 text-sm font-medium">कोई लेन-देन नहीं (No transactions yet)</p>
          </div>
        ) : (
          materials.map((mat) => {
            const tx = txMap.get(mat.lot_id);
            const val = tx?.final_sale_value || tx?.quoted_price || mat.estimated_value || 0;
            const isPaid = tx?.payment_status === 'paid' || tx?.status === 'closed';

            return (
              <div
                key={mat.lot_id}
                onClick={() => setSelectedMat(mat)}
                className="bg-surface-card rounded-card p-3.5 border border-surface-border shadow-soft space-y-2 cursor-pointer hover:border-brand-400 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                      isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {isPaid ? <CheckCircle size={20} /> : <Clock size={20} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900 text-sm">{mat.material_category}</h4>
                      <p className="text-xs text-stone-500">{mat.approx_weight_kg} kg • {mat.condition}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black text-stone-900">₹{val.toLocaleString('en-IN')}</div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isPaid ? t('ledger.paid') : t('ledger.unpaid')}
                    </span>
                  </div>
                </div>

                <div className="border-t border-stone-100 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-500">
                  <span className="font-mono text-[11px]">Ref: {mat.lot_id?.slice(0, 16)}</span>
                  
                  <div className="flex items-center space-x-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => navigate(`/match/${mat.lot_id}`)}
                      className="px-2.5 py-1 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-[11px] font-bold flex items-center space-x-1 hover:bg-amber-100 transition-colors"
                    >
                      <UserCheck size={12} />
                      <span>Match Buyer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/handover/${mat.lot_id}`)}
                      className="px-2.5 py-1 bg-brand-50 border border-brand-300 text-brand-900 rounded-lg text-[11px] font-bold flex items-center space-x-1 hover:bg-brand-100 transition-colors"
                    >
                      <QrCode size={12} />
                      <span>Show QR</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Transaction Detail & Receipt Modal */}
      {selectedMat && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-extrabold text-stone-900 text-base">Verified Traceability Receipt</h3>
                <p className="text-xs font-mono text-stone-500">Ref: {selectedMat.lot_id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMat(null)}
                className="text-stone-400 hover:text-stone-700 font-bold text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Material Photo Preview (Persistent Photo Traceability) */}
            {selectedMat.photo_local_uri ? (
              <div className="rounded-xl overflow-hidden max-h-40 border border-stone-200 shadow-inner">
                <img src={selectedMat.photo_local_uri} alt="Material Photo" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="bg-stone-100 rounded-xl p-3 text-center text-xs text-stone-400 italic">
                Photo unavailable (Skipped during lot creation)
              </div>
            )}

            {/* Lifecycle Progress Checklist (Audit Spec §8) - Dynamic based on real tx status */}
            {(() => {
              const selTx = txMap.get(selectedMat.lot_id);
              // 'created' is the initial status saved by LotCreationPage
              const statusOrder = ['created', 'draft', 'quoted', 'matched', 'handed_over', 'confirmed', 'paid', 'closed'];
              const currentStatusIdx = selTx ? statusOrder.indexOf(selTx.status) : -1;
              const steps = [
                { label: '1. Lot Created (Photo & AI Valuation)', minIdx: 0 },
                { label: '2. Buyer Matched (EcoRecycle Center)', minIdx: 3 },
                { label: '3. Digital Handover (QR Reference Token)', minIdx: 4 },
                { label: '4. Recycler Confirmed (GPS Verified)', minIdx: 5 },
                { label: '5. Payment Settled & Closed (Cash / UPI)', minIdx: 6 },
              ];
              return (
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Lifecycle Status Checklist</div>
                  <div className="space-y-1.5 text-xs font-medium">
                    {steps.map((step) => {
                      const done = currentStatusIdx >= step.minIdx;
                      return (
                        <div key={step.label} className={`flex items-center font-bold ${done ? 'text-emerald-700' : 'text-stone-400'}`}>
                          {done
                            ? <CheckCircle size={14} className="mr-1.5 shrink-0 text-emerald-500" />
                            : <XCircle size={14} className="mr-1.5 shrink-0 text-stone-300" />}
                          <span>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Matched Buyer / Recycler Details */}
            {(() => {
              const selTx = txMap.get(selectedMat.lot_id);
              const matchedRecycler = selTx?.recycler_id ? recyclerMap.get(selTx.recycler_id) : null;
              if (!matchedRecycler) {
                return (
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex items-center space-x-2.5 text-xs text-stone-400">
                    <Factory size={16} className="shrink-0" />
                    <span className="font-medium italic">Not yet matched to a buyer</span>
                  </div>
                );
              }
              return (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Matched Buyer</div>
                  <div className="flex items-start space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0">
                      <Factory size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-stone-900 text-sm truncate">{matchedRecycler.name}</div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="flex items-center text-[11px] text-stone-600 font-medium">
                          <MapPin size={11} className="mr-0.5 text-stone-400" />{matchedRecycler.facility_lat ? 'GPS Verified Location' : 'Location on file'}
                        </span>
                        <span className="flex items-center text-[11px] text-stone-600 font-medium">
                          <Phone size={11} className="mr-0.5 text-stone-400" />{matchedRecycler.contact_phone}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                      matchedRecycler.authorization_status === 'verified'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-200 text-amber-900'
                    }`}>
                      {matchedRecycler.authorization_status === 'verified' ? 'MPCB ✓' : matchedRecycler.authorization_status.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* 3 Price Points Display (Audit Spec §6) */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-1.5 text-xs text-amber-950 font-medium">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Retained Price Audit Trail</div>
              <div className="flex justify-between">
                <span>1. Estimated Initial Value:</span>
                <span className="font-bold">₹{selectedMat.estimated_value}</span>
              </div>
              <div className="flex justify-between">
                <span>2. Recycler Quoted Offer:</span>
                <span className="font-bold">₹{txMap.get(selectedMat.lot_id)?.quoted_price || selectedMat.estimated_value}</span>
              </div>
              <div className="flex justify-between border-t border-amber-200 pt-1 text-sm font-bold text-emerald-800">
                <span>3. Final Settled Sale Value:</span>
                <span>₹{txMap.get(selectedMat.lot_id)?.final_sale_value || selectedMat.estimated_value}</span>
              </div>
            </div>

            {(() => {
              const selTx = txMap.get(selectedMat.lot_id);
              const paymentLabel = selTx?.payment_status === 'paid'
                ? `${selTx.payment_method === 'upi' ? 'UPI' : 'Cash'} Paid ✓`
                : selTx?.payment_method === 'pending' || !selTx
                  ? 'Pending'
                  : `${selTx.payment_method === 'upi' ? 'UPI' : 'Cash'} — Unpaid`;
              return (
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-stone-600 bg-stone-100 p-2.5 rounded-xl">
                  <div>Collector ID: <strong>{collectorId.slice(0, 12)}</strong></div>
                  <div>Payment: <strong className={selTx?.payment_status === 'paid' ? 'text-emerald-700' : 'text-amber-700'}>{paymentLabel}</strong></div>
                </div>
              );
            })()}

            <button
              type="button"
              onClick={() => setSelectedMat(null)}
              className="w-full bg-stone-900 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
