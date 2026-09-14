import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../data/local/db';
import { classifyImageClient, type ImageClassificationResult } from '../../utils/mlClassifier';
import {
  Camera, ArrowLeft, Sparkles, Check, RefreshCw
} from 'lucide-react';

/* ─── Category & Sub-Category Visual Items Definition ─── */
export interface SubCategoryItem {
  id: string;
  name: string;
  basePricePerKg: number;
  minerals: string;
}

export interface CategoryGroup {
  id: string;
  name: string;
  icon: string;
  imageBg: string;
  description: string;
  subCategories: SubCategoryItem[];
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'PCB',
    name: 'PCBs & Circuit Boards',
    icon: '🔌',
    imageBg: 'from-emerald-600 to-emerald-900',
    description: 'Motherboards, RAM cards, Telecom boards',
    subCategories: [
      { id: 'Motherboard High Grade', name: 'Motherboard High Grade', basePricePerKg: 260, minerals: 'Copper (Cu), Gold (Au), Silver (Ag)' },
      { id: 'Telecom & Server Board', name: 'Telecom & Server Board', basePricePerKg: 320, minerals: 'Tantalum (Ta), Palladium (Pd), Copper (Cu)' },
      { id: 'Low Grade Consumer PCB', name: 'Low Grade Consumer PCB', basePricePerKg: 140, minerals: 'Copper (Cu), Tin (Sn)' },
      { id: 'RAM & Extension Cards', name: 'RAM & Expansion Cards', basePricePerKg: 450, minerals: 'Gold (Au), Silver (Ag), Copper (Cu)' },
    ],
  },
  {
    id: 'BATTERY',
    name: 'Batteries & Cell Packs',
    icon: '🔋',
    imageBg: 'from-blue-600 to-indigo-900',
    description: 'Li-Ion packs, EV modules, Phone batteries',
    subCategories: [
      { id: 'Lithium-Ion Pack', name: 'Lithium-Ion Pack (Laptop/PowerTool)', basePricePerKg: 90, minerals: 'Lithium (Li), Cobalt (Co), Nickel (Ni)' },
      { id: 'Lead-Acid Battery', name: 'Lead-Acid Heavy Battery', basePricePerKg: 75, minerals: 'Lead (Pb)' },
      { id: 'EV Battery Module', name: 'EV Battery Module', basePricePerKg: 130, minerals: 'Lithium (Li), Cobalt (Co), Manganese (Mn)' },
      { id: 'Smartphone Li-Po', name: 'Smartphone Li-Po Cell', basePricePerKg: 110, minerals: 'Cobalt (Co), Lithium (Li)' },
    ],
  },
  {
    id: 'CABLE',
    name: 'Cables & Copper Wires',
    icon: '🧵',
    imageBg: 'from-amber-600 to-amber-900',
    description: 'Heavy copper, aluminum wires, power cords',
    subCategories: [
      { id: 'Copper Heavy Duty', name: 'Copper Heavy Duty Wire (99% Cu)', basePricePerKg: 150, minerals: 'Copper (Cu)' },
      { id: 'Insulated Aluminum Wire', name: 'Insulated Aluminum Wire', basePricePerKg: 65, minerals: 'Aluminum (Al)' },
      { id: 'Power Cord & Appliance Wire', name: 'Power Cord & Appliance Wire', basePricePerKg: 95, minerals: 'Copper (Cu), PVC' },
      { id: 'Ribbon & Data Cable', name: 'Ribbon & Data Cable', basePricePerKg: 80, minerals: 'Copper (Cu), Tin (Sn)' },
    ],
  },
  {
    id: 'LCD_PANEL',
    name: 'LCD & Display Panels',
    icon: '🖥️',
    imageBg: 'from-purple-600 to-slate-900',
    description: 'Monitor screens, TV displays, laptop panels',
    subCategories: [
      { id: 'Monitor Screen', name: 'Monitor & Desktop Screen', basePricePerKg: 110, minerals: 'Indium (In), Glass, Plastics' },
      { id: 'TV Panel Display', name: 'Flat TV Panel Display', basePricePerKg: 85, minerals: 'Indium (In), Aluminum (Al)' },
      { id: 'Laptop Display', name: 'Laptop LED/LCD Panel', basePricePerKg: 130, minerals: 'Indium (In), Gallium (Ga)' },
    ],
  },
  {
    id: 'CRT',
    name: 'CRT Tubes & Glass',
    icon: '📺',
    imageBg: 'from-stone-600 to-stone-900',
    description: 'Legacy CRT televisions & monitor tubes',
    subCategories: [
      { id: 'Television Glass', name: 'CRT Television Glass Assembly', basePricePerKg: 40, minerals: 'Leaded Glass, Copper Yoke' },
      { id: 'Monitor Tube', name: 'CRT Computer Monitor Tube', basePricePerKg: 45, minerals: 'Leaded Glass, Copper (Cu)' },
    ],
  },
  {
    id: 'MOTOR_MAGNET',
    name: 'Motors & Transformers',
    icon: '🧲',
    imageBg: 'from-orange-600 to-amber-950',
    description: 'Stators, compressors, neodymium rotors',
    subCategories: [
      { id: 'Copper Stator', name: 'Copper Wound Stator Motor', basePricePerKg: 70, minerals: 'Copper (Cu), Electrical Steel' },
      { id: 'Neodymium Rotor', name: 'Neodymium Permanent Magnet Motor', basePricePerKg: 180, minerals: 'Neodymium (Nd), Dysprosium (Dy)' },
      { id: 'Compressor Motor', name: 'Fridge/AC Compressor Unit', basePricePerKg: 65, minerals: 'Copper (Cu), Steel' },
    ],
  },
  {
    id: 'MIXED_PLASTIC',
    name: 'E-Waste Plastics',
    icon: '♻️',
    imageBg: 'from-teal-600 to-[#143628]',
    description: 'ABS/PC casings, plastic housings',
    subCategories: [
      { id: 'E-Waste Casing', name: 'ABS/PC Flame Retardant Casing', basePricePerKg: 25, minerals: 'Polycarbonate, ABS' },
      { id: 'PVC Wiring Sleeve', name: 'PVC Wire Insulation Sleeve', basePricePerKg: 18, minerals: 'PVC Polymer' },
    ],
  },
];

export const LotCreationPage: React.FC = () => {
  const navigate = useNavigate();

  // Wizard Step (1: Photo, 2: Material & SubCategory, 3: Condition & Source, 4: Weight & Estimate)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Core State
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string>('PCB');
  const [selectedSubCat, setSelectedSubCat] = useState<string>('Motherboard High Grade');
  const [weightKg, setWeightKg] = useState<number>(2.5);
  const [condition, setCondition] = useState<'intact' | 'damaged' | 'stripped'>('intact');
  const [sourceType, setSourceType] = useState<'household' | 'commercial' | 'mixed_scrap'>('household');
  
  // UI & AI State
  const [aiResult, setAiResult] = useState<ImageClassificationResult | null>(null);
  const [isClassifying, setIsClassifying] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Active Category Group & SubCategory Details
  const activeGroup = CATEGORY_GROUPS.find(g => g.id === selectedCatId) || CATEGORY_GROUPS[0];
  const activeSubItem = activeGroup.subCategories.find(s => s.id === selectedSubCat) || activeGroup.subCategories[0];

  // Pricing Logic
  const CONDITION_MULT: Record<string, number> = { intact: 1.0, damaged: 0.7, stripped: 0.4 };
  const SOURCE_MULT: Record<string, number> = { household: 1.0, commercial: 1.05, mixed_scrap: 0.95 };

  const unitRate = Math.round(activeSubItem.basePricePerKg * CONDITION_MULT[condition] * SOURCE_MULT[sourceType]);
  const estimatedTotal = Math.round(unitRate * weightKg);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setPhotoDataUrl(dataUrl);
      setIsClassifying(true);
      try {
        const res = await classifyImageClient(dataUrl);
        setAiResult(res);
        if (res.category && CATEGORY_GROUPS.some(g => g.id === res.category)) {
          setSelectedCatId(res.category);
          const matchedGrp = CATEGORY_GROUPS.find(g => g.id === res.category);
          if (matchedGrp && matchedGrp.subCategories.length > 0) {
            setSelectedSubCat(matchedGrp.subCategories[0].id);
          }
        }
        if (res.condition) {
          setCondition(res.condition);
        }
      } catch (err) {
        console.warn('AI image classification error:', err);
      } finally {
        setIsClassifying(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLot = async () => {
    setIsSaving(true);
    const clientUuid = `lot-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const nowIso = new Date().toISOString();

    try {
      await db.materials.add({
        lot_id: clientUuid,
        material_category: selectedCatId as any,
        sub_category: selectedSubCat,
        approx_weight_kg: weightKg,
        condition: condition,
        source_type: sourceType,
        estimated_value: estimatedTotal,
        collector_id: 'col-001',
        photo_local_uri: photoDataUrl || undefined,
        created_at: nowIso,
        synced: false,
      } as any);

      await db.transactions.add({
        lot_id: clientUuid,
        collector_id: 'col-001',
        material_category: selectedCatId as any,
        quoted_price: estimatedTotal,
        status: 'created',
        payment_method: 'pending',
        payment_status: 'unpaid',
        created_at: nowIso,
        updated_at: nowIso,
        synced: false,
      } as any);

      await db.syncOutbox.add({
        client_uuid: clientUuid,
        entity_type: 'material',
        action: 'upsert',
        payload: {
          lot_id: clientUuid,
          material_category: selectedCatId,
          sub_category: selectedSubCat,
          approx_weight_kg: weightKg,
          condition,
          source_type: sourceType,
          estimated_value: estimatedTotal,
        },
        created_at: nowIso,
        synced: false,
      });
    } catch (err) {
      console.warn('Local Dexie save error:', err);
    } finally {
      setIsSaving(false);
      navigate(`/match/${clientUuid}`);
    }
  };

  return (
    <div className="pb-24 pt-3 px-4 max-w-md mx-auto min-h-[85vh] flex flex-col justify-between font-sans text-stone-900">
      
      {/* ─── Wizard Header Bar (Step Indicator) ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : navigate(-1)}
              className="p-1.5 rounded-full hover:bg-stone-200 text-stone-700 font-bold transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="font-extrabold text-stone-900 text-base">Create New Lot</h2>
          </div>

          <span className="text-[11px] font-black bg-[#16A34A] text-white px-3 py-1 rounded-full shadow-xs">
            Step {currentStep} of 4
          </span>
        </div>

        {/* Wizard Progress Bar */}
        <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden flex">
          <div className="bg-[#16A34A] h-full transition-all duration-300" style={{ width: `${(currentStep / 4) * 100}%` }} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          STEP 1: Photo Capture & AI Material Classification
      ══════════════════════════════════════════════════════════════ */}
      {currentStep === 1 && (
        <div className="space-y-4 my-auto">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-black text-stone-900">Capture Material Photo</h3>
            <p className="text-xs text-stone-500 font-medium">Take a photo of scrap material for automatic AI identification</p>
          </div>

          <div className="relative rounded-3xl overflow-hidden border border-stone-200 shadow-md h-56 bg-stone-900">
            {photoDataUrl ? (
              <img src={photoDataUrl} alt="Material preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-900 via-stone-900 to-stone-950 flex flex-col items-center justify-center text-white p-4 text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-400 shadow-lg">
                  <Camera size={36} />
                </div>
                <div>
                  <div className="text-sm font-extrabold">Tap button below to capture photo</div>
                  <div className="text-[11px] text-emerald-300/80 font-medium">Camera / Image file</div>
                </div>
              </div>
            )}

            <label className="absolute bottom-4 left-4 right-4 bg-[#16A34A] hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all">
              <Camera size={16} />
              <span>{photoDataUrl ? 'Retake Material Photo' : 'Capture Photo Now'}</span>
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
            </label>

            {isClassifying && (
              <div className="absolute top-3 left-3 right-3 bg-emerald-950/90 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-xs font-bold px-4 py-2 rounded-2xl flex items-center gap-2 animate-pulse shadow-lg">
                <RefreshCw size={14} className="animate-spin text-emerald-400" />
                <span>AI analyzing material image...</span>
              </div>
            )}
          </div>

          {/* AI Suggestion Box */}
          {aiResult && (
            <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <Sparkles size={18} className="text-[#16A34A] shrink-0" />
                <div>
                  <div className="text-[10px] font-extrabold text-emerald-800 uppercase">AI Smart Suggestion</div>
                  <div className="text-xs font-black text-stone-900">{activeGroup.name} ({activeSubItem.name})</div>
                </div>
              </div>
              <span className="text-[10px] font-black bg-emerald-200 text-emerald-900 px-2.5 py-1 rounded-full">
                {Math.round((aiResult.confidence || 0.85) * 100)}% Match
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white font-extrabold py-4 rounded-2xl shadow-md text-sm transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
          >
            <span>Next: Select Category →</span>
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STEP 2: Category & Sub-Category Selection (Visual Cards)
      ══════════════════════════════════════════════════════════════ */}
      {currentStep === 2 && (
        <div className="space-y-4 my-auto">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-black text-stone-900">Select Material Category</h3>
            <p className="text-xs text-stone-500 font-medium">Choose material type & sub-category</p>
          </div>

          {/* Category Visual Grid */}
          <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {CATEGORY_GROUPS.map((grp) => {
              const isSelected = selectedCatId === grp.id;
              return (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => {
                    setSelectedCatId(grp.id);
                    setSelectedSubCat(grp.subCategories[0].id);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-gradient-to-br ' + grp.imageBg + ' text-white shadow-md border-transparent ring-2 ring-emerald-500'
                      : 'bg-white border-stone-200 text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{grp.icon}</span>
                    {isSelected && <Check size={16} className="text-white" />}
                  </div>
                  <div className="font-extrabold text-xs mt-1.5 truncate">{grp.name}</div>
                  <div className={`text-[10px] font-semibold truncate ${isSelected ? 'text-white/80' : 'text-stone-400'}`}>
                    ₹{grp.subCategories[0].basePricePerKg}/kg
                  </div>
                </button>
              );
            })}
          </div>

          {/* Sub-Category Options for Selected Category */}
          <div className="space-y-2 bg-stone-50 p-3 rounded-2xl border border-stone-200">
            <label className="block text-xs font-extrabold text-stone-900">
              Sub-Category ({activeGroup.name})
            </label>

            <div className="space-y-1.5">
              {activeGroup.subCategories.map((sub) => {
                const isSubSel = selectedSubCat === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubCat(sub.id)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                      isSubSel
                        ? 'bg-[#16A34A] text-white border-emerald-600 shadow-xs'
                        : 'bg-white border-stone-200 text-stone-800 hover:bg-stone-100'
                    }`}
                  >
                    <span className="truncate">{sub.name}</span>
                    <span className={`font-mono text-xs ${isSubSel ? 'text-white' : 'text-[#16A34A]'}`}>
                      ₹{sub.basePricePerKg}/kg
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wizard Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="py-3.5 px-5 rounded-2xl border border-stone-300 text-stone-700 font-extrabold text-xs"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="flex-1 bg-stone-900 hover:bg-stone-800 text-white font-extrabold py-3.5 rounded-2xl shadow-md text-xs transition-all active:scale-95 flex items-center justify-center gap-1"
            >
              <span>Next: Condition →</span>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STEP 3: Physical Condition & Source Type
      ══════════════════════════════════════════════════════════════ */}
      {currentStep === 3 && (
        <div className="space-y-4 my-auto">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-black text-stone-900">Condition & Source Type</h3>
            <p className="text-xs text-stone-500 font-medium">Select physical state & source origin of scrap</p>
          </div>

          {/* Physical Condition Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-stone-900">Physical Condition</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'intact', label: 'Intact (अखण्ड)', mult: '100% Rate' },
                { id: 'damaged', label: 'Damaged (खराब)', mult: '70% Rate' },
                { id: 'stripped', label: 'Stripped (सोललेला)', mult: '40% Rate' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCondition(c.id as any)}
                  className={`p-3 rounded-2xl text-center transition-all ${
                    condition === c.id
                      ? 'bg-[#16A34A] text-white shadow-md border border-emerald-600'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div className="text-xs font-black">{c.label.split(' ')[0]}</div>
                  <div className={`text-[10px] font-semibold ${condition === c.id ? 'text-emerald-100' : 'text-stone-400'}`}>
                    {c.mult}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Source Type Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-stone-900">Source Origin</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'household', label: 'Household', sub: 'घरगुती' },
                { id: 'commercial', label: 'Commercial', sub: 'व्यावसायिक' },
                { id: 'mixed_scrap', label: 'Mixed Scrap', sub: 'मिश्र स्क्रॅप' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSourceType(s.id as any)}
                  className={`p-3 rounded-2xl text-center transition-all ${
                    sourceType === s.id
                      ? 'bg-stone-900 text-white shadow-md border border-stone-900'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div className="text-xs font-black">{s.label}</div>
                  <div className={`text-[10px] font-semibold ${sourceType === s.id ? 'text-stone-300' : 'text-stone-400'}`}>
                    {s.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Wizard Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="py-3.5 px-5 rounded-2xl border border-stone-300 text-stone-700 font-extrabold text-xs"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="flex-1 bg-stone-900 hover:bg-stone-800 text-white font-extrabold py-3.5 rounded-2xl shadow-md text-xs transition-all active:scale-95 flex items-center justify-center gap-1"
            >
              <span>Next: Weight & Value →</span>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STEP 4: Weight Entry & Fair Price Valuation
      ══════════════════════════════════════════════════════════════ */}
      {currentStep === 4 && (
        <div className="space-y-4 my-auto">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-black text-stone-900">Weight & Fair Price Estimate</h3>
            <p className="text-xs text-stone-500 font-medium">Enter approximate weight & review valuation breakdown</p>
          </div>

          {/* Weight Input + Preset Chips */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-stone-900">Approximate Weight (kg)</label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(parseFloat(e.target.value) || 1.0)}
                className="w-full text-2xl font-black p-3.5 rounded-2xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A] shadow-xs"
              />
              <span className="absolute right-4 top-4 text-xs font-black text-stone-400 uppercase">kg</span>
            </div>

            <div className="flex gap-2">
              {[1, 2.5, 5, 10, 25].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWeightKg(w)}
                  className={`flex-1 py-2 rounded-xl text-xs font-extrabold border transition-colors ${
                    weightKg === w
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {w} kg
                </button>
              ))}
            </div>
          </div>

          {/* Fair Valuation Summary Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 rounded-3xl p-4 border border-emerald-200 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-stone-600 border-b border-emerald-200/60 pb-2">
              <span>Sub-Category Rate</span>
              <span className="font-extrabold text-stone-900">₹{activeSubItem.basePricePerKg}/kg</span>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-stone-600 border-b border-emerald-200/60 pb-2">
              <span>Condition Adjusted Rate ({condition})</span>
              <span className="font-extrabold text-stone-900">₹{unitRate}/kg</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="text-[10px] font-black text-stone-500 uppercase">Estimated Total Value</div>
                <div className="text-2xl font-black text-[#16A34A]">₹{estimatedTotal.toLocaleString('en-IN')}</div>
              </div>

              <span className="text-[10px] font-bold bg-white text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
                Fair Market Index
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="py-3.5 px-5 rounded-2xl border border-stone-300 text-stone-700 font-extrabold text-xs"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSaveLot}
              disabled={isSaving}
              className="flex-1 bg-[#16A34A] hover:bg-emerald-700 text-white font-extrabold py-4 rounded-2xl shadow-lg text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Saving Lot...</span>
                </>
              ) : (
                <span>Save Lot & Match Recyclers →</span>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};


