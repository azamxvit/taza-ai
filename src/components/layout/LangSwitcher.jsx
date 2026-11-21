import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../../i18n";

const SHORT = { ru: "РУС", kk: "ҚАЗ", en: "ENG" };

export default function LangSwitcher() {
  const { t, i18n } = useTranslation();
  return (
    <div role="group" aria-label={t("lang.label")} className="flex rounded-xl bg-night/60 p-0.5 border border-line">
      {LANGUAGES.map((lng) => {
        const active = i18n.resolvedLanguage === lng;
        return (
          <button
            key={lng}
            type="button"
            lang={lng}
            title={t(`lang.${lng}`)}
            aria-pressed={active}
            onClick={() => i18n.changeLanguage(lng)}
            className={`px-2 py-1 text-[11px] font-bold rounded-lg transition ${
              active ? "bg-eco text-night" : "text-muted hover:text-ink"
            }`}
          >
            {SHORT[lng]}
          </button>
        );
      })}
    </div>
  );
}
