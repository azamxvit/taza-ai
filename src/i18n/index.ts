import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import type { Lang } from "@/types";
import ru from "./locales/ru.json";
import kk from "./locales/kk.json";
import en from "./locales/en.json";

export const LANGUAGES: Lang[] = ["ru", "kk", "en"];
const STORAGE_KEY = "taza:lang";

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (LANGUAGES as string[]).includes(saved)) return saved as Lang;
  } catch {
    /* storage unavailable */
  }
  return "ru"; // Russian by default
}

void i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru }, kk: { translation: kk }, en: { translation: en } },
  lng: initialLang(),
  fallbackLng: "ru",
  interpolation: { escapeValue: false },
});

/** <html lang> and the tab title follow the interface language. */
function syncDocument(lng: string) {
  document.documentElement.lang = lng;
  document.title = i18n.t("app.title");
}
syncDocument(i18n.language);

i18n.on("languageChanged", (lng) => {
  syncDocument(lng);
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
});

export default i18n;
