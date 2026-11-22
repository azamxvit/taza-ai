import { useTranslation } from "react-i18next";
import { Eye, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AiInsightProps {
  evidence: string[];
  actions: string[];
}

function InsightList({ title, items, icon: Icon }: { title: string; items: string[]; icon: LucideIcon }) {
  if (!items.length) return null;
  return (
    <section className="flex flex-col gap-1.5">
      <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
        <Icon size={13} aria-hidden="true" />
        {title}
      </h4>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm marker:text-faint">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

/** "What is visible" and "what you can do" lists from the AI analysis. */
export function AiInsight({ evidence, actions }: AiInsightProps) {
  const { t } = useTranslation();
  return (
    <>
      <InsightList title={t("ai.evidence")} items={evidence} icon={Eye} />
      <InsightList title={t("ai.actions")} items={actions} icon={ShieldCheck} />
    </>
  );
}

/** "Уверенность 90%" chip. */
export function ConfidenceChip({ value }: { value: number }) {
  const { t } = useTranslation();
  const pct = Math.round(value * 100);
  return (
    <data value={value} className="rounded-full bg-aqua/15 px-2 py-0.5 text-xs font-semibold text-aqua">
      {t("ai.confidence", { value: pct })}
    </data>
  );
}
