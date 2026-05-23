import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import tr from './locales/tr';
import en from './locales/en';

const deviceLocale = getLocales()[0]?.languageCode ?? 'tr';
const supportedLocale = deviceLocale === 'tr' ? 'tr' : 'en';

i18n.use(initReactI18next).init({
  resources: { tr: { translation: tr }, en: { translation: en } },
  lng: supportedLocale,
  fallbackLng: 'tr',
  interpolation: { escapeValue: false },
});

export default i18n;
export { supportedLocale };
