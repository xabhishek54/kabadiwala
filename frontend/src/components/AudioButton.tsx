import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { speakWithPiper, stopPiperSpeech } from '../services/piperSpeech';

interface AudioButtonProps {
  textToSpeak: string;
  className?: string;
  size?: number;
}

export const AudioButton: React.FC<AudioButtonProps> = ({ textToSpeak, className = '', size = 20 }) => {
  const { i18n } = useTranslation();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const updateVoices = () => {
      try {
        const available = window.speechSynthesis.getVoices();
        if (available.length > 0) {
          setVoices(available);
        }
      } catch {
        // Safe fallback
      }
    };

    updateVoices();
    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
    } else {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
      stopPiperSpeech();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Web Audio chime feedback if speech synth fails or has no audio output
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  };

  const speakWithBrowser = () => {
    if (!('speechSynthesis' in window)) {
      playChime();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const langMap: Record<string, string> = { hi: 'hi-IN', mr: 'mr-IN', en: 'en-IN' };
      const targetLang = langMap[i18n.language] || 'hi-IN';
      utterance.lang = targetLang;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      const avail = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
      const matched =
        avail.find((v) => v.lang === targetLang) ||
        avail.find((v) => v.lang.startsWith(targetLang.split('-')[0])) ||
        avail.find((v) => v.lang.includes('IN')) ||
        avail[0];

      if (matched) {
        utterance.voice = matched;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        playChime();
      };

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);

      // Auto safety timeout to unstick UI state if synthesis hangs
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsSpeaking(false);
      }, Math.max(4000, textToSpeak.length * 120));
    } catch {
      setIsSpeaking(false);
      playChime();
    }
  };

  const speak = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isSpeaking) {
      try {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      } catch {}
      stopPiperSpeech();
      setIsSpeaking(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    const language = i18n.language === 'hi' || i18n.language === 'mr' ? i18n.language : 'en';

    if (language !== 'en') {
      try {
        await speakWithPiper(
          textToSpeak,
          language,
          () => setIsSpeaking(true),
          () => setIsSpeaking(false)
        );
        return;
      } catch (err) {
        // Fallback gracefully to browser voice synthesis
      }
    }

    speakWithBrowser();
  };

  return (
    <button
      type="button"
      onClick={speak}
      aria-label={isSpeaking ? 'Stop listening' : 'Listen audio'}
      className={`tap-target relative inline-flex items-center justify-center rounded-full p-2.5 transition-all duration-200 cursor-pointer ${
        isSpeaking
          ? 'bg-amber-500 text-white shadow-md ring-4 ring-amber-200 animate-pulse'
          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-500/20 active:scale-95'
      } ${className}`}
    >
      {isSpeaking ? <VolumeX size={size} /> : <Volume2 size={size} />}
    </button>
  );
};
