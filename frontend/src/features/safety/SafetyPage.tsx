import React from 'react';
import { useTranslation } from 'react-i18next';
import { AudioButton } from '../../components/AudioButton';
import { ShieldAlert, Flame, Zap, EyeOff } from 'lucide-react';

export const SafetyPage: React.FC = () => {
  const { t } = useTranslation();

  const safetyCards = [
    {
      id: 'battery',
      icon: <Zap className="text-amber-500" size={28} />,
      title: 'बैटरी सुरक्षा (Battery Safety)',
      text: t('safety.batteryTip'),
      bg: 'bg-amber-50/70 border-amber-200',
    },
    {
      id: 'crt',
      icon: <EyeOff className="text-rose-500" size={28} />,
      title: 'सीआरटी कांच सुरक्षा (CRT Glass Safety)',
      text: t('safety.crtTip'),
      bg: 'bg-rose-50/70 border-rose-200',
    },
    {
      id: 'cable',
      icon: <Flame className="text-orange-500" size={28} />,
      title: 'केबल जलाने से बचें (Do Not Burn Cables)',
      text: t('safety.cableTip'),
      bg: 'bg-orange-50/70 border-orange-200',
    },
  ];

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
          <ShieldAlert size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-stone-900 leading-tight">{t('safety.title')}</h2>
          <p className="text-xs text-stone-500">स्वास्थ्य और सुरक्षा निर्देश</p>
        </div>
      </div>

      {/* Guidance Cards */}
      <div className="space-y-3">
        {safetyCards.map((card) => (
          <div key={card.id} className={`rounded-card p-4 border shadow-soft space-y-2 ${card.bg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                {card.icon}
                <h3 className="font-bold text-stone-900 text-base leading-tight">{card.title}</h3>
              </div>
              <AudioButton textToSpeak={card.text} size={18} />
            </div>
            <p className="text-sm font-medium text-stone-800 leading-relaxed pl-1">{card.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
