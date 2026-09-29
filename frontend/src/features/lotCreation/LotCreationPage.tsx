import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import { db } from '../../data/local/db';
import { classifyImageClient, type ImageClassificationResult } from '../../utils/mlClassifier';
import { refinePriceEstimate, type PriceRefineResult } from '../../data/remote/apiClient';
import { AudioButton } from '../../components/AudioButton';
import { Camera, CheckCircle2, ArrowRight, ArrowLeft, Sparkles, AlertTriangle, Info, Cpu } from 'lucide-react';

function createLotId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    bytes.forEach((_, index) => { bytes[index] = Math.floor(Math.random() * 256); });
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const LotCreationPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isEn = i18n.language === 'en';

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Resolve the logged-in user's collector ID from localStorage (fallback to phone)
  const currentUser = (() => { try { return JSON.parse(window.localStorage?.getItem('kabadiwala_user') || '{}'); } catch { return {}; } })();
  const collectorId: string = currentUser.id || '';

  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<'household' | 'commercial' | 'mixed_scrap'>('household');
  const [category, setCategory] = useState<string>('PCB');
  const [subCategory, setSubCategory] = useState<string>('Motherboard');
  const [weightKg, setWeightKg] = useState<number>(1.0);
  const [condition, setCondition] = useState<'intact' | 'damaged' | 'stripped'>('intact');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [weightError, setWeightError] = useState<string | null>(null);
  const [showSafetyModal, setShowSafetyModal] = useState<boolean>(false);

  // Client ML state
  const [isClassifying, setIsClassifying] = useState(false);
  const [aiResult, setAiResult] = useState<ImageClassificationResult | null>(null);
  const [aiSuggestionApplied, setAiSuggestionApplied] = useState(false);

  // Server GBDT refine state
  const [isRefining, setIsRefining] = useState(false);
  const [serverRefine, setServerRefine] = useState<PriceRefineResult | null>(null);

  const sourceTypes = [
    { id: 'household', label: isEn ? 'Household' : 'घरेलू (Household)', icon: '🏠' },
    { id: 'commercial', label: isEn ? 'Commercial' : 'व्यावसायिक (Commercial)', icon: '🏢' },
    { id: 'mixed_scrap', label: isEn ? 'Mixed Scrap' : 'मिश्रित स्क्रैप (Mixed Scrap)', icon: '📦' },
  ];

  const subCategoryOptions: Record<string, { id: string; label: string }[]> = {
    PCB: [
      { id: 'Motherboard', label: isEn ? 'Computer Motherboard' : 'कंप्यूटर मदरबोर्ड' },
      { id: 'Smartphone_PCB', label: isEn ? 'Smartphone / Mobile Board' : 'मोबाइल बोर्ड' },
      { id: 'TV_Board', label: isEn ? 'TV / Appliance PCB' : 'टीवी बोर्ड' },
      { id: 'Mixed_PCB', label: isEn ? 'Mixed Circuit Boards' : 'मिश्रित सर्किट बोर्ड' },
    ],
    BATTERY: [
      { id: 'Lead_Acid', label: isEn ? 'Lead-Acid Battery (Car/UPS)' : 'लेड-एसिड बैटरी' },
      { id: 'Lithium_Ion', label: isEn ? 'Li-ion Battery (Phone/Laptop)' : 'लिथियम आयन बैटरी' },
      { id: 'Inverter_Battery', label: isEn ? 'Inverter Heavy Battery' : 'इन्वर्टर बैटरी' },
    ],
    CABLE: [
      { id: 'Copper_Cable', label: isEn ? 'Heavy Copper Wiring' : 'तांबा केबल' },
      { id: 'Aluminum_Cable', label: isEn ? 'Aluminum Cable' : 'एल्यूमीनियम तार' },
      { id: 'Mixed_Wire', label: isEn ? 'Thin / Mixed Wire' : 'मिश्रित वायर' },
    ],
    LCD_PANEL: [
      { id: 'Monitor', label: isEn ? 'Computer LCD Monitor' : 'एलसीडी मॉनिटर' },
      { id: 'TV_Panel', label: isEn ? 'LED/LCD TV Screen' : 'टीवी स्क्रीन' },
    ],
    CRT: [
      { id: 'CRT_TV', label: isEn ? 'Heavy CRT TV Glass' : 'सीआरटी टीवी' },
      { id: 'CRT_Monitor', label: isEn ? 'Old CRT Monitor' : 'पुराना सीआरटी मॉनिटर' },
    ],
    MOTOR_MAGNET: [
      { id: 'Fridge_Compressor', label: isEn ? 'Fridge Compressor Motor' : 'कंप्रेसर मोटर' },
      { id: 'Copper_Motor', label: isEn ? 'Winding Copper Motor' : 'कॉपर वाइंडिंग मोटर' },
    ],
    MIXED_PLASTIC: [
      { id: 'E_Waste_Housing', label: isEn ? 'Hard ABS Plastic Shells' : 'प्लास्टिक बॉडी' },
      { id: 'Mixed_Plastic', label: isEn ? 'Mixed Shredded Scrap' : 'मिश्रित स्क्रैप' },
    ],
  };

  const categories = [
    { id: 'PCB', label: t('categories.PCB'), icon: '🔌' },
    { id: 'BATTERY', label: t('categories.BATTERY'), icon: '🔋' },
    { id: 'CABLE', label: t('categories.CABLE'), icon: '🧵' },
    { id: 'LCD_PANEL', label: t('categories.LCD_PANEL'), icon: '🖥️' },
    { id: 'CRT', label: t('categories.CRT'), icon: '📺' },
    { id: 'MOTOR_MAGNET', label: t('categories.MOTOR_MAGNET'), icon: '🧲' },
    { id: 'MIXED_PLASTIC', label: t('categories.MIXED_PLASTIC'), icon: '♻️' },
  ];


  const district = (typeof window !== 'undefined' && window.localStorage?.getItem('kabadiwala_district')) || 'Pune';
  const cachedPrices = useLiveQuery(() => db.priceCache.where('district').equals(district).toArray()) || [];

  const BASE_PRICES: Record<string, number> = cachedPrices.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = p.current_price;
    return acc;
  }, {} as Record<string, number>);

  // Default fallback if db is empty
  if (Object.keys(BASE_PRICES).length === 0) {
    BASE_PRICES['PCB'] = 260; BASE_PRICES['BATTERY'] = 90; BASE_PRICES['CABLE'] = 150;
    BASE_PRICES['LCD_PANEL'] = 110; BASE_PRICES['CRT'] = 40; BASE_PRICES['MOTOR_MAGNET'] = 70; BASE_PRICES['MIXED_PLASTIC'] = 25;
  }
  const CONDITION_MULT: Record<string, number> = { intact: 1.0, damaged: 0.7, stripped: 0.4 };

  const normalizedSubCategory = subCategory.toLowerCase().replace(/[^a-z0-9]/g, '');
  const categoryPrices = cachedPrices.filter((price) => price.category === category);
  const selectedPrice = categoryPrices.find((price) => {
    const normalizedName = price.sub_category.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalizedName.includes(normalizedSubCategory) || normalizedSubCategory.includes(normalizedName);
  }) ?? categoryPrices[0];
  const basePricePerKg = selectedPrice?.current_price ?? BASE_PRICES[category] ?? 100;
  const conditionMult = CONDITION_MULT[condition] ?? 1.0;

  const estimatedTotal = serverRefine
    ? serverRefine.refined_total
    : Math.round(basePricePerKg * weightKg * conditionMult);



  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedPhoto = await imageCompression(file, {
        maxSizeMB: 0.1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: 'image/jpeg',
      });
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result;
        if (typeof dataUrl !== 'string') {
          setSaveError(isEn ? 'The photo could not be read. Please try again.' : 'फोटो नहीं पढ़ा जा सका। कृपया फिर कोशिश करें।');
          return;
        }
        setPhotoDataUrl(dataUrl);
        setSaveError(null);
        setIsClassifying(true);
        setAiSuggestionApplied(false);
        try {
          const result = await classifyImageClient(dataUrl);
          setAiResult(result);
        } catch (err) {
          console.warn('Image classification failed:', err);
        } finally {
          setIsClassifying(false);
        }
      };
      reader.onerror = () => {
        setSaveError(isEn ? 'The photo could not be read. Please try again.' : 'फोटो नहीं पढ़ा जा सका। कृपया फिर कोशिश करें।');
      };
      reader.readAsDataURL(compressedPhoto);
    } catch (err) {
      console.error('Photo compression failed:', err);
      setSaveError(isEn ? 'The photo could not be prepared. Please choose another photo.' : 'फोटो तैयार नहीं हो सका। कृपया दूसरा फोटो चुनें।');
    }
  };

  const applyAiSuggestion = () => {
    if (!aiResult) return;
    if (aiResult.category && BASE_PRICES[aiResult.category] !== undefined) {
      setCategory(aiResult.category);
      setSubCategory(subCategoryOptions[aiResult.category]?.[0]?.id ?? aiResult.category);
    }
    if (aiResult.condition) {
      setCondition(aiResult.condition);
    }
    setAiSuggestionApplied(true);
  };

  const handleEnterPriceStep = async () => {
    if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 500) {
      setWeightError(isEn ? 'Enter a weight between 0.1 and 500 kg.' : '0.1 से 500 किग्रा के बीच वजन दर्ज करें।');
      return;
    }
    setWeightError(null);
    setServerRefine(null);
    setStep(4);
    setIsRefining(true);
    try {
      const refined = await refinePriceEstimate(category, subCategory, weightKg, condition, district);
      setServerRefine(refined);
    } catch (err) {
      console.warn('Refine failed:', err);
    } finally {
      setIsRefining(false);
    }
  };

  const handleSaveLot = async (shouldMatchImmediately: boolean = true) => {
    if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 500) {
      setWeightError(isEn ? 'Enter a weight between 0.1 and 500 kg.' : '0.1 से 500 किग्रा के बीच वजन दर्ज करें।');
      setStep(3);
      return;
    }
    if (!collectorId) {
      setSaveError(isEn ? 'Your account is not ready yet. Please sign in again.' : 'आपका खाता तैयार नहीं है। कृपया फिर से लॉग इन करें।');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    const clientUuid = createLotId();
    const nowIso = new Date().toISOString();

    try {
      await db.transaction('rw', db.materials, db.transactions, db.syncOutbox, async () => {
        await db.materials.add({
          lot_id: clientUuid,
          material_category: category,
          sub_category: subCategory || category,
          approx_weight_kg: weightKg,
          condition,
          condition_confidence: aiSuggestionApplied ? aiResult?.confidence : undefined,
          condition_ml_used: aiSuggestionApplied,
          source_type: sourceType,
          estimated_value: estimatedTotal,
          collector_id: collectorId,
          photo_local_uri: photoDataUrl || undefined,
          created_at: nowIso,
        });

        await db.transactions.add({
          lot_id: clientUuid,
          collector_id: collectorId,
          status: 'quoted',
          quoted_price: estimatedTotal,
          payment_method: 'pending',
          payment_status: 'unpaid',
          created_at: nowIso,
          updated_at: nowIso,
        });

        await db.syncOutbox.add({
          client_uuid: clientUuid,
          entity_type: 'material',
          action: 'create',
          payload: {
            lot_id: clientUuid,
            material_category: category,
            sub_category: subCategory || category,
            approx_weight_kg: weightKg,
            condition,
            condition_confidence: aiSuggestionApplied ? aiResult?.confidence : undefined,
            condition_ml_used: aiSuggestionApplied,
            source_type: sourceType,
            estimated_value: estimatedTotal,
            classifier_confidence: aiSuggestionApplied ? aiResult?.confidence : undefined,
            classifier_used: aiSuggestionApplied,
            created_at: nowIso,
          },
          created_at: nowIso,
          synced: false,
        });
      });
      navigate(shouldMatchImmediately ? `/match/${clientUuid}` : '/ledger');
    } catch (err) {
      console.error('Local lot save failed:', err);
      setSaveError(isEn ? 'We could not save this lot. Your data has not been submitted; please try again.' : 'लॉट सेव नहीं हुआ। डेटा नहीं भेजा गया है; कृपया फिर कोशिश करें।');
    } finally {
      setIsSaving(false);
    }
  };

  const breakdownAudioText = isEn
    ? `${t(`categories.${category}`)}, ${weightKg} kilograms, estimated value ${estimatedTotal} rupees.`
    : `${t(`categories.${category}`)}, ${weightKg} किलो, अनुमानित मूल्य ${estimatedTotal} रुपये।`;

  return (
    <div className="pb-24 pt-4 px-4 max-w-md sm:max-w-2xl md:max-w-3xl mx-auto space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-surface-card p-3 rounded-card border border-surface-border shadow-soft">
        {step > 1 ? (
          <button type="button" onClick={() => setStep((step - 1) as any)} className="text-stone-500 tap-target">
            <ArrowLeft size={20} />
          </button>
        ) : (
          <div className="w-8" />
        )}
        <h2 className="font-bold text-stone-900 text-base">{t('lotCreation.title')}</h2>
        <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
          Step {step}/4
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-brand-500 h-full transition-all duration-300"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Step 1: Camera Photo Capture                                       */}
      {/* ------------------------------------------------------------------ */}
      {step === 1 && (
        <div className="bg-surface-card rounded-card p-6 border border-surface-border shadow-soft text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-brand-50 border-2 border-brand-500/30 flex items-center justify-center text-brand-600 shadow-sm">
            <Camera size={36} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900">{t('lotCreation.takePhoto')}</h3>
            <p className="text-xs text-stone-500 mt-1">
              {isEn ? 'AI will auto-detect category & condition' : 'AI स्वचालित पहचान करेगा (AI auto-detects category)'}
            </p>
          </div>

          {photoDataUrl && (
            <div className="relative rounded-xl overflow-hidden border border-stone-200 shadow-inner max-h-48">
              <img src={photoDataUrl} alt="Captured Lot" className="w-full h-full object-cover" />
            </div>
          )}

          <label className="block w-full bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold py-3.5 px-4 rounded-xl text-center shadow-md cursor-pointer transition-all">
            <span>{photoDataUrl ? (isEn ? 'Retake Photo' : 'दोबारा फोटो लें') : (isEn ? 'Open Camera' : 'कैमरा खोलें')}</span>
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
          </label>

          {!photoDataUrl && (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 border border-stone-200 transition-all"
            >
              <span>{isEn ? 'Continue without Photo (Skip)' : 'बिना फोटो आगे बढ़ें (Skip Photo)'}</span>
              <ArrowRight size={18} />
            </button>
          )}

          {photoDataUrl && (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full bg-stone-900 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-sm"
            >
              <span>{isEn ? 'Next Step' : 'आगे बढ़ें'}</span>
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
              <span>{isEn ? 'AI analyzing image...' : 'AI विश्लेषण हो रहा है... (Analysing image...)'}</span>
            </div>
          )}

          {aiResult && !isClassifying && !aiSuggestionApplied && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center space-x-1.5 text-emerald-900 font-bold text-xs">
                <Sparkles size={16} className="text-emerald-600" />
                <span>
                  {isEn ? 'AI Smart Suggestion' : 'AI सुझाव (AI Suggestion)'}
                  {aiResult.fallback && (
                    <span className="ml-1 text-amber-700 font-normal">(heuristic)</span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-emerald-800 space-y-0.5">
                  <div>{isEn ? 'Category:' : 'श्रेणी:'} <span className="font-bold">{aiResult.category}</span></div>
                  <div>{isEn ? 'Condition:' : 'स्थिति:'} <span className="font-bold">{aiResult.condition}</span></div>
                  <div className="text-emerald-600">{isEn ? 'Confidence:' : 'विश्वास:'} {Math.round(aiResult.confidence * 100)}%</div>
                </div>
                <button
                  type="button"
                  onClick={applyAiSuggestion}
                  className="bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm active:scale-95 transition-all"
                >
                  {isEn ? 'Apply Suggestion' : 'लागू करें'}
                </button>
              </div>
            </div>
          )}

          {aiResult && aiSuggestionApplied && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center space-x-2 text-emerald-700 text-xs font-semibold">
              <CheckCircle2 size={15} />
              <span>{isEn ? 'AI suggestion applied' : 'AI सुझाव लागू हुआ (AI suggestion applied)'}</span>
            </div>
          )}

          {/* Collection Source Dropdown Select */}
          <div className="space-y-1">
            <label className="font-bold text-stone-900 text-xs text-stone-600 uppercase tracking-wider block">
              {isEn ? 'Collection Source' : 'संग्रहण स्रोत (Source Type)'}
            </label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as 'household' | 'commercial' | 'mixed_scrap')}
              className="w-full p-3 rounded-xl border border-stone-300 bg-stone-50 font-bold text-xs text-stone-900 focus:ring-2 focus:ring-brand-500 focus:outline-none cursor-pointer"
            >
              {sourceTypes.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.icon} {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* Material Category Compact Dropdown Select */}
          <div className="space-y-1 pt-1">
            <label className="font-bold text-stone-900 text-xs text-stone-600 uppercase tracking-wider block">
              {t('lotCreation.selectCategory')}
            </label>
            <select
              value={category}
              onChange={(e) => {
                const cId = e.target.value;
                setCategory(cId);
                setAiSuggestionApplied(false);
                setServerRefine(null);
                if (subCategoryOptions[cId]?.[0]) {
                  setSubCategory(subCategoryOptions[cId][0].id);
                }
                if (['BATTERY', 'CRT', 'CABLE', 'PCB'].includes(cId)) {
                  setShowSafetyModal(true);
                }
              }}
              className="w-full p-3 rounded-xl border border-brand-300 bg-brand-50/50 font-black text-sm text-brand-900 focus:ring-2 focus:ring-brand-500 focus:outline-none cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.label} (₹{BASE_PRICES[c.id]}/kg)
                </option>
              ))}
            </select>
          </div>

          {/* Sub-Category Compact Dropdown Select */}
          {subCategoryOptions[category] && (
            <div className="space-y-1 pt-1">
              <label className="font-bold text-stone-900 text-xs text-stone-600 uppercase tracking-wider block">
                {isEn ? 'Specific Sub-Category' : 'विशिष्ट उप-श्रेणी (Sub-category)'}
              </label>
              <select
                value={subCategory}
                onChange={(e) => {
                  setSubCategory(e.target.value);
                  setServerRefine(null);
                }}
                className="w-full p-3 rounded-xl border border-stone-300 bg-stone-50 font-bold text-xs text-stone-900 focus:ring-2 focus:ring-brand-500 focus:outline-none cursor-pointer"
              >
                {subCategoryOptions[category].map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Contextual Safety Alert — shown for hazardous categories */}
          {(['BATTERY', 'CRT', 'CABLE', 'PCB'].includes(category)) && (() => {
            const safetyMap: Record<string, { icon: string; risk: string; donts: string[]; dos: string[]; audioEn: string; audioHi: string }> = {
              BATTERY: {
                icon: '🔋', risk: 'High Risk', donts: ['Don\'t burn or puncture', 'Don\'t throw in regular trash'],
                dos: ['Store upright in cool place', 'Hand to authorized recycler only'],
                audioEn: 'Battery safety warning. Do not burn or puncture batteries. Hand them to an authorized recycler.',
                audioHi: 'बैटरी सुरक्षा चेतावनी। बैटरी जलाएं या छेदें नहीं। केवल अधिकृत रीसायकलर को दें।',
              },
              CRT: {
                icon: '📺', risk: 'Lead / Glass Hazard', donts: ['Don\'t break the screen', 'Don\'t burn — contains lead'],
                dos: ['Keep intact until handover', 'Use gloves when handling'],
                audioEn: 'CRT screen safety warning. Do not break the screen. It contains lead. Keep intact.',
                audioHi: 'सीआरटी स्क्रीन चेतावनी। स्क्रीन मत तोड़ें। इसमें सीसा होता है। सुरक्षित रखें।',
              },
              CABLE: {
                icon: '🧵', risk: 'Environmental Rule', donts: ['Don\'t burn to extract copper — illegal', 'Don\'t cut insulation manually'],
                dos: ['Hand intact to recycler', 'Report illegal burning'],
                audioEn: 'Cable safety warning. Do not burn cables to extract copper. This is illegal and harmful. Hand intact to recycler.',
                audioHi: 'केबल सुरक्षा चेतावनी। तांबा निकालने के लिए केबल मत जलाएं। यह गैरकानूनी है। रीसायकलर को दें।',
              },
              PCB: {
                icon: '🔌', risk: 'Toxic Metals', donts: ['Don\'t use acid to strip gold', 'Don\'t burn boards'],
                dos: ['Handle with gloves', 'Hand to MPCB-authorized recycler'],
                audioEn: 'Circuit board safety warning. Do not burn boards or use acid. Contains toxic metals. Use gloves.',
                audioHi: 'सर्किट बोर्ड चेतावनी। बोर्ड जलाएं या एसिड इस्तेमाल न करें। इसमें जहरीली धातु है। दस्ताने पहनें।',
              },
            };
            const s = safetyMap[category];
            return (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{s.icon}</span>
                    <div>
                      <div className="text-xs font-extrabold text-rose-900 uppercase tracking-wide">⚠️ Safety Alert</div>
                      <div className="text-[11px] text-rose-700 font-semibold">{s.risk}</div>
                    </div>
                  </div>
                  <AudioButton textToSpeak={isEn ? s.audioEn : s.audioHi} size={16} className="shrink-0" />
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-medium">
                  {s.donts.map((d) => (
                    <div key={d} className="flex items-start space-x-1 text-rose-800">
                      <span className="shrink-0">❌</span><span>{d}</span>
                    </div>
                  ))}
                  {s.dos.map((d) => (
                    <div key={d} className="flex items-start space-x-1 text-emerald-800">
                      <span className="shrink-0">✅</span><span>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <button
            type="button"
            onClick={() => setStep(3)}
            className="w-full mt-4 bg-brand-600 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md active:scale-95"
          >
            <span>{isEn ? 'Next (Enter Weight)' : 'आगे बढ़ें (वजन दर्ज करें)'}</span>
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
                step="0.1"
                min="0.1"
                max="500"
                value={weightKg}
                onChange={(e) => {
                  setWeightKg(e.target.value === '' ? Number.NaN : parseFloat(e.target.value));
                  setWeightError(null);
                  setServerRefine(null);
                }}
                className="w-full text-2xl font-black p-3 rounded-xl border border-stone-300 text-stone-900 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-lg font-bold text-stone-600">{isEn ? 'kg' : 'किग्रा (kg)'}</span>
            </div>
            {weightError && <p className="mt-2 text-xs font-semibold text-rose-700" role="alert">{weightError}</p>}

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
                  onClick={() => {
                    setCondition(cond.key as 'intact' | 'damaged' | 'stripped');
                    setAiSuggestionApplied(false);
                    setServerRefine(null);
                  }}
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
            <span>{isEn ? 'View Valuation Breakdown' : 'कीमत का विवरण देखें'}</span>
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
            <span className="text-xs font-semibold text-brand-800 uppercase tracking-wider block">
              {isEn ? 'Estimated Total Value' : 'अनुमानित कुल राशि'}
            </span>
            {isRefining ? (
              <div className="text-brand-400 text-sm font-semibold animate-pulse py-2">
                {isEn ? 'Refining price with AI...' : 'AI मूल्य परिशोधन... (Refining with AI...)'}
              </div>
            ) : (
              <>
                <span className="text-3xl font-black text-brand-700">₹{estimatedTotal}</span>
                {serverRefine && serverRefine.ml_adjustment !== 0 && (
                  <span className={`text-xs font-bold block mt-0.5 ${
                    serverRefine.ml_adjustment > 0 ? 'text-emerald-600' : 'text-rose-500'
                  }`}>
                    {isEn ? 'AI Adjustment: ' : 'AI समायोजन: '}{serverRefine.ml_adjustment > 0 ? '+' : ''}₹{Math.round(serverRefine.ml_adjustment)}
                  </span>
                )}
                <span className="text-xs text-brand-600 block mt-0.5">
                  (₹{serverRefine
                    ? Math.round(serverRefine.market_low)
                    : Math.round((selectedPrice?.market_range_low ?? basePricePerKg * 0.95) * weightKg * conditionMult)} — ₹{serverRefine
                    ? Math.round(serverRefine.market_high)
                    : Math.round((selectedPrice?.market_range_high ?? basePricePerKg * 1.05) * weightKg * conditionMult)})
                </span>
              </>
            )}
          </div>

          {/* ML Confidence indicator */}
          {serverRefine && serverRefine.ml_confidence > 0 && (
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-3.5 py-2.5 text-xs">
              <div className="flex items-center space-x-1.5 text-indigo-800 font-semibold">
                <Sparkles size={14} />
                <span>{isEn ? `AI Pricing Model (${Math.round(serverRefine.ml_confidence * 100)}% confidence)` : `AI मूल्य मॉडल (${Math.round(serverRefine.ml_confidence * 100)}% विश्वास)`}</span>
              </div>
              <span className="text-indigo-500 text-[10px]">{serverRefine.sample_count} {isEn ? 'price observations' : 'मूल्य अवलोकन'}</span>
            </div>
          )}

          {/* Safety notice for hazardous categories */}
          {(category === 'BATTERY' || category === 'CRT') && (
            <div className="flex items-start space-x-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
              <span>
                {category === 'BATTERY'
                  ? (isEn ? 'Batteries are hazardous — do not crush or burn.' : 'बैटरी खतरनाक हो सकती है। जलाएं नहीं। (Batteries are hazardous — do not burn.)')
                  : (isEn ? 'CRT monitors contain lead glass — do not break.' : 'CRT में लेड होता है। तोड़ें नहीं। (CRT contains lead — do not break.)')}
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
              <span>{isEn ? 'Base Rate:' : 'स्थानिक दर (Base Price):'}</span>
              <span className="font-semibold">₹{serverRefine ? serverRefine.base_price_per_kg : basePricePerKg} /kg</span>
            </div>
            <div className="flex justify-between">
              <span>{isEn ? 'Lot Weight:' : 'कुल वजन:'}</span>
              <span className="font-semibold">{weightKg} kg</span>
            </div>
            <div className="flex justify-between">
              <span>{isEn ? 'Condition Multiplier:' : 'सामग्री स्थिति गुणक:'}</span>
              <span className="font-semibold">
                {serverRefine ? serverRefine.condition_multiplier : conditionMult}x ({condition})
              </span>
            </div>
          </div>

          {/* Submit Options */}
          <div className="space-y-2 pt-2">
            {saveError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800" role="alert">
                {saveError}
              </div>
            )}
            <button
              type="button"
              onClick={() => handleSaveLot(true)}
              disabled={isSaving}
              className="w-full bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all disabled:opacity-50 text-xs"
            >
              <CheckCircle2 size={18} />
              <span>{isSaving ? (isEn ? 'Saving Lot...' : 'सुरक्षित हो रहा है...') : (isEn ? 'Save Lot & Find Buyer Now' : 'सुरक्षित करें व रीसायकलर खोजें')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveLot(false)}
              disabled={isSaving}
              className="w-full bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all disabled:opacity-50 text-xs"
            >
              <span>{isEn ? 'Save Lot Only (Decide Buyer Later)' : 'फक्त लॉट सेव्ह करा (नंतर रीसायकलर निवडा)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Contextual Safety Guidance Modal */}
      {showSafetyModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center space-x-2 text-rose-600 font-bold text-sm">
                <AlertTriangle size={18} />
                <span>{isEn ? 'Safety Warning Guidelines' : 'सुरक्षा निर्देश (Safety Rules)'}</span>
              </div>
              <AudioButton
                textToSpeak={
                  category === 'BATTERY'
                    ? (isEn ? 'Warning! Batteries contain hazardous chemicals. Do not crush, burn, or open battery casings. Hand over to authorized recyclers only.' : 'सावधान! बैटरी में खतरनाक रसायन होते हैं। इसे जलाएं नहीं।')
                    : category === 'CRT'
                      ? (isEn ? 'Warning! CRT monitors contain toxic lead glass. Do not break or smash CRT screens.' : 'सावधान! सीआरटी में जहरीला शीशा होता है। इसे तोड़ें नहीं।')
                      : (isEn ? 'Warning! Hazardous material requires safe handling.' : 'सावधान! सुरक्षा से संभालें।')
                }
                size={18}
              />
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-extrabold text-stone-900">
                {isEn ? `Handling ${category}:` : `${category} सामग्री सुरक्षा Rules:`}
              </p>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-950 space-y-1 font-medium">
                <div className="flex items-center space-x-1.5 text-rose-700 font-bold">
                  <span>❌ DO NOT:</span>
                </div>
                {category === 'BATTERY' && (
                  <p>• Do not crush, burn, or expose to high heat.</p>
                )}
                {category === 'CRT' && (
                  <p>• Do not break CRT vacuum glass tubes.</p>
                )}
                {category === 'CABLE' && (
                  <p>• Do not burn plastic wire coating (toxic dioxin fumes).</p>
                )}
                {category === 'PCB' && (
                  <p>• Do not use open flame acid washing.</p>
                )}
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-950 space-y-1 font-medium">
                <div className="flex items-center space-x-1.5 text-emerald-700 font-bold">
                  <span>✅ DO:</span>
                </div>
                <p>• Hand over directly to MPCB authorized processing facilities.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSafetyModal(false)}
              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition-all"
            >
              {isEn ? 'I Understand (Continue)' : 'समझ गया (आगे बढ़ें)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
