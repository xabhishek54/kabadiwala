import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LocalTransaction } from '../../data/local/db';
import { jsPDF } from 'jspdf';
import { Wallet, Clock, Share2, CheckCircle, Package, Download, Check } from 'lucide-react';

export const LedgerPage: React.FC = () => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const materials = useLiveQuery(() => db.materials.toArray(), []) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) || [];

  const txMap = new Map<string, LocalTransaction>();
  transactions.forEach((tx) => txMap.set(tx.lot_id, tx));

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

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-4">
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

      {/* Differentiator Feature 9: Financial Identity Export & Native Web Share */}
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
                className="bg-surface-card rounded-card p-3.5 border border-surface-border shadow-soft flex items-center justify-between"
              >
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
            );
          })
        )}
      </div>
    </div>
  );
};
