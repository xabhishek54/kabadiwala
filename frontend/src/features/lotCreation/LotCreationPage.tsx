import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import { db } from '../../data/local/db';
import { classifyImageClient } from '../../utils/mlClassifier';
import {
  Plus, Trash2, ArrowLeft, Sparkles, RefreshCw,
  ChevronDown, ImagePlus, CheckCircle2, AlertCircle, Package
} from 'lucide-react';

/* ─── Category & Sub-Category Data ─── */
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

/* ─── Types ─── */
export type ConditionType = 'intact' | 'damaged' | 'stripped';
export type SourceType = 'household' | 'commercial' | 'mixed_scrap';

export interface DetectedItem {
  id: string;
  photoIndex: number;          // which uploaded photo this came from (0-based)
  categoryId: string;
  subCategoryId: string;
  condition: ConditionType;
  weightKg: number;
  aiConfidence: number;
  isManual?: boolean;          // user added manually
}

/* ─── Helpers ─── */
const CONDITION_MULT: Record<ConditionType, number> = { intact: 1.0, damaged: 0.7, stripped: 0.4 };

function getSubItem(catId: string, subId: string): SubCategoryItem {
  const grp = CATEGORY_GROUPS.find(g => g.id === catId) ?? CATEGORY_GROUPS[0];
  return grp.subCategories.find(s => s.id === subId) ?? grp.subCategories[0];
}

function calcItemValue(item: DetectedItem): number {
  const sub = getSubItem(item.categoryId, item.subCategoryId);
  return Math.round(sub.basePricePerKg * CONDITION_MULT[item.condition] * item.weightKg);
}

function newItem(
  photoIndex: number,
  catId: string,
  subCategoryHint: string | undefined,
  cond: ConditionType,
  conf: number,
): DetectedItem {
  const grp = CATEGORY_GROUPS.find(g => g.id === catId) ?? CATEGORY_GROUPS[0];
  // Try to match the hint; fall back to first sub-category of the group
  const resolvedSubId =
    grp.subCategories.find(s => s.id === subCategoryHint)?.id ??
    grp.subCategories[0].id;
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    photoIndex,
    categoryId: catId,
    subCategoryId: resolvedSubId,
    condition: cond,
    weightKg: 2.0,
    aiConfidence: conf,
  };
}

/* ─── Main Component ─── */
export const LotCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step: 1=Photos, 2=Review Items, 3=Summary & Save
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Photos uploaded (max 5)
  const [photos, setPhotos] = useState<string[]>([]);
  const [sourceType, setSourceType] = useState<SourceType>('household');

  // AI scan state
  const [isScanningAll, setIsScanningAll] = useState(false);
  const [scanProgress, setScanProgress] = useState(0); // 0–100

  // Detected items list (editable)
  const [items, setItems] = useState<DetectedItem[]>([]);

  // Expanded accordion item id
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Locale helper
  const lang = (typeof window !== 'undefined' && localStorage.getItem('kabadiwala_lang')) || 'en';
  const isEn = lang !== 'hi' && lang !== 'mr';

  // ─── Totals ───
  const totalWeight = items.reduce((s, i) => s + i.weightKg, 0);
  const totalValue = items.reduce((s, i) => s + calcItemValue(i), 0);

  /* ─── Photo Handlers ─── */
  const handlePhotosSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = 5 - photos.length;
    const toProcess = files.slice(0, remaining);

    const newUrls: string[] = await Promise.all(
      toProcess.map(
        f =>
          new Promise<string>(res => {
            const reader = new FileReader();
            reader.onload = ev => res(ev.target!.result as string);
            reader.readAsDataURL(f);
          }),
      ),
    );

    setPhotos(prev => [...prev, ...newUrls]);
    // Reset file input so same file can be re-added
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
    // Remove items that were detected from this photo; re-index the rest
    setItems(prev =>
      prev
        .filter(it => it.photoIndex !== idx)
        .map(it => ({
          ...it,
          photoIndex: it.photoIndex > idx ? it.photoIndex - 1 : it.photoIndex,
        })),
    );
  };

  /* ─── AI Scan All Photos — one photo can yield multiple items ─── */
  const runAIScanAll = async () => {
    if (photos.length === 0) return;
    setIsScanningAll(true);
    setScanProgress(0);

    const detected: DetectedItem[] = [];

    for (let i = 0; i < photos.length; i++) {
      try {
        // classifyImageClient now returns an ARRAY — one entry per material type detected
        const results = await classifyImageClient(photos[i]);
        for (const res of results) {
          detected.push(
            newItem(
              i,
              res.category ?? 'PCB',
              res.subCategoryHint,
              res.condition ?? 'intact',
              res.confidence ?? 0.7,
            ),
          );
        }
      } catch {
        detected.push(newItem(i, 'PCB', undefined, 'intact', 0.55));
      }
      setScanProgress(Math.round(((i + 1) / photos.length) * 100));
    }

    setItems(prev => {
      // Keep existing manual items; replace all AI-detected ones
      const manualItems = prev.filter(it => it.isManual);
      return [...detected, ...manualItems];
    });

    setIsScanningAll(false);
    setStep(2);
  };

  /* ─── Item List Mutation Helpers ─── */
  const updateItem = (id: string, patch: Partial<DetectedItem>) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id !== id) return it;
        const updated = { ...it, ...patch };
        // If category changed, reset subCategory to first of new category
        if (patch.categoryId && patch.categoryId !== it.categoryId) {
          const grp = CATEGORY_GROUPS.find(g => g.id === patch.categoryId) ?? CATEGORY_GROUPS[0];
          updated.subCategoryId = grp.subCategories[0].id;
        }
        return updated;
      }),
    );
  };

  const adjustWeight = (id: string, currentWeight: number, change: number) => {
    const nextWeight = Math.max(0.1, Math.round((currentWeight + change) * 10) / 10);
    updateItem(id, { weightKg: nextWeight });
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const addManualItem = () => {
    const manual: DetectedItem = {
      ...newItem(0, 'PCB', 'Low Grade Consumer PCB', 'intact', 1.0),
      isManual: true,
    };
    setItems(prev => [...prev, manual]);
    setExpandedId(manual.id);
  };

  const handleSaveLot = async (shouldMatchRecycler: boolean = true) => {
    if (items.length === 0) return;
    setIsSaving(true);

    const clientUuid = `lot-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const nowIso = new Date().toISOString();
    const userStr = localStorage.getItem('kabadiwala_user');
    const userObj = userStr ? JSON.parse(userStr) : null;
    const collectorId = userObj?.id ?? 'col-demo-101';
    // shouldMatchImmediately mirrors the param: navigate to match page right away
    const shouldMatchImmediately = shouldMatchRecycler;

    // Best-effort GPS capture at collection time (non-blocking)
    let collectionLat: number | undefined;
    let collectionLng: number | undefined;
    let collectionAddress: string | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000, maximumAge: 60000 })
      );
      collectionLat = pos.coords.latitude;
      collectionLng = pos.coords.longitude;
      const { reverseGeocode } = await import('../../utils/geoUtils');
      collectionAddress = await reverseGeocode(collectionLat, collectionLng);
    } catch {
      // GPS unavailable or denied — continue without it
    }

    // Dominant category = the one with highest total estimated value
    const categoryTotals: Record<string, number> = {};
    for (const item of items) {
      categoryTotals[item.categoryId] = (categoryTotals[item.categoryId] ?? 0) + calcItemValue(item);
    }
    const dominantCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'PCB';

    // Build a human-readable description from all line items
    const description = items.map(i => `${i.subCategoryId} (${i.weightKg}kg, ${i.condition})`).join('; ');

    try {
      await db.materials.add({
        lot_id: clientUuid,
        material_category: dominantCategory as any,
        sub_category: items.map(i => i.subCategoryId).join(', '),
        description,
        approx_weight_kg: totalWeight,
        condition: items[0].condition,
        source_type: sourceType,
        estimated_value: totalValue,
        collector_id: collectorId,
        collection_lat: collectionLat,
        collection_lng: collectionLng,
        collection_address: collectionAddress,
        image_ref: photos[0] ?? undefined,
        created_at: nowIso,
      } as any);

      await db.transactions.add({
        lot_id: clientUuid,
        collector_id: collectorId,
        quoted_price: totalValue,
        status: 'draft',
        payment_method: 'pending',
        payment_status: 'unpaid',
        collection_lat: collectionLat,
        collection_lng: collectionLng,
        collection_address: collectionAddress,
        created_at: nowIso,
        updated_at: nowIso,
      } as any);

      await db.syncOutbox.add({
        client_uuid: clientUuid,
        entity_type: 'material',
        action: 'upsert',
        payload: {
          lot_id: clientUuid,
          material_category: dominantCategory,
          sub_category: items.map(i => i.subCategoryId).join(', '),
          description,
          approx_weight_kg: totalWeight,
          condition: items[0].condition,
          source_type: sourceType,
          estimated_value: totalValue,
          collector_id: collectorId,
          collection_lat: collectionLat,
          collection_lng: collectionLng,
          line_items: items.map(i => ({
            sub_category: i.subCategoryId,
            category: i.categoryId,
            condition: i.condition,
            weight_kg: i.weightKg,
            value: calcItemValue(i),
          })),
        },
        created_at: nowIso,
        synced: false,
      });
      navigate(shouldMatchImmediately ? `/match/${clientUuid}` : '/ledger');
    } catch (err) {
      console.error('Local lot save failed:', err);
      setSaveError(isEn ? 'We could not save this lot. Your data has not been submitted; please try again.' : 'लॉट सेव नहीं हुआ। डेटा नहीं भेजा गया है; कृपया फिर कोशिश करें।');
    } finally {
      setIsSaving(false);
      if (shouldMatchRecycler) {
        navigate(`/match/${clientUuid}`);
      } else {
        navigate('/lots');
      }
    }
  };

  /* ─── Step Labels ─── */
  const STEP_LABELS = ['Photos', 'Review Items', 'Summary'];

  /* ════════════════════════════════════════ RENDER ════════════════════════════════════════ */
  return (
    <div className="pb-28 pt-3 px-4 max-w-md mx-auto min-h-screen flex flex-col gap-4 font-sans text-stone-900 bg-[#F8F6F0]">

      {/* ─── Header ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => step > 1 ? setStep((step - 1) as 1 | 2 | 3) : navigate(-1)}
              className="p-1.5 rounded-full hover:bg-stone-200 text-stone-700 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="font-extrabold text-stone-900 text-base">Create New Lot</h2>
          </div>
          <span className="text-[11px] font-black bg-[#16A34A] text-white px-3 py-1 rounded-full">
            Step {step} of 3
          </span>
        </div>

        {/* Step Progress Bar */}
        <div className="flex gap-1">
          {STEP_LABELS.map((label, idx) => (
            <div key={label} className="flex-1 space-y-0.5">
              <div className={`h-1.5 rounded-full transition-all duration-300 ${idx < step ? 'bg-[#16A34A]' : 'bg-stone-200'}`} />
              <div className={`text-[9px] font-black text-center ${idx < step ? 'text-[#16A34A]' : 'text-stone-400'}`}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          STEP 1 — Upload Photos
      ════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="flex flex-col gap-4 flex-1">
          <div className="text-center space-y-0.5">
            <h3 className="text-lg font-black text-stone-900">Upload Material Photos</h3>
            <p className="text-xs text-stone-500">Upload up to 5 photos — AI will identify all items automatically</p>
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-3 gap-2">
            {photos.map((url, idx) => (
              <div key={idx} className="relative rounded-2xl overflow-hidden aspect-square border border-stone-200 shadow-sm">
                <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 bg-stone-900/80 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
                <div className="absolute bottom-1 left-1 bg-stone-900/70 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  #{idx + 1}
                </div>
              </div>
            ))}

            {/* Add Photo Tile */}
            {photos.length < 5 && (
              <label className="aspect-square rounded-2xl border-2 border-dashed border-stone-300 hover:border-[#16A34A] bg-white hover:bg-emerald-50 flex flex-col items-center justify-center cursor-pointer transition-all gap-1 group">
                <ImagePlus size={22} className="text-stone-400 group-hover:text-[#16A34A] transition-colors" />
                <span className="text-[10px] font-bold text-stone-400 group-hover:text-[#16A34A] transition-colors text-center">
                  {photos.length === 0 ? 'Add Photo' : 'Add More'}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotosSelected}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Photo count hint */}
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>{photos.length}/5 photos added</span>
            {photos.length > 0 && (
              <span className="text-[#16A34A] font-bold">AI will scan all photos at once</span>
            )}
          </div>

          {/* Source Type Row */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-stone-900">Source Origin</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'household', label: 'Household', sub: 'घरगुती' },
                { id: 'commercial', label: 'Commercial', sub: 'व्यावसायिक' },
                { id: 'mixed_scrap', label: 'Mixed Scrap', sub: 'मिश्र स्क्रॅप' },
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSourceType(s.id as SourceType)}
                  className={`p-3 rounded-2xl text-center transition-all border ${
                    sourceType === s.id
                      ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
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

          {/* Scan CTA */}
          <button
            type="button"
            onClick={runAIScanAll}
            disabled={photos.length === 0 || isScanningAll}
            className="w-full bg-[#16A34A] hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold py-4 rounded-2xl shadow-md text-sm transition-all active:scale-95 flex items-center justify-center gap-2 mt-auto"
          >
            {isScanningAll ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>AI Scanning… {scanProgress}%</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>{photos.length === 0 ? 'Add photos first' : `Scan ${photos.length} Photo${photos.length > 1 ? 's' : ''} with AI →`}</span>
              </>
            )}
          </button>

          {/* Skip to manual */}
          <button
            type="button"
            onClick={() => { setItems([]); setStep(2); }}
            className="text-xs text-stone-400 hover:text-stone-700 font-bold text-center transition-colors"
          >
            Skip AI scan — add items manually
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          STEP 2 — Review / Edit Detected Items
      ════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-stone-900">Detected Items</h3>
              <p className="text-[11px] text-stone-500">Review, edit subcategory & condition — delete false positives</p>
            </div>
            <span className="text-xs font-black bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full border border-stone-200">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Empty State */}
          {items.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-10">
              <Package size={48} className="text-stone-300" />
              <div>
                <div className="text-sm font-bold text-stone-500">No items yet</div>
                <div className="text-xs text-stone-400">Tap "Add Item" to add materials manually</div>
              </div>
            </div>
          )}

          {/* Items Accordion List */}
          <div className="space-y-2 overflow-y-auto max-h-[58vh] pr-0.5">
            {items.map((item) => {
              const grp = CATEGORY_GROUPS.find(g => g.id === item.categoryId) ?? CATEGORY_GROUPS[0];
              const sub = grp.subCategories.find(s => s.id === item.subCategoryId) ?? grp.subCategories[0];
              const itemValue = calcItemValue(item);
              const isExpanded = expandedId === item.id;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isExpanded ? 'border-[#16A34A] shadow-md' : 'border-stone-200 bg-white shadow-sm'
                  }`}
                >
                  {/* ─── Collapsed Header Row ─── */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="w-full flex items-center gap-3 p-3 text-left"
                  >
                    {/* Photo thumb or category icon */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 bg-gradient-to-br ${grp.imageBg}`}>
                      {grp.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-stone-900 truncate">{sub.name}</span>
                        {!item.isManual && (
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${
                            item.aiConfidence >= 0.85
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            AI {Math.round(item.aiConfidence * 100)}%
                          </span>
                        )}
                        {item.isManual && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 bg-stone-100 text-stone-600">
                            Manual
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500 font-semibold">
                        {item.condition} · {item.weightKg} kg · <span className="text-[#16A34A] font-black">₹{itemValue.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <ChevronDown
                        size={16}
                        className={`text-stone-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>

                  {/* Compact per-item controls */}
                  <div className="px-3 pb-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-1.5 items-center">
                    <label className="relative min-w-0">
                      <span className="sr-only">Category</span>
                      <select
                        value={item.categoryId}
                        onChange={e => updateItem(item.id, { categoryId: e.target.value })}
                        className="w-full appearance-none bg-stone-50 border border-stone-200 rounded-lg px-2 py-2 text-[10px] font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#16A34A] truncate"
                      >
                        {CATEGORY_GROUPS.map(group => <option key={group.id} value={group.id}>{group.icon} {group.name.split(' ')[0]}</option>)}
                      </select>
                    </label>
                    <label className="relative min-w-0">
                      <span className="sr-only">Sub-category</span>
                      <select
                        value={item.subCategoryId}
                        onChange={e => updateItem(item.id, { subCategoryId: e.target.value })}
                        className="w-full appearance-none bg-stone-50 border border-stone-200 rounded-lg px-2 py-2 text-[10px] font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#16A34A] truncate"
                      >
                        {grp.subCategories.map(subCategory => <option key={subCategory.id} value={subCategory.id}>{subCategory.name}</option>)}
                      </select>
                    </label>
                    <div className="flex items-center rounded-lg border border-stone-200 bg-stone-50 overflow-hidden shrink-0">
                      <button type="button" onClick={() => adjustWeight(item.id, item.weightKg, -0.5)} className="w-7 h-8 text-sm font-black text-stone-600 hover:bg-stone-200 cursor-pointer" aria-label={`Decrease ${sub.name} weight`}>−</button>
                      <span className="min-w-12 text-center text-[10px] font-black text-stone-900">{item.weightKg} kg</span>
                      <button type="button" onClick={() => adjustWeight(item.id, item.weightKg, 0.5)} className="w-7 h-8 text-sm font-black text-stone-600 hover:bg-stone-200 cursor-pointer" aria-label={`Increase ${sub.name} weight`}>+</button>
                    </div>
                  </div>

                  {/* ─── Expanded Edit Panel ─── */}
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3 border-t border-stone-100 pt-3 bg-stone-50">

                      {/* Condition chips */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-stone-600 uppercase">Condition</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {([
                            { id: 'intact', label: 'Intact', pct: '100%' },
                            { id: 'damaged', label: 'Damaged', pct: '70%' },
                            { id: 'stripped', label: 'Stripped', pct: '40%' },
                          ] as const).map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => updateItem(item.id, { condition: c.id })}
                              className={`py-2 rounded-xl text-center text-xs font-bold border transition-all ${
                                item.condition === c.id
                                  ? 'bg-[#16A34A] text-white border-emerald-600'
                                  : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                              }`}
                            >
                              <div className="font-extrabold">{c.label}</div>
                              <div className={`text-[10px] ${item.condition === c.id ? 'text-emerald-100' : 'text-stone-400'}`}>{c.pct}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Weight input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-stone-600 uppercase">Weight (kg)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={item.weightKg}
                            onChange={e => updateItem(item.id, { weightKg: parseFloat(e.target.value) || 0.5 })}
                            className="flex-1 text-sm font-black p-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                          />
                          <span className="text-xs font-black text-stone-500">kg</span>
                        </div>
                        {/* Quick weight chips */}
                        <div className="flex gap-1.5 flex-wrap">
                          {[0.5, 1, 2, 5, 10].map(w => (
                            <button
                              key={w}
                              type="button"
                              onClick={() => updateItem(item.id, { weightKg: w })}
                              className={`py-1 px-2.5 rounded-lg text-[10px] font-extrabold border transition-all ${
                                item.weightKg === w
                                  ? 'bg-stone-900 text-white border-stone-900'
                                  : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                              }`}
                            >
                              {w} kg
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Item value preview */}
                      <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-3 py-2 border border-emerald-200">
                        <span className="text-[11px] font-bold text-stone-600">Item Estimated Value</span>
                        <span className="text-sm font-black text-[#16A34A]">₹{itemValue.toLocaleString('en-IN')}</span>
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 text-xs font-extrabold flex items-center justify-center gap-1.5 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                        Remove This Item
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Manual Item */}
          <button
            type="button"
            onClick={addManualItem}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-stone-300 hover:border-[#16A34A] text-stone-500 hover:text-[#16A34A] text-xs font-extrabold flex items-center justify-center gap-2 transition-all hover:bg-emerald-50"
          >
            <Plus size={16} />
            Add Item Manually
          </button>

          {/* Navigation */}
          <div className="flex gap-2 mt-auto pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="py-3.5 px-5 rounded-2xl border border-stone-300 text-stone-700 font-extrabold text-xs"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={items.length === 0}
              className="flex-1 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white font-extrabold py-3.5 rounded-2xl shadow-md text-xs transition-all active:scale-95 flex items-center justify-center gap-1"
            >
              Review & Save ({items.length} item{items.length !== 1 ? 's' : ''}) →
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          STEP 3 — Summary & Save
      ════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="flex flex-col gap-4 flex-1">
          <div className="text-center space-y-0.5">
            <h3 className="text-base font-black text-stone-900">Lot Summary</h3>
            <p className="text-xs text-stone-500">Review your entire lot before saving</p>
          </div>

          {/* Lot Overview Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-3xl p-4 border border-emerald-200 space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-stone-600 pb-2 border-b border-emerald-200/60">
              <span>Total Items</span>
              <span className="font-extrabold text-stone-900">{items.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-stone-600 pb-2 border-b border-emerald-200/60">
              <span>Total Weight</span>
              <span className="font-extrabold text-stone-900">{totalWeight.toFixed(1)} kg</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-stone-600 pb-2 border-b border-emerald-200/60">
              <span>Photos</span>
              <span className="font-extrabold text-stone-900">{photos.length}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="text-[10px] font-black text-stone-500 uppercase">Total Estimated Value</div>
                <div className="text-3xl font-black text-[#16A34A]">₹{totalValue.toLocaleString('en-IN')}</div>
              </div>
              <span className="text-[10px] font-bold bg-white text-emerald-800 px-3 py-1.5 rounded-full border border-emerald-200">
                Fair Market Index
              </span>
            </div>
          </div>

          {/* Per-Item Compact List */}
          <div className="space-y-1.5 max-h-44 overflow-y-auto">
            {items.map((item) => {
              const grp = CATEGORY_GROUPS.find(g => g.id === item.categoryId) ?? CATEGORY_GROUPS[0];
              const sub = grp.subCategories.find(s => s.id === item.subCategoryId) ?? grp.subCategories[0];
              return (
                <div key={item.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-stone-100">
                  <span className="text-base">{grp.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-stone-900 truncate">{sub.name}</div>
                    <div className="text-[10px] text-stone-400 font-semibold">{item.condition} · {item.weightKg} kg</div>
                  </div>
                  <div className="text-xs font-black text-[#16A34A] shrink-0">
                    ₹{calcItemValue(item).toLocaleString('en-IN')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl p-3">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 font-semibold leading-relaxed">
              This is an estimated value based on current market rates. Final price is confirmed by the recycler during handover.
            </p>
          </div>

          {/* Save CTA Options */}
          <div className="flex flex-col sm:flex-row gap-2.5 mt-auto pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="py-3.5 px-4 rounded-2xl border border-stone-300 text-stone-700 font-extrabold text-xs cursor-pointer hover:bg-stone-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => handleSaveLot(false)}
              disabled={isSaving || items.length === 0}
              className="flex-1 bg-stone-900 hover:bg-stone-800 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-sm text-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={16} />
              <span>Save Lot Only</span>
            </button>
            <button
              type="button"
              onClick={() => handleSaveLot(true)}
              disabled={isSaving || items.length === 0}
              className="flex-1 bg-[#16A34A] hover:bg-emerald-700 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-md text-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Saving Lot…</span>
                </>
              ) : (
                <>
                  <span>Save & Match Recyclers →</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
