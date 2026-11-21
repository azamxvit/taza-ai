import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ru from "./locales/ru.json";
import kk from "./locales/kk.json";
import en from "./locales/en.json";

export const LANGUAGES = ["ru", "kk", "en"];
const STORAGE_KEY = "taza:lang";

function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LANGUAGES.includes(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  return "ru"; // Russian by default
}

i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru }, kk: { translation: kk }, en: { translation: en } },
  lng: initialLang(),
  fallbackLng: "ru",
  interpolation: { escapeValue: false },
  returnNull: false,
});

function syncHtml(lng) {
  document.documentElement.lang = lng;
}
syncHtml(i18n.language);

i18n.on("languageChanged", (lng) => {
  syncHtml(lng);
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
});

export default i18n;
