import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import hiTranslation from './locales/hi.json';
import mrTranslation from './locales/mr.json';
import enTranslation from './locales/en.json';

const getSavedLanguage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('kabadiwala_lang') || 'hi';
    }
  } catch (e) {
    // Fallback if localStorage is inaccessible
  }
  return 'hi';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      hi: { translation: hiTranslation },
      mr: { translation: mrTranslation },
      en: { translation: enTranslation },
    },
    lng: getSavedLanguage(),
    fallbackLng: 'hi',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
