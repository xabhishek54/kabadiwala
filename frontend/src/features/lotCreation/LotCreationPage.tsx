import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Camera, CheckCircle2, ArrowRight, ArrowLeft, Info,
  Cpu, Sparkles, AlertTriangle,
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { db } from '../../data/local/db';
import { AudioButton } from '../../components/AudioButton';
import { useImageClassifier } from '../../data/ml/useImageClassifier';
import { refinePriceEstimate, type PriceRefineResult } from '../../data/remote/apiClient';

export const LotCreationPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { classify, result: aiResult, isClassifying } = useImageClassifier();

  const [step, setStep] = useState<number>(1);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('PCB');
  const [weightKg, setWeightKg] = useState<number>(5.0);
  const [condition, setCondition] = useState<'intact' | 'damaged' | 'stripped'>('intact');
  const [isSaving, setIsSaving] = useState(false);
  const [aiSuggestionApplied, setAiSuggestionApplied] = useState(false);
  const [serverRefine, setServerRefine] = useState<PriceRefineResult | null>(null);
  const [isRefining, setIsRefining] = useState(false);

  const categories = [
    { id: 'PCB', icon: '🔌', label: t('categories.PCB') },
    { id: 'BATTERY', icon: '🔋', label: t('categories.BATTERY') },
    { id: 'CABLE', icon: '🧵', label: t('categories.CABLE') },
    { id: 'LCD_PANEL', icon: '🖥️', label: t('categories.LCD_PANEL') },
    { id: 'CRT', icon: '📺', label: t('categories.CRT') },
    { id: 'MOTOR_MAGNET', icon: '🧲', label: t('categories.MOTOR_MAGNET') },
    { id: 'MIXED_PLASTIC', icon: '♻️', label: t('categories.MIXED_PLASTIC') },
  ];

  // ---- Derived price values -----------------------------------------------
  const categoryBasePrices: Record<string, number> = {
    PCB: 260.0, BATTERY: 90.0, CABLE: 150.0, LCD_PANEL: 110.0,
    CRT: 40.0, MOTOR_MAGNET: 70.0, MIXED_PLASTIC: 25.0,
  };
  const conditionMultipliers: Record<string, number> = {
    intact: 1.0, damaged: 0.7, stripped: 0.4,
  };

  const basePricePerKg = categoryBasePrices[category] ?? 100.0;
  const conditionMult = conditionMultipliers[condition] ?? 1.0;
  const deterministicTotal = Math.round(weightKg * basePricePerKg * conditionMult);

  // Use server-refined value when available, else deterministic
  const estimatedTotal = serverRefine ? Math.round(serverRefine.refined_total) : deterministicTotal;

  // ---- Step 1: Photo capture + AI classification --------------------------
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        setPhotoDataUrl(dataUrl);
        setAiSuggestionApplied(false);
        setServerRefine(null);

        // Kick off TF.js classification in background
        await classify(dataUrl);

        setStep(2);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Image processing failed', error);
    }
  };

  // Apply AI suggestion to form fields
  const applyAiSuggestion = useCallback(() => {
    if (!aiResult) return;
    setCategory(aiResult.category);
    setCondition(aiResult.condition);
    setAiSuggestionApplied(true);
    setServerRefine(null);
  }, [aiResult]);

  // ---- Step 4: Fetch server-side price refinement -------------------------
  const handleEnterPriceStep = useCallback(async () => {
    setStep(4);
    setIsRefining(true);
    try {
      const refined = await refinePriceEstimate(category, weightKg, condition);
      setServerRefine(refined);
    } catch {
      // Silently use local deterministic fallback
    } finally {
      setIsRefining(false);
    }
  }, [category, weightKg, condition]);

  // ---- Save lot -----------------------------------------------------------
  const handleSaveLot = async () => {
    setIsSaving(true);
    const lotId = crypto.randomUUID();
    const collectorId = localStorage.getItem('kabadiwala_collector_id') || 'col-demo-101';
    const createdAt = new Date().toISOString();

    await db.materials.put({
      lot_id: lotId,
      material_category: category,
      sub_category: category,
      image_ref: photoDataUrl || undefined,
      approx_weight_kg: weightKg,
      condition,
      source_type: 'household',
      estimated_value: estimatedTotal,
      collector_id: collectorId,
      created_at: createdAt,
    });

    await db.transactions.put({
      lot_id: lotId,
      collector_id: collectorId,
      status: 'draft',
      quoted_price: estimatedTotal,
      payment_method: 'cash',
      payment_status: 'unpaid',
      created_at: createdAt,
      updated_at: createdAt,
    });

    await db.syncOutbox.add({
      client_uuid: lotId,
      entity_type: 'material',
      action: 'upsert',
      payload: {
        material_category: category,
        sub_category: category,
        approx_weight_kg: weightKg,
        condition,
        estimated_value: estimatedTotal,
        image_ref: photoDataUrl || undefined,
      },
      created_at: createdAt,
      synced: false,
    });

    setIsSaving(false);
    navigate('/ledger');
  };

  const breakdownAudioText = `${t(`categories.${category}`)}, ${weightKg} किलो, अनुमानित मूल्य ${estimatedTotal} रुपये।`;

  // -------------------------------------------------------------------------
  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-4">
      {/* Step Header */}
      <div className="flex items-center justify-between bg-surface-card p-3 rounded-card border border-surface-border shadow-soft">
        <button
          type="button"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="text-stone-500 disabled:opacity-30 tap-target"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-stone-900 text-sm">
          {t('lotCreation.title')} ({step}/4)
        </span>
        <div className="w-8" />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Step 1: Camera Photo Capture                                        */}
      {/* ------------------------------------------------------------------ */}
      {step === 1 && (
        <div className="bg-surface-card rounded-card p-6 border border-surface-border shadow-soft text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-brand-50 border-2 border-brand-500/30 flex items-center justify-center text-brand-600 shadow-sm">
            <Camera size={36} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900">{t('lotCreation.takePhoto')}</h3>
            <p className="text-xs text-stone-500 mt-1">AI स्वचालित पहचान करेगा (AI auto-detects category)</p>
          </div>

          {photoDataUrl && (
            <div className="relative rounded-xl overflow-hidden border border-stone-200 shadow-inner max-h-48">
              <img src={photoDataUrl} alt="Captured Lot" className="w-full h-full object-cover" />
            </div>
          )}

          <label className="block w-full bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold py-3.5 px-4 rounded-xl text-center shadow-md cursor-pointer transition-all">
            <span>{photoDataUrl ? 'दोबारा फोटो लें' : 'कैमरा खोलें'}</span>
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
          </label>

          {photoDataUrl && (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full bg-stone-900 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-sm"
            >
              <span>आगे बढ़ें</span>
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 2: Category Picker with AI suggestion banner                   */}
      {/* ------------------------------------------------------------------ */}
      {step === 2 && (
        <div className="space-y-3">

          {/* AI Suggestion Banner */}
          {isClassifying && (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 flex items-center space-x-2 text-brand-800 text-xs font-semibold animate-pulse">
              <Cpu size={16} />
              <span>AI विश्लेषण हो रहा है... (Analysing image...)</span>
            </div>
          )}

          {aiResult && !isClassifying && !aiSuggestionApplied && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center space-x-1.5 text-emerald-900 font-bold text-xs">
                <Sparkles size={16} className="text-emerald-600" />
                <span>
                  AI सुझाव (AI Suggestion)
                  {aiResult.fallback && (
                    <span className="ml-1 text-amber-700 font-normal">(heuristic)</span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-emerald-800 space-y-0.5">
                  <div>श्रेणी: <span className="font-bold">{aiResult.category}</span></div>
                  <div>स्थिति: <span className="font-bold">{aiResult.condition}</span></div>
                  <div className="text-emerald-600">विश्वास: {Math.round(aiResult.confidence * 100)}%</div>
                </div>
                <button
                  type="button"
                  onClick={applyAiSuggestion}
                  className="bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm active:scale-95 transition-all"
                >
                  लागू करें
                </button>
              </div>
            </div>
          )}

          {aiResult && aiSuggestionApplied && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center space-x-2 text-emerald-700 text-xs font-semibold">
              <CheckCircle2 size={15} />
              <span>AI सुझाव लागू हुआ (AI suggestion applied)</span>
            </div>
          )}

          <h3 className="font-bold text-stone-900 text-base">{t('lotCreation.selectCategory')}</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { setCategory(c.id); setServerRefine(null); }}
                className={`p-3.5 rounded-2xl border text-left flex items-center space-x-3 transition-all ${
                  category === c.id
                    ? 'bg-brand-50 border-brand-500 text-brand-900 shadow-sm ring-2 ring-brand-500/20'
                    : 'bg-surface-card border-surface-border text-stone-800 hover:bg-stone-50'
                }`}
              >
                <span className="text-2xl">{c.icon}</span>
                <span className="font-bold text-sm leading-tight">{c.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setStep(3)}
            className="w-full mt-4 bg-brand-600 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md active:scale-95"
          >
            <span>आगे बढ़ें (वजन दर्ज करें)</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 3: Weight & Condition Selection                                */}
      {/* ------------------------------------------------------------------ */}
      {step === 3 && (
        <div className="bg-surface-card rounded-card p-5 border border-surface-border shadow-soft space-y-5">
          {/* Weight */}
          <div>
            <label className="block font-bold text-stone-900 text-sm mb-2">{t('lotCreation.enterWeight')}</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="500"
                value={weightKg}
                onChange={(e) => { setWeightKg(parseFloat(e.target.value) || 1.0); setServerRefine(null); }}
                className="w-full text-2xl font-black p-3 rounded-xl border border-stone-300 text-stone-900 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-lg font-bold text-stone-600">किग्रा (kg)</span>
            </div>

            {/* Quick Weight Selectors */}
            <div className="flex space-x-2 mt-2.5">
              {[1, 5, 10, 20].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => { setWeightKg(w); setServerRefine(null); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    weightKg === w ? 'bg-stone-900 text-white border-stone-900' : 'bg-surface-muted text-stone-700 border-stone-200'
                  }`}
                >
                  {w} kg
                </button>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="block font-bold text-stone-900 text-sm mb-2">{t('lotCreation.conditionLabel')}</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'intact', label: t('lotCreation.intact'), icon: '✨' },
                { key: 'damaged', label: t('lotCreation.damaged'), icon: '⚠️' },
                { key: 'stripped', label: t('lotCreation.stripped'), icon: '🔧' },
              ].map((cond) => (
                <button
                  key={cond.key}
                  type="button"
                  onClick={() => { setCondition(cond.key as any); setServerRefine(null); }}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    condition === cond.key
                      ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold ring-2 ring-amber-500/20'
                      : 'bg-stone-50 border-stone-200 text-stone-700'
                  }`}
                >
                  <div className="text-lg">{cond.icon}</div>
                  <div className="text-xs mt-1">{cond.label}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleEnterPriceStep}
            className="w-full bg-brand-600 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md active:scale-95"
          >
            <span>कीमत का विवरण देखें</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 4: Explainable AI Price Breakdown & Confirm                    */}
      {/* ------------------------------------------------------------------ */}
      {step === 4 && (
        <div className="bg-surface-card rounded-card p-5 border border-surface-border shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-bold text-stone-900 text-lg">{t('lotCreation.estimateTitle')}</h3>
              <p className="text-xs text-stone-500">{t(`categories.${category}`)}</p>
            </div>
            <AudioButton textToSpeak={breakdownAudioText} size={20} />
          </div>

          {/* Big Price Display */}
          <div className="bg-brand-50 border border-brand-200/70 rounded-2xl p-4 text-center">
            <span className="text-xs font-semibold text-brand-800 uppercase tracking-wider block">अनुमानित कुल राशि</span>
            {isRefining ? (
              <div className="text-brand-400 text-sm font-semibold animate-pulse py-2">
                AI मूल्य परिशोधन... (Refining with AI...)
              </div>
            ) : (
              <>
                <span className="text-3xl font-black text-brand-700">₹{estimatedTotal}</span>
                {serverRefine && serverRefine.ml_adjustment !== 0 && (
                  <span className={`text-xs font-bold block mt-0.5 ${
                    serverRefine.ml_adjustment > 0 ? 'text-emerald-600' : 'text-rose-500'
                  }`}>
                    AI समायोजन: {serverRefine.ml_adjustment > 0 ? '+' : ''}₹{Math.round(serverRefine.ml_adjustment)}
                  </span>
                )}
                <span className="text-xs text-brand-600 block mt-0.5">
                  (₹{serverRefine ? Math.round(serverRefine.market_low) : Math.round(estimatedTotal * 0.95)} — ₹{serverRefine ? Math.round(serverRefine.market_high) : Math.round(estimatedTotal * 1.05)})
                </span>
              </>
            )}
          </div>

          {/* ML Confidence indicator */}
          {serverRefine && serverRefine.ml_confidence > 0 && (
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-3.5 py-2.5 text-xs">
              <div className="flex items-center space-x-1.5 text-indigo-800 font-semibold">
                <Sparkles size={14} />
                <span>AI मूल्य मॉडल ({Math.round(serverRefine.ml_confidence * 100)}% विश्वास)</span>
              </div>
              <span className="text-indigo-500 text-[10px]">{serverRefine.sample_count} मूल्य अवलोकन</span>
            </div>
          )}

          {/* Safety notice for hazardous categories */}
          {(category === 'BATTERY' || category === 'CRT') && (
            <div className="flex items-start space-x-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
              <span>
                {category === 'BATTERY'
                  ? 'बैटरी खतरनाक हो सकती है। जलाएं नहीं। (Batteries are hazardous — do not burn.)'
                  : 'CRT में लेड होता है। तोड़ें नहीं। (CRT contains lead — do not break.)'}
              </span>
            </div>
          )}

          {/* Explainable Price Breakdown */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2 text-xs text-stone-700">
            <div className="font-bold text-stone-900 text-sm flex items-center space-x-1.5 mb-1">
              <Info size={14} className="text-brand-600" />
              <span>{t('lotCreation.priceBreakdown')}</span>
            </div>
            <div className="flex justify-between">
              <span>स्थानिक दर (Base Price):</span>
              <span className="font-semibold">₹{serverRefine ? serverRefine.base_price_per_kg : basePricePerKg} /kg</span>
            </div>
            <div className="flex justify-between">
              <span>कुल वजन (Weight):</span>
              <span className="font-semibold">{weightKg} kg</span>
            </div>
            <div className="flex justify-between">
              <span>स्थिति समायोजन (Condition):</span>
              <span className="font-semibold">{condition} ({Math.round(conditionMult * 100)}%)</span>
            </div>
            {serverRefine && serverRefine.ml_adjustment !== 0 && (
              <div className="flex justify-between">
                <span>AI मूल्य समायोजन (ML Adj.):</span>
                <span className={`font-semibold ${serverRefine.ml_adjustment > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {serverRefine.ml_adjustment > 0 ? '+' : ''}₹{Math.round(serverRefine.ml_adjustment)}
                </span>
              </div>
            )}
            <div className="border-t border-stone-200 pt-2 flex justify-between font-bold text-stone-900 text-sm">
              <span>गणना:</span>
              <span>₹{serverRefine ? serverRefine.base_price_per_kg : basePricePerKg} × {weightKg}kg × {conditionMult} = ₹{estimatedTotal}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={isSaving || isRefining}
            onClick={handleSaveLot}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all disabled:opacity-60"
          >
            <CheckCircle2 size={20} />
            <span>{isSaving ? 'सुरक्षित हो रहा है...' : t('lotCreation.saveDraft')}</span>
          </button>
        </div>
      )}
    </div>
  );
};
