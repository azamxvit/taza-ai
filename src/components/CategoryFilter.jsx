import { useTranslation } from "react-i18next";
import { CATEGORIES } from "../categories";
import NodeIcon from "./Icon";

// Horizontal, scrollable category chips. `value` is "all" or a category id.
export default function CategoryFilter({ value, onChange, className = "" }) {
  const { t } = useTranslation();
  const chip = (active) =>
    `shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
      active ? "bg-ink text-night border-ink" : "glass text-muted hover:text-ink border-line"
    }`;
  return (
    <div role="group" aria-label={t("map.filters")} className={`flex gap-2 overflow-x-auto no-scrollbar ${className}`}>
      <button type="button" aria-pressed={value === "all"} className={chip(value === "all")} onClick={() => onChange("all")}>
        {t("filters.all")}
      </button>
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-pressed={value === c.id}
          className={chip(value === c.id)}
          onClick={() => onChange(c.id)}
        >
          <span style={{ color: value === c.id ? undefined : c.color }}>
            <NodeIcon node={c.icon} size={14} />
          </span>
          {t(`category.${c.id}`)}
        </button>
      ))}
    </div>
  );
}
