import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Camera, Wallet, ArrowRight, CheckCircle2 } from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      icon: <TrendingUp size={48} className="text-amber-600" />,
      bgIcon: 'bg-amber-50 border-amber-200',
      title: t('onboarding.step1Title'),
      desc: t('onboarding.step1Desc'),
    },
    {
      icon: <Camera size={48} className="text-brand-600" />,
      bgIcon: 'bg-brand-50 border-brand-200',
      title: t('onboarding.step2Title'),
      desc: t('onboarding.step2Desc'),
    },
    {
      icon: <Wallet size={48} className="text-emerald-600" />,
      bgIcon: 'bg-emerald-50 border-emerald-200',
      title: t('onboarding.step3Title'),
      desc: t('onboarding.step3Desc'),
    },
  ];

  const handleFinish = () => {
    const raw = localStorage.getItem('kabadiwala_user');
    if (raw) {
      const user = JSON.parse(raw);
      user.isNew = false;
      localStorage.setItem('kabadiwala_user', JSON.stringify(user));
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col justify-between px-6 py-8 max-w-md mx-auto">
      {/* Top Skip button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleFinish}
          className="text-xs font-bold text-stone-400 hover:text-stone-700"
        >
          Skip
        </button>
      </div>

      {/* Main Slide Content */}
      <div className="text-center space-y-6 my-auto">
        <div className={`w-28 h-28 mx-auto rounded-3xl border-2 flex items-center justify-center shadow-sm ${slides[currentSlide].bgIcon}`}>
          {slides[currentSlide].icon}
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-black text-stone-900 leading-tight">
            {slides[currentSlide].title}
          </h2>
          <p className="text-sm text-stone-600 font-medium leading-relaxed max-w-xs mx-auto">
            {slides[currentSlide].desc}
          </p>
        </div>

        {/* Indicator dots */}
        <div className="flex justify-center space-x-2 pt-4">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentSlide === idx ? 'w-8 bg-brand-600' : 'w-2 bg-stone-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Navigation CTA */}
      <div>
        {currentSlide < slides.length - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentSlide(currentSlide + 1)}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md active:scale-95 transition-all"
          >
            <span>{t("auth.continueBtn")}</span>
            <ArrowRight size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all"
          >
            <CheckCircle2 size={20} />
            <span>{t('onboarding.getStarted')}</span>
          </button>
        )}
      </div>
    </div>
  );
};
