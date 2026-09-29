import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/local/db';
import { AudioButton } from '../../components/AudioButton';
import {
  ShieldAlert,
  CheckCircle2, AlertTriangle, PhoneCall, History, Check, HeartPulse, Sparkles
} from 'lucide-react';

interface SafetyCheckItem {
  id: string;
  label: string;
  icon: string;
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

  const [activeTab, setActiveTab] = useState<'pictorial' | 'checklist' | 'emergency' | 'history'>('pictorial');

  // Live query for Safety History log from Dexie
  const safetyLogs = useLiveQuery(() => db.safetyHistory.orderBy('timestamp').reverse().toArray(), []);

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const checklist: SafetyCheckItem[] = [
    { id: 'gloves', label: 'Heavy Cut-Resistant Gloves', icon: '🧤' },
    { id: 'goggles', label: 'Safety Eyewear Goggles', icon: '🥽' },
    { id: 'boots', label: 'Steel-Toe Safety Boots', icon: '🥾' },
    { id: 'mask', label: 'N95 Respirator Fume Mask', icon: '😷' },
    { id: 'box', label: 'Battery Storage Box', icon: '🗃️' },
    { id: 'ventilation', label: 'Ventilated Storage Area', icon: '🌀' },
  ];

  const readyCount = Object.values(checkedItems).filter(Boolean).length;
  const readyPercent = Math.round((readyCount / checklist.length) * 100);

  const pictorialGuides = [
    {
      id: 'battery',
      title: t('safety.batteryTitle'),
      image: '/illustrations/battery_safety.png',
      badge: t('safety.batteryBadge'),
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      audioText: t('safety.batteryAudio'),
      doText: t('safety.batteryDo'),
      dontText: t('safety.batteryDont'),
    },
    {
      id: 'crt',
      title: t('safety.crtTitle'),
      image: '/illustrations/crt_safety.png',
      badge: t('safety.crtBadge'),
      badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
      audioText: t('safety.crtAudio'),
      doText: t('safety.crtDo'),
      dontText: t('safety.crtDont'),
    },
    {
      id: 'cable',
      title: t('safety.cableTitle'),
      image: '/illustrations/cable_safety.png',
      badge: t('safety.cableBadge'),
      badgeColor: 'bg-orange-100 text-orange-900 border-orange-300',
      audioText: t('safety.cableAudio'),
      doText: t('safety.cableDo'),
      dontText: t('safety.cableDont'),
    },
    {
      id: 'acid',
      title: t('safety.acidTitle'),
      image: '/illustrations/acid_safety.png',
      badge: t('safety.acidBadge'),
      badgeColor: 'bg-red-100 text-red-900 border-red-300',
      audioText: t('safety.acidAudio'),
      doText: t('safety.acidDo'),
      dontText: t('safety.acidDont'),
    },
    {
      id: 'ppe',
      title: t('safety.ppeTitle'),
      image: '/illustrations/ppe_safety.png',
      badge: t('safety.ppeBadge'),
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      audioText: t('safety.ppeAudio'),
      doText: t('safety.ppeDo'),
      dontText: t('safety.ppeDont'),
    },
  ];

  return (
    <div className="pb-24 pt-3 px-3 sm:px-4 max-w-md sm:max-w-2xl md:max-w-4xl mx-auto space-y-3 font-sans text-stone-900">

      {/* Simplified Clean Header */}
      <div className="bg-white rounded-2xl p-3.5 border border-stone-200 shadow-xs flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h1 className="text-base font-black text-stone-900 leading-tight">{t('safety.title')}</h1>
            <p className="text-xs text-stone-500 font-medium">{t('safety.subtitle')}</p>
          </div>
        </div>

        <a
          href="tel:108"
          className="tap-target px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center space-x-1 shadow-xs transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <PhoneCall size={14} />
          <span>108</span>
        </a>
      </div>

      {/* Simplified Navigation Tabs */}
      <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('pictorial')}
          className={`flex-1 min-w-24 py-2 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'pictorial' ? 'bg-white text-stone-900 shadow-xs border border-stone-200' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Sparkles size={14} className="text-amber-500" />
          <span>{t('safety.pictorialTab')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('checklist')}
          className={`flex-1 min-w-28 py-2 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'checklist' ? 'bg-white text-emerald-800 shadow-xs border border-stone-200' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>{t('safety.checklistTab')}</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${readyPercent === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {readyCount}/{checklist.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('emergency')}
          className={`flex-1 min-w-20 py-2 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'emergency' ? 'bg-white text-rose-700 shadow-xs border border-stone-200' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          {t('safety.emergencyTab')}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 min-w-20 py-2 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'history' ? 'bg-white text-amber-700 shadow-xs border border-stone-200' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <History size={13} className="text-amber-600" />
          <span>{t('safety.historyTab')}</span>
        </button>
      </div>

      {/* Tab 1: Full Pictorial Visual Guide Feed */}
      {activeTab === 'pictorial' && (
        <div className="space-y-4">
          {pictorialGuides.map((guide) => (
            <div key={guide.id} className="bg-white rounded-2xl border border-stone-200 shadow-xs p-3.5 space-y-3">
              
              {/* Card Title Header with Vernacular Audio */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${guide.badgeColor}`}>
                    {guide.badge}
                  </span>
                  <h2 className="font-extrabold text-stone-900 text-sm leading-tight">{guide.title}</h2>
                </div>
                <AudioButton textToSpeak={guide.audioText} size={20} />
              </div>

              {/* Full Image Display (Fully visible natively, responsive for mobile) */}
              <div className="bg-stone-50 rounded-xl p-2 border border-stone-200 flex items-center justify-center">
                <img
                  src={guide.image}
                  alt={guide.title}
                  className="w-full h-auto max-h-[420px] sm:max-h-[520px] object-contain rounded-lg shadow-xs"
                  loading="lazy"
                />
              </div>

              {/* Do's & Don'ts Badges */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-emerald-50 rounded-xl p-2.5 border border-emerald-200 space-y-1">
                  <div className="flex items-center gap-1 text-emerald-800 font-extrabold">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>{t('safety.doThis')}</span>
                  </div>
                  <p className="text-stone-700 font-medium text-[11px] leading-snug">{guide.doText}</p>
                </div>

                <div className="bg-rose-50 rounded-xl p-2.5 border border-rose-200 space-y-1">
                  <div className="flex items-center gap-1 text-rose-800 font-extrabold">
                    <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                    <span>{t('safety.avoidThis')}</span>
                  </div>
                  <p className="text-stone-700 font-medium text-[11px] leading-snug">{guide.dontText}</p>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Tab 2: PPE Gear Checklist */}
      {activeTab === 'checklist' && (
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-stone-900">{t('safety.gearReadiness')}</h2>
              <p className="text-xs text-stone-500 font-medium">{t('safety.gearVerifySub')}</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-[#16A34A]">{readyPercent}%</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden border border-stone-200">
            <div
              className={`h-full rounded-full transition-all duration-300 ${readyPercent === 100 ? 'bg-[#16A34A]' : 'bg-amber-500'}`}
              style={{ width: `${readyPercent}%` }}
            />
          </div>

          {/* PPE Full Poster Image natively visible */}
          <div className="bg-stone-50 rounded-xl p-1 border border-stone-200">
            <img src="/illustrations/ppe_safety.png" alt="PPE Standard" className="w-full h-auto max-h-[450px] object-contain rounded-lg" />
          </div>

          {/* Checklist Items */}
          <div className="space-y-2 pt-1">
            {checklist.map((item) => {
              const isDone = Boolean(checkedItems[item.id]);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isDone ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-50 border-stone-200'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-lg">{item.icon}</span>
                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                      isDone ? 'bg-[#16A34A] border-[#16A34A] text-white' : 'border-stone-300 bg-white'
                    }`}>
                      {isDone && <Check size={12} />}
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

      {/* Tab 3: Emergency First-Aid */}
      {activeTab === 'emergency' && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-900">
              <HeartPulse size={20} className="text-rose-600 shrink-0" />
              <h2 className="text-sm font-black">{t('safety.firstAidTitle')}</h2>
            </div>
            <AudioButton textToSpeak={t('safety.firstAidAudio')} size={18} />
          </div>

          <div className="space-y-2 text-xs text-stone-800">
            <div className="bg-white rounded-xl p-3 border border-rose-200 space-y-1">
              <span className="font-extrabold text-rose-900 block text-xs">{t('safety.acidContactTitle')}</span>
              <p className="text-stone-600 font-medium">{t('safety.acidContactDesc')}</p>
            </div>

            <div className="bg-white rounded-xl p-3 border border-rose-200 space-y-1">
              <span className="font-extrabold text-rose-900 block text-xs">{t('safety.lithiumFireTitle')}</span>
              <p className="text-stone-600 font-medium">{t('safety.lithiumFireDesc')}</p>
            </div>

            <div className="bg-white rounded-xl p-3 border border-rose-200 space-y-1">
              <span className="font-extrabold text-rose-900 block text-xs">{t('safety.metalCutTitle')}</span>
              <p className="text-stone-600 font-medium">{t('safety.metalCutDesc')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Collector Safety History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl p-4 border border-stone-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
              <History size={16} className="text-amber-600" />
              <span>{t('safety.historyTitle')}</span>
            </h2>
            <span className="text-[10px] font-bold bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
              {safetyLogs?.length || 0} logged
            </span>
          </div>

          {(!safetyLogs || safetyLogs.length === 0) ? (
            <div className="text-center py-6 bg-stone-50 rounded-xl border border-dashed border-stone-200 space-y-1">
              <p className="text-xs font-bold text-stone-600">{t('safety.noHistory')}</p>
              <p className="text-[11px] text-stone-400">{t('safety.noHistorySub')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {safetyLogs.map((log, index) => (
                <div key={log.id || index} className="p-3 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-stone-900">{log.material_name}</span>
                    <p className="text-[11px] text-stone-500">{log.action_taken}</p>
                  </div>
                  <AudioButton textToSpeak={`${log.material_name}. ${log.action_taken}`} size={16} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
