import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AudioButtonProps {
  textToSpeak: string;
  className?: string;
  size?: number;
}

export const AudioButton: React.FC<AudioButtonProps> = ({ textToSpeak, className = '', size = 20 }) => {
  const { i18n } = useTranslation();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const updateVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    updateVoices();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    const langMap: Record<string, string> = {
      hi: 'hi-IN',
      mr: 'mr-IN',
      en: 'en-IN',
    };
    const targetLang = langMap[i18n.language] || 'hi-IN';
    utterance.lang = targetLang;
    utterance.rate = 0.9;

    const availableVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
    const matchedVoice = availableVoices.find(v => v.lang === targetLang || v.lang.startsWith(targetLang.split('-')[0]));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      type="button"
      onClick={speak}
      aria-label={isSpeaking ? 'Stop listening' : 'Listen audio'}
      className={`tap-target relative inline-flex items-center justify-center rounded-full p-2.5 transition-all duration-200 ${
        isSpeaking
          ? 'bg-amber-500 text-white shadow-md ring-4 ring-amber-200 animate-pulse'
          : 'bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-500/20 active:scale-95'
      } ${className}`}
    >
      {isSpeaking ? <VolumeX size={size} /> : <Volume2 size={size} />}
    </button>
  );
};
