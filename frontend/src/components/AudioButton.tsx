import React from 'react';
import { Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AudioButtonProps {
  textToSpeak: string;
  className?: string;
  size?: number;
}

export const AudioButton: React.FC<AudioButtonProps> = ({ textToSpeak, className = '', size = 20 }) => {
  const { i18n } = useTranslation();

  const speak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    const langMap: Record<string, string> = {
      hi: 'hi-IN',
      mr: 'mr-IN',
      en: 'en-IN',
    };
    utterance.lang = langMap[i18n.language] || 'hi-IN';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      type="button"
      onClick={speak}
      aria-label="Listen audio"
      className={`tap-target rounded-full bg-brand-50 hover:bg-brand-100 text-brand-700 p-2 border border-brand-500/20 active:scale-95 transition-transform ${className}`}
    >
      <Volume2 size={size} />
    </button>
  );
};
