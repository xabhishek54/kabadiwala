import React from 'react';
import { useTranslation } from 'react-i18next';
import { AudioButton } from '../../components/AudioButton';
import { ShieldAlert, Flame, Zap, EyeOff, FlaskConical, Wind, HardHat } from 'lucide-react';

export const SafetyPage: React.FC = () => {
  const { t } = useTranslation();

  const safetyCards = [
    {
      id: 'battery',
      icon: <Zap className="text-amber-600" size={26} />,
      title: t('safety.batteryTitle'),
      text: t('safety.batteryTip'),
      bg: 'bg-amber-50/80 border-amber-200/80',
      badge: 'उच्च जोखिम (High Risk)',
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'crt',
      icon: <EyeOff className="text-rose-600" size={26} />,
      title: t('safety.crtTitle'),
      text: t('safety.crtTip'),
      bg: 'bg-rose-50/80 border-rose-200/80',
      badge: 'कांच / सीसा hazard',
      badgeColor: 'bg-rose-100 text-rose-800',
    },
    {
      id: 'cable',
      icon: <Flame className="text-orange-600" size={26} />,
      title: t('safety.cableTitle'),
      text: t('safety.cableTip'),
      bg: 'bg-orange-50/80 border-orange-200/80',
      badge: 'पर्यावरण नियम',
      badgeColor: 'bg-orange-100 text-orange-800',
    },
    {
      id: 'acid',
      icon: <FlaskConical className="text-red-600" size={26} />,
      title: t('safety.acidTitle'),
      text: t('safety.acidTip'),
      bg: 'bg-red-50/80 border-red-200/80',
      badge: 'रासायनिक खतरा',
      badgeColor: 'bg-red-100 text-red-800',
    },
    {
      id: 'smoke',
      icon: <Wind className="text-purple-600" size={26} />,
      title: t('safety.smokeTitle'),
      text: t('safety.smokeTip'),
      bg: 'bg-purple-50/80 border-purple-200/80',
      badge: 'धुआं निर्देश',
      badgeColor: 'bg-purple-100 text-purple-800',
    },
    {
      id: 'ppe',
      icon: <HardHat className="text-emerald-600" size={26} />,
      title: t('safety.ppeTitle'),
      text: t('safety.ppeTip'),
      bg: 'bg-emerald-50/80 border-emerald-200/80',
      badge: 'दैनिक सुरक्षा',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
  ];

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-4">
      {/* Header Banner */}
      <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft flex items-center space-x-3.5">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
          <ShieldAlert size={28} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-stone-900 leading-tight">{t('safety.title')}</h2>
          <p className="text-xs text-stone-500 font-medium mt-0.5">{t('safety.subtitle')}</p>
        </div>
      </div>

      {/* Safety Cards Grid */}
      <div className="space-y-3">
        {safetyCards.map((card) => (
          <div key={card.id} className={`rounded-card p-4 border shadow-soft space-y-2.5 transition-all ${card.bg}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-white/80 shadow-xs border border-stone-200/50">{card.icon}</div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-tight">{card.title}</h3>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </div>
              </div>
              <AudioButton textToSpeak={card.text} size={18} />
            </div>
            <p className="text-xs sm:text-sm font-medium text-stone-800 leading-relaxed pl-1">{card.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
