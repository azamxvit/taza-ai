import { useTranslation } from "react-i18next";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { severityColor } from "@/lib/categories";
import type { Severity } from "@/types";

const LEVELS: Severity[] = [1, 2, 3, 4, 5];

interface SeverityPickerProps {
  value: Severity;
  onChange: (value: Severity) => void;
}

/** 1–5 scale; the colour matches the map marker. */
export function SeverityPicker({ value, onChange }: SeverityPickerProps) {
  const { t } = useTranslation();
  return (
    <fieldset>
      <legend>
        {t("severity.label")}: {value}/5 · {t(`severity.${value}`)}
      </legend>
      <ToggleGroup
        type="single"
        spacing={2}
        value={String(value)}
        onValueChange={(v) => v && onChange(Number(v) as Severity)}
        className="grid w-full grid-cols-5"
      >
        {LEVELS.map((level) => (
          <ToggleGroupItem
            key={level}
            value={String(level)}
            aria-label={`${level} — ${t(`severity.${level}`)}`}
            className="h-10 rounded-xl! border bg-background-2 font-bold text-muted-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground"
          >
            <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: severityColor(level) }} />
            {level}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </fieldset>
  );
}
