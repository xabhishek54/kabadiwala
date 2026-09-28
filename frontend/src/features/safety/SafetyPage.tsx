import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/local/db';
import { AudioButton } from '../../components/AudioButton';
import {
  ShieldAlert, Flame, Zap, EyeOff, FlaskConical, Wind, HardHat,
  CheckCircle2, AlertTriangle, PhoneCall, ChevronDown, ChevronUp, ShieldCheck, HeartPulse, History, Clock
} from 'lucide-react';

interface SafetyCheckItem {
  id: string;
  label: string;
  category: 'gear' | 'facility';
}

export const SafetyPage: React.FC = () => {
  const { t } = useTranslation();

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    gloves: true,
    boots: true,
    goggles: true,
    mask: false,
    box: true,
    ventilation: true,
  });

  const [activeTab, setActiveTab] = useState<'cards' | 'checklist' | 'emergency' | 'history'>('history');
  const [expandedDos, setExpandedDos] = useState<boolean>(true);

  // Live query for Safety History log from Dexie
  const safetyLogs = useLiveQuery(() => db.safetyHistory.orderBy('timestamp').reverse().toArray(), []);

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const checklist: SafetyCheckItem[] = [
    { id: 'gloves', label: 'Heavy-Duty Cut-Resistant Gloves', category: 'gear' },
    { id: 'goggles', label: 'Impact-Resistant Safety Eyewear', category: 'gear' },
    { id: 'boots', label: 'Steel-Toe Anti-Puncture Footwear', category: 'gear' },
    { id: 'mask', label: 'N95 / Fume Respirator Mask', category: 'gear' },
    { id: 'box', label: 'Dedicated Non-Combustible Battery Container', category: 'facility' },
    { id: 'ventilation', label: 'Well-Ventilated Material Storage Area', category: 'facility' },
  ];

  const readyCount = Object.values(checkedItems).filter(Boolean).length;
  const readyPercent = Math.round((readyCount / checklist.length) * 100);

  const safetyCards = [
    {
      id: 'battery',
      icon: <Zap className="text-amber-600" size={24} />,
      title: t('safety.batteryTitle'),
      text: t('safety.batteryTip'),
      bg: 'bg-amber-50/90 border-amber-200',
      badge: t('safety.batteryBadge'),
      badgeColor: 'bg-amber-100 text-amber-800 border border-amber-200',
      doText: 'Tape terminals with electrical tape and store in cool, dry plastic bins.',
      dontText: 'Never puncture, crush, throw, or incinerate lithium cells.',
    },
    {
      id: 'crt',
      icon: <EyeOff className="text-rose-600" size={24} />,
      title: t('safety.crtTitle'),
      text: t('safety.crtTip'),
      bg: 'bg-rose-50/90 border-rose-200',
      badge: t('safety.crtBadge'),
      badgeColor: 'bg-rose-100 text-rose-800 border border-rose-200',
      doText: 'Keep intact. Handle cathode ray tubes with face shield and gloves.',
      dontText: 'Do not break vacuum tubes or expose phosphor powder coating.',
    },
    {
      id: 'cable',
      icon: <Flame className="text-orange-600" size={24} />,
      title: t('safety.cableTitle'),
      text: t('safety.cableTip'),
      bg: 'bg-orange-50/90 border-orange-200',
      badge: t('safety.cableBadge'),
      badgeColor: 'bg-orange-100 text-orange-800 border border-orange-200',
      doText: 'Use mechanical wire strippers or cable granulators.',
      dontText: 'NEVER burn PVC coated copper wires. Releases carcinogens & dioxins.',
    },
    {
      id: 'acid',
      icon: <FlaskConical className="text-red-600" size={24} />,
      title: t('safety.acidTitle'),
      text: t('safety.acidTip'),
      bg: 'bg-red-50/90 border-red-200',
      badge: t('safety.acidBadge'),
      badgeColor: 'bg-red-100 text-red-800 border border-red-200',
      doText: 'Neutralize small acid leaks with baking soda (sodium bicarbonate).',
      dontText: 'Do not tilt lead-acid batteries or touch leaking electrolyte with bare hands.',
    },
    {
      id: 'smoke',
      icon: <Wind className="text-purple-600" size={24} />,
      title: t('safety.smokeTitle'),
      text: t('safety.smokeTip'),
      bg: 'bg-purple-50/90 border-purple-200',
      badge: t('safety.smokeBadge'),
      badgeColor: 'bg-purple-100 text-purple-800 border border-purple-200',
      doText: 'Operate in open air with active exhaust fans.',
      dontText: 'Avoid dismantling circuit boards in closed rooms without air filtration.',
    },
    {
      id: 'ppe',
      icon: <HardHat className="text-emerald-600" size={24} />,
      title: t('safety.ppeTitle'),
      text: t('safety.ppeTip'),
      bg: 'bg-emerald-50/90 border-emerald-200',
      badge: t('safety.ppeBadge'),
      badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      doText: 'Wear full protective gear during every collection and sorting run.',
      dontText: 'Do not handle raw circuit boards or battery packs without safety gloves.',
    },
  ];

  return (
    <div className="pb-24 pt-4 px-4 max-w-md sm:max-w-3xl md:max-w-5xl mx-auto space-y-4 font-sans text-stone-900">

      {/* Compact Header */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs flex flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-stone-900 tracking-tight">{t('safety.title')}</h1>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                MPCB Standard
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium mt-0.5 line-clamp-1">{t('safety.subtitle')}</p>
          </div>
        </div>

        <a
          href="tel:108"
          className="tap-target px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer shrink-0"
        >
          <PhoneCall size={14} />
          <span className="hidden sm:inline">Emergency 108</span>
          <span className="sm:hidden">108</span>
        </a>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-2xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'history' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <History size={14} className="text-amber-600" />
          <span>Safety History</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cards')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'cards' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Guidelines
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('checklist')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'checklist' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <span>PPE Checklist</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${readyPercent === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {readyCount}/{checklist.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('emergency')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'emergency' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          First-Aid
        </button>
      </div>

      {/* Tab 0: Collector Safety History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-stone-900 flex items-center gap-2">
                  <History size={18} className="text-amber-600" />
                  <span>Safety Handling Timeline</span>
                </h2>
                <p className="text-xs text-stone-500 font-medium">Automatic log of identified hazardous scrap items & prescribed handling methods</p>
              </div>
              <span className="text-[10px] font-bold bg-stone-100 text-stone-700 px-2 py-1 rounded-lg">
                {safetyLogs?.length || 0} items logged
              </span>
            </div>

            {(!safetyLogs || safetyLogs.length === 0) ? (
              <div className="text-center py-8 bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-2">
                <ShieldCheck size={36} className="mx-auto text-stone-300" />
                <p className="text-xs font-bold text-stone-600">No hazardous items recorded yet</p>
                <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                  When hazardous materials like Lithium Batteries or CRT Glass are tagged in collections, they will automatically appear here with safety instructions.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {safetyLogs.map((log, index) => {
                  const isHigh = log.hazard_level === 'high';
                  const isMed = log.hazard_level === 'medium';

                  return (
                    <div
                      key={log.id || index}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isHigh
                          ? 'bg-rose-50/70 border-rose-200'
                          : isMed
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-emerald-50/70 border-emerald-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-xs text-stone-900">{log.material_name}</span>
                            <span
                              className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                                isHigh
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : isMed
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {log.hazard_level} risk
                            </span>
                            <span className="text-[10px] font-bold text-stone-500 bg-white/80 px-2 py-0.5 rounded-md border border-stone-200">
                              {log.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-[10px] text-stone-500 font-medium">
                            <Clock size={11} className="text-stone-400" />
                            <span>{new Date(log.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            {log.lot_id && <span className="ml-1 text-stone-400">· Lot #{log.lot_id}</span>}
                          </div>
                        </div>

                        <AudioButton textToSpeak={`${log.material_name}. ${log.action_taken}. Instruction: ${log.handling_instruction}`} size={16} />
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-stone-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 font-bold text-stone-800">
                          <span className="text-stone-400">Action Taken:</span>
                          <span className={isHigh ? 'text-rose-700' : isMed ? 'text-amber-800' : 'text-emerald-700'}>
                            {log.action_taken}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-600 font-medium bg-white/90 p-2 rounded-xl border border-stone-200/70">
                          💡 <strong>Instruction:</strong> {log.handling_instruction}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 1: Hazard Cards */}
      {activeTab === 'cards' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {safetyCards.map((card) => (
              <div key={card.id} className={`rounded-2xl p-4 border shadow-xs space-y-3 transition-all ${card.bg}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2.5 rounded-2xl bg-white shadow-xs border border-stone-200/60 shrink-0">{card.icon}</div>
                    <div>
                      <h3 className="font-extrabold text-stone-900 text-sm leading-tight">{card.title}</h3>
                      <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full mt-1 ${card.badgeColor}`}>
                        {card.badge}
                      </span>
                    </div>
                  </div>
                  <AudioButton textToSpeak={`${card.title}. ${card.text}. ${card.doText}`} size={18} />
                </div>

                <p className="text-xs font-medium text-stone-800 leading-relaxed">{card.text}</p>

                <div className="bg-white/80 rounded-xl p-2.5 border border-stone-200/60 text-[11px] space-y-1">
                  <div className="text-emerald-800 font-bold flex items-start gap-1">
                    <CheckCircle2 size={13} className="text-[#16A34A] shrink-0 mt-0.5" />
                    <span><strong>Do:</strong> {card.doText}</span>
                  </div>
                  <div className="text-rose-800 font-bold flex items-start gap-1">
                    <AlertTriangle size={13} className="text-rose-600 shrink-0 mt-0.5" />
                    <span><strong>Don't:</strong> {card.dontText}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Interactive PPE Readiness Checklist */}
      {activeTab === 'checklist' && (
        <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-stone-900">Worker Safety Readiness</h2>
              <p className="text-xs text-stone-500 font-medium">Verify your gear before starting lot collection</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-[#16A34A]">{readyPercent}%</span>
              <span className="text-[10px] font-bold text-stone-400 block uppercase">Compliance</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${readyPercent === 100 ? 'bg-[#16A34A]' : 'bg-amber-500'}`}
              style={{ width: `${readyPercent}%` }}
            />
          </div>

          {/* Checklist Items */}
          <div className="space-y-2 pt-1">
            {checklist.map((item) => {
              const isDone = Boolean(checkedItems[item.id]);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    isDone ? 'bg-emerald-50/80 border-emerald-200' : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                      isDone ? 'bg-[#16A34A] border-[#16A34A] text-white' : 'border-stone-300 bg-white'
                    }`}>
                      {isDone && <CheckCircle2 size={14} />}
                    </div>
                    <span className={`text-xs font-bold ${isDone ? 'text-stone-900' : 'text-stone-600'}`}>
                      {item.label}
                    </span>
                  </div>

                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                  }`}>
                    {isDone ? 'Ready ✓' : 'Required'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Emergency First-Aid Protocol */}
      {activeTab === 'emergency' && (
        <div className="space-y-3">
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 space-y-3">
            <div className="flex items-center gap-2.5 text-rose-900">
              <HeartPulse size={22} className="text-rose-600 shrink-0" />
              <div>
                <h2 className="text-base font-black">Immediate First-Aid Protocols</h2>
                <p className="text-xs text-rose-700 font-medium">Quick actions for scrap yard incidents</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-stone-800">
              <div className="bg-white rounded-2xl p-3.5 border border-rose-200 space-y-1">
                <span className="font-extrabold text-rose-900 block text-xs">1. Acid or Electrolyte Skin Contact</span>
                <p className="text-stone-600 font-medium leading-relaxed">
                  Flush affected area with clean cold water immediately for at least 15 minutes. Remove contaminated clothing. Seek medical aid.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-3.5 border border-rose-200 space-y-1">
                <span className="font-extrabold text-rose-900 block text-xs">2. Lithium Battery Thermal Runaway / Fire</span>
                <p className="text-stone-600 font-medium leading-relaxed">
                  DO NOT apply water to burning lithium cells. Cover with dry sand or Class D powder extinguisher to smother flames. Evacuate fumes.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-3.5 border border-rose-200 space-y-1">
                <span className="font-extrabold text-rose-900 block text-xs">3. Sharp Metal Cut or Puncture Wounds</span>
                <p className="text-stone-600 font-medium leading-relaxed">
                  Apply firm direct pressure with clean cloth to stop bleeding. Wash wound thoroughly with antiseptic liquid and verify Tetanus vaccination.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Do's & Don'ts Quick Collapsible Summary */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setExpandedDos(!expandedDos)}
          className="w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-stone-50 transition-colors"
        >
          <div className="flex items-center space-x-2.5">
            <ShieldCheck size={20} className="text-[#16A34A]" />
            <span className="font-black text-xs sm:text-sm text-stone-900">MPCB Authorized Safe Scrap Handling Rules</span>
          </div>
          {expandedDos ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expandedDos && (
          <div className="px-4 pb-4 pt-1 border-t border-stone-100 text-xs space-y-2">
            <div className="flex items-start gap-2 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/60">
              <CheckCircle2 size={15} className="text-[#16A34A] shrink-0 mt-0.5" />
              <p className="text-emerald-900 font-semibold leading-relaxed">
                Always hand over collected e-waste to MPCB verified recyclers to ensure zero toxic landfill dumping and full material traceability.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

