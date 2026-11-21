import { useTranslation } from "react-i18next";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LANGUAGES } from "@/i18n";
import type { Lang } from "@/types";

const SHORT: Record<Lang, string> = { ru: "РУС", kk: "ҚАЗ", en: "ENG" };

export function LangSwitcher() {
  const { t, i18n } = useTranslation();
  return (
    <ToggleGroup
      type="single"
      aria-label={t("lang.label")}
      value={i18n.resolvedLanguage}
      onValueChange={(lng) => lng && void i18n.changeLanguage(lng)}
      className="rounded-xl border bg-background/60 p-0.5"
    >
      {LANGUAGES.map((lng) => (
        <ToggleGroupItem
          key={lng}
          value={lng}
          lang={lng}
          title={t(`lang.${lng}`)}
          className="h-7 rounded-lg! px-2 text-[11px] font-bold text-muted-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {SHORT[lng]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
