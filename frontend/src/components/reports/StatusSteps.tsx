import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { Report, ReportStatus } from "@/types";

const STEPS: ReportStatus[] = ["open", "appeal_sent", "answered", "resolved"];

/** open → appeal_sent → answered → resolved, with the date of each reached step. */
export function StatusSteps({ report }: { report: Report }) {
  const { t, i18n } = useTranslation();
  const current = STEPS.indexOf(report.status);
  const dateOf = (status: ReportStatus) =>
    status === "open" ? report.createdAt : report.statusHistory?.filter((e) => e.status === status).at(-1)?.at;

  return (
    <ol aria-label={t("status.label")} className="grid grid-cols-4 gap-1.5">
      {STEPS.map((step, i) => {
        const done = i <= current;
        const at = done ? dateOf(step) : undefined;
        return (
          <li
            key={step}
            aria-current={i === current ? "step" : undefined}
            className={`flex flex-col gap-1 border-t-2 pt-2 text-[11px] leading-tight ${
              done ? "border-primary text-foreground" : "border-border text-faint"
            }`}
          >
            <span className="flex items-center gap-1 font-semibold">
              {done && <Check size={12} aria-hidden="true" className="shrink-0 text-primary" />}
              {t(`status.${step}`)}
            </span>
            {at && <time dateTime={at} className="text-faint">{formatDate(at, i18n.language)}</time>}
          </li>
        );
      })}
    </ol>
  );
}
