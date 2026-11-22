import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { categoryById, severityColor, severityOf } from "@/lib/categories";
import type { Report, ReportStatus, Severity } from "@/types";
import { NodeIcon } from "./NodeIcon";

export function CategoryChip({ id }: { id: string }) {
  const { t } = useTranslation();
  const cat = categoryById(id);
  return (
    <Badge className="h-6 px-2.5 font-semibold" style={{ backgroundColor: `${cat.color}22`, color: cat.color }}>
      <NodeIcon node={cat.icon} size={13} />
      {t(`category.${cat.id}`)}
    </Badge>
  );
}

export function SeverityBadge({ report, severity }: { report?: Report; severity?: Severity }) {
  const { t } = useTranslation();
  const sev = severity ?? severityOf(report);
  return (
    <Badge variant="outline" className="h-6 px-2.5 font-semibold" title={t("severity.label")}>
      <span aria-hidden="true" className="size-2 rounded-full" style={{ background: severityColor(sev) }} />
      {sev}/5 · {t(`severity.${sev}`)}
    </Badge>
  );
}

const STATUS_STYLE: Record<ReportStatus, string> = {
  open: "bg-sky-400/15 text-sky-300",
  appeal_sent: "bg-amber-400/15 text-amber-300",
  answered: "bg-violet-400/15 text-violet-300",
  resolved: "bg-primary/15 text-primary",
};

export function StatusBadge({ status = "open" }: { status?: ReportStatus }) {
  const { t } = useTranslation();
  return (
    <Badge className={`h-6 px-2.5 font-semibold ${STATUS_STYLE[status] ?? STATUS_STYLE.open}`}>
      {t(`status.${status}`, { defaultValue: t("status.open") })}
    </Badge>
  );
}
