import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, HardHat, Check, X } from 'lucide-react';
import { db } from '../data/local/db';
import { useNavigate } from 'react-router-dom';

interface HazardActionButtonProps {
  category: string;
  subCategory?: string;
  condition?: 'intact' | 'damaged' | 'stripped';
  lotId?: string;
  onProceed?: () => void;
}

export const HazardActionButton: React.FC<HazardActionButtonProps> = ({
  category,
  subCategory = '',
  condition = 'intact',
  lotId,
  onProceed,
}) => {
  const navigate = useNavigate();
  const [showHandlingSheet, setShowHandlingSheet] = useState(false);
  const [loggedStatus, setLoggedStatus] = useState<string | null>(null);

  // Compute hazard level and recommendations
  let hazardLevel: 'low' | 'medium' | 'high' = 'low';
  let hazardType = 'Standard E-Waste';
  let handlingInstruction = 'Standard handling with gloves.';
  let buttonText = '🟢 Continue Normally';
  let buttonColor = 'bg-[#16A34A] hover:bg-emerald-700 text-white';

  if (category === 'BATTERY' && (condition === 'damaged' || condition === 'stripped')) {
    hazardLevel = 'high';
    hazardType = 'Lithium Thermal Runaway & Acid Leakage';
    handlingInstruction = 'Do not crush or puncture cell. Store in dedicated sand/vermiculite non-combustible box.';
    buttonText = '🔴 Find Authorized Recycler & Request Containment';
    buttonColor = 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20';
  } else if (category === 'CRT') {
    hazardLevel = 'high';
    hazardType = 'Implosion Glass & Lead Phosphor Coating';
    handlingInstruction = 'Keep tube intact. Wear face shield and heavy-duty cut-resistant gloves.';
    buttonText = '🔴 Find Authorized Recycler & Request Containment';
    buttonColor = 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20';
  } else if (category === 'BATTERY') {
    hazardLevel = 'medium';
    hazardType = 'Insulated Cell Terminals';
    handlingInstruction = 'Tape cell terminals with electrical tape to prevent short circuit during transport.';
    buttonText = '🟡 Handle Carefully (Wear Gloves & Ventilate)';
    buttonColor = 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20';
  } else if (category === 'CABLE' && condition === 'stripped') {
    hazardLevel = 'medium';
    hazardType = 'Sharp Wire Ends & Wire Fumes';
    handlingInstruction = 'Use mechanical wire strippers. Never burn PVC coating.';
    buttonText = '🟡 Handle Carefully (Wear Gloves & Ventilate)';
    buttonColor = 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20';
  } else {
    hazardLevel = 'low';
    hazardType = 'Low Risk E-Scrap';
    handlingInstruction = 'Clean handling with basic protective gloves.';
    buttonText = '🟢 Continue Normally';
    buttonColor = 'bg-[#16A34A] hover:bg-emerald-700 text-white';
  }

  const logSafetyHistory = async (actionTaken: string) => {
    try {
      await db.safetyHistory.add({
        lot_id: lotId,
        material_name: subCategory || category,
        category,
        hazard_level: hazardLevel,
        hazard_type: hazardType,
        handling_instruction: handlingInstruction,
        action_taken: actionTaken,
        timestamp: new Date().toISOString(),
      });
      setLoggedStatus(actionTaken);
    } catch (e) {
      console.warn('Failed to log safety history:', e);
    }
  };

  const handleClick = async () => {
    if (hazardLevel === 'low') {
      await logSafetyHistory('Continued normally (Low risk verified)');
      if (onProceed) onProceed();
    } else if (hazardLevel === 'medium') {
      await logSafetyHistory('Equipped gloves & safety handling sheet opened');
      setShowHandlingSheet(true);
    } else if (hazardLevel === 'high') {
      await logSafetyHistory('High risk containment requested & routed to authorized recycler');
      if (lotId) {
        navigate(`/match/${lotId}`);
      } else {
        navigate('/prices');
      }
    }
  };

  return (
    <div className="space-y-2 font-sans">
      {/* Dynamic Hazard Action Button */}
      <button
        type="button"
        onClick={handleClick}
        className={`w-full py-3 px-4 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer ${buttonColor}`}
      >
        {hazardLevel === 'high' ? (
          <ShieldAlert size={16} />
        ) : hazardLevel === 'medium' ? (
          <AlertTriangle size={16} />
        ) : (
          <ShieldCheck size={16} />
        )}
        <span>{buttonText}</span>
      </button>

      {loggedStatus && (
        <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold px-2 py-1 rounded-xl text-center">
          ✓ Logged: {loggedStatus}
        </div>
      )}

      {/* Medium Hazard Handling Sheet Modal */}
      {showHandlingSheet && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl border border-stone-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm">Handling Safety Protocol</h3>
                  <p className="text-[11px] text-amber-800 font-bold">{hazardType}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHandlingSheet(false)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2 text-xs text-amber-900 font-semibold">
              <div className="font-bold flex items-center gap-1.5 text-stone-900">
                <HardHat size={15} className="text-amber-600 shrink-0" />
                Required Precautions:
              </div>
              <p className="text-[11px] leading-relaxed">{handlingInstruction}</p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHandlingSheet(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-stone-200 font-bold text-stone-700 hover:bg-stone-50 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowHandlingSheet(false);
                  if (onProceed) onProceed();
                }}
                className="flex-[2] py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center justify-center gap-1 shadow-md shadow-amber-600/20"
              >
                <Check size={16} />
                <span>Understood & Proceed</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
