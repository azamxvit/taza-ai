import { useTranslation } from "react-i18next";
import { categoryById, severityColor, severityOf } from "../categories";
import NodeIcon from "./Icon";

export function CategoryChip({ id, size = "sm" }) {
  const { t } = useTranslation();
  const cat = categoryById(id);
  const pad = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${pad}`}
      style={{ backgroundColor: cat.color + "22", color: cat.color }}
    >
      <NodeIcon node={cat.icon} size={size === "sm" ? 13 : 15} />
      {t(`category.${cat.id}`)}
    </span>
  );
}

export function SeverityBadge({ report, severity }) {
  const { t } = useTranslation();
  const sev = severity ?? severityOf(report);
  const color = severityColor(sev);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold bg-night/60 border border-line text-ink"
      title={t("severity.label")}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: color }} aria-hidden="true" />
      {sev}/5 · {t(`severity.${sev}`)}
    </span>
  );
}

const STATUS_STYLE = {
  open: "bg-sky-400/15 text-sky-300",
  appeal_sent: "bg-amber-400/15 text-amber-300",
  answered: "bg-violet-400/15 text-violet-300",
  resolved: "bg-eco/15 text-eco",
};

export function StatusBadge({ status = "open" }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[status] || STATUS_STYLE.open}`}>
      {t(`status.${status}`, { defaultValue: t("status.open") })}
    </span>
  );
}
