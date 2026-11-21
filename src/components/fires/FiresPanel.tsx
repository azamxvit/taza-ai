import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Loader2, RotateCcw, Satellite, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AiNotice } from "@/components/reports";
import { ApiError, fetchFiresSummary } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { FiresData, FiresSummary, Lang } from "@/types";
import { FIRE_COLORS } from "./fireStyle";

interface FiresPanelProps {
  data: FiresData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
  className?: string;
}

/** Floating card for the satellite layer: counts, legend, weekly AI digest, attribution. */
export function FiresPanel({ data, loading, error, onRetry, onClose, className = "" }: FiresPanelProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<FiresSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const loadSummary = async () => {
    setSummaryLoading(true);
    setSummaryError("");
    try {
      setSummary((await fetchFiresSummary(i18n.language as Lang)).summary);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "network";
      setSummaryError(t(`fires.errors.${code}`, { defaultValue: t(`ai.errors.${code}`, { defaultValue: t("ai.errors.unavailable") }) }));
    } finally {
      setSummaryLoading(false);
    }
  };

  const s = data?.stats;

  return (
    <aside
      aria-labelledby="fires-title"
      data-surface="glass"
      className={`flex max-h-[min(70dvh,560px)] flex-col gap-3 overflow-y-auto rounded-[20px] p-4 ${className}`}
    >
      <header className="flex items-start gap-2">
        <Satellite size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-warn" />
        <span className="flex flex-1 flex-col">
          <h2 id="fires-title" className="text-sm">{t("fires.title")}</h2>
          {data && (
            <small>
              {formatDate(data.from, i18n.language)} – {formatDate(data.to, i18n.language)} · {t("fires.area")}
            </small>
          )}
        </span>
        <Button variant="ghost" size="icon-sm" aria-label={t("report.close")} onClick={onClose} className="rounded-lg">
          <X />
        </Button>
      </header>

      {loading && <Skeleton className="h-10 rounded-xl" />}

      {error && !loading && (
        <section role="alert" className="flex flex-col gap-2 text-sm">
          <p>{t(`fires.errors.${error}`, { defaultValue: t("fires.errors.firms_unavailable") })}</p>
          {error !== "firms_not_configured" && (
            <Button variant="secondary" size="sm" onClick={onRetry} className="self-start rounded-xl">
              <RotateCcw aria-hidden="true" />
              {t("ai.retry")}
            </Button>
          )}
        </section>
      )}

      {data && s && (
        <>
          {data.stale && <p className="text-xs text-warn">{t("fires.stale")}</p>}
          <p className="flex items-baseline gap-2">
            <strong className="text-3xl leading-none">{s.total}</strong>
            <span className="text-sm text-muted-foreground">{t("fires.count", { count: s.total })}</span>
          </p>

          <ul aria-label={t("fires.legend")} className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {(["high", "nominal", "low"] as const).map((c) => (
              <li key={c} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: FIRE_COLORS[c] }} />
                {t(`fires.conf.${c}`)} · {s.byConfidence[c]}
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-full border border-dashed border-foreground" />
              {t("fires.persistent")} · {s.persistentPoints}
            </li>
          </ul>

          {s.total === 0 && <p className="text-sm text-muted-foreground">{t("fires.empty")}</p>}

          <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-aqua">
              <Sparkles size={14} aria-hidden="true" />
              {t("fires.summaryTitle")}
              <ChevronDown size={14} aria-hidden="true" className="transition group-open:rotate-180" />
            </summary>
            <section className="mt-2 flex flex-col gap-2 text-sm">
              {!summary && !summaryLoading && !summaryError && (
                <Button size="sm" onClick={() => void loadSummary()} className="self-start rounded-xl">
                  <Sparkles aria-hidden="true" />
                  {t("fires.summaryButton")}
                </Button>
              )}
              {summaryLoading && (
                <>
                  <p className="flex items-center gap-2 text-xs text-aqua">
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                    {t("fires.summaryLoading")}
                  </p>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </>
              )}
              {summaryError && (
                <p role="alert" className="flex flex-wrap items-center gap-2 text-xs">
                  {summaryError}
                  <Button variant="secondary" size="xs" onClick={() => void loadSummary()} className="rounded-lg">
                    {t("ai.retry")}
                  </Button>
                </p>
              )}
              {summary && (
                <article aria-live="polite" className="flex flex-col gap-2">
                  <h3 className="text-sm">{summary.headline}</h3>
                  <p className="text-sm">{summary.summary}</p>
                  {summary.highlights.length > 0 && (
                    <ul className="flex list-disc flex-col gap-1 pl-5 text-xs marker:text-warn">
                      {summary.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  )}
                  {summary.advice.length > 0 && (
                    <ul className="flex list-disc flex-col gap-1 pl-5 text-xs marker:text-primary">
                      {summary.advice.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  )}
                  <AiNotice />
                </article>
              )}
            </section>
          </details>

          <small>{t("fires.notFire")}</small>
          <small className="text-faint">
            {t("fires.attribution")}{" "}
            <a href="https://firms.modaps.eosdis.nasa.gov/" target="_blank" rel="noopener noreferrer">NASA FIRMS</a> (VIIRS 375 m NRT, LANCE/ESDIS).
          </small>
        </>
      )}
    </aside>
  );
}
