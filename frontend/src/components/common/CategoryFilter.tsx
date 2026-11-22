import { useTranslation } from "react-i18next";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CATEGORIES } from "@/lib/categories";
import type { CategoryFilterValue } from "@/context";
import { NodeIcon } from "./NodeIcon";

interface CategoryFilterProps {
  value: CategoryFilterValue;
  onChange: (value: CategoryFilterValue) => void;
  className?: string;
}

const itemClass =
  "shrink-0 h-8 rounded-full! border px-3 text-xs font-semibold text-muted-foreground bg-[var(--glass)] backdrop-blur-md hover:text-foreground data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:border-foreground";

/** Horizontal, scrollable category chips. `value` is "all" or a category id. */
export function CategoryFilter({ value, onChange, className = "" }: CategoryFilterProps) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("map.filters")} data-scroll="x" className={className}>
      <ToggleGroup
        type="single"
        spacing={2}
        value={value}
        onValueChange={(v) => onChange(v || "all")}
        className="w-max"
      >
        <ToggleGroupItem value="all" className={itemClass}>
          {t("filters.all")}
        </ToggleGroupItem>
        {CATEGORIES.map((c) => (
          <ToggleGroupItem key={c.id} value={c.id} className={itemClass}>
            <span style={{ color: value === c.id ? undefined : c.color }}>
              <NodeIcon node={c.icon} size={14} />
            </span>
            {t(`category.${c.id}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </nav>
  );
}
