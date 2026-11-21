import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Loader2, RotateCcw, ShieldAlert, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AiNotice } from "@/components/reports";
import { ApiError, fetchAirPlan } from "@/lib/api";
import { localHour } from "@/lib/aqi";
import type { AirActivity, AirGroup, AirPlan, Lang, TimeWindow } from "@/types";

const GROUPS: AirGroup[] = ["general", "children", "elderly", "respiratory", "heart", "pregnant"];
const ACTIVITIES: AirActivity[] = ["walk", "sport", "commute", "kids_outdoor", "ventilate"];

const RISK_STYLE: Record<AirPlan["risk"], string> = {
  low: "bg-primary/15 text-primary",
  moderate: "bg-warn/15 text-warn",
  high: "bg-orange-400/15 text-orange-300",
  very_high: "bg-destructive/15 text-destructive",
};

const itemClass =
  "h-auto min-h-9 rounded-xl! border bg-background-2 px-3 py-1.5 text-xs font-semibold whitespace-normal text-muted-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground";

/** F3: personal AI air plan. Only the group and activity are sent — no personal data. */
export function AirPlanForm() {
  const { t, i18n } = useTranslation();
  const [group, setGroup] = useState<AirGroup>("general");
  const [activity, setActivity] = useState<AirActivity>("walk");
  const [plan, setPlan] = useState<AirPlan | null>(null);
  const [windows, setWindows] = useState<TimeWindow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetchAirPlan(group, activity, i18n.language as Lang);
      setPlan(res.plan);
      setWindows(res.windows);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "network";
      setError(t(`ai.errors.${code ?? "unavailable"}`, { defaultValue: t("ai.errors.unavailable") }));
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Atyrau" });

  return (
    <section aria-labelledby="air-plan" data-surface="glass" className="flex flex-col gap-4 rounded-[20px] p-5">
      <header className="flex flex-col gap-1">
        <h2 id="air-plan" className="flex items-center gap-2 text-base">
          <Sparkles size={16} aria-hidden="true" className="text-aqua" />
          {t("air.plan.title")}
        </h2>
        <small>{t("air.plan.hint")}</small>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <fieldset disabled={loading}>
          <legend>{t("air.plan.who")}</legend>
          <ToggleGroup type="single" spacing={2} value={group} onValueChange={(v) => v && setGroup(v as AirGroup)} className="flex flex-wrap justify-start">
            {GROUPS.map((g) => (
              <ToggleGroupItem key={g} value={g} className={itemClass}>
                {t(`air.plan.group.${g}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </fieldset>
        <fieldset disabled={loading}>
          <legend>{t("air.plan.what")}</legend>
          <ToggleGroup type="single" spacing={2} value={activity} onValueChange={(v) => v && setActivity(v as AirActivity)} className="flex flex-wrap justify-start">
            {ACTIVITIES.map((a) => (
              <ToggleGroupItem key={a} value={a} className={itemClass}>
                {t(`air.plan.activity.${a}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </fieldset>
        <Button type="submit" size="lg" disabled={loading} className="h-11 rounded-xl font-bold sm:self-start sm:px-6">
          {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
          {loading ? t("air.plan.loading") : plan ? t("air.plan.again") : t("air.plan.submit")}
        </Button>
      </form>

      {loading && !plan && (
        <section aria-busy="true" className="flex flex-col gap-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </section>
      )}

      {error && (
        <section role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <p>{error}</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => void submit()} className="rounded-xl">
            <RotateCcw aria-hidden="true" />
            {t("ai.retry")}
          </Button>
        </section>
      )}

      {plan && (
        <article aria-live="polite" className={`flex flex-col gap-3 rounded-2xl border border-aqua/30 bg-aqua/5 p-4 ${loading ? "opacity-60" : ""}`}>
          <header className="flex flex-wrap items-center gap-2">
            <Badge className={`h-6 px-2.5 font-semibold ${RISK_STYLE[plan.risk]}`}>{t(`air.plan.risk.${plan.risk}`)}</Badge>
            <h3 className="w-full text-base">{plan.headline}</h3>
          </header>

          {windows.length > 0 && (
            <section className="flex flex-col gap-1.5">
              <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                <Clock size={13} aria-hidden="true" />
                {t("air.plan.windows")}
              </h4>
              <ul className="flex flex-wrap gap-2">
                {windows.map((w) => (
                  <li key={w.from} className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-sm font-semibold">
                    {w.from.slice(0, 10) === today ? t("air.today") : t("air.tomorrow")}{" "}
                    <time dateTime={w.from}>{localHour(w.from)}</time>–<time dateTime={w.to}>{localHour(w.to)}</time>
                    <small className="ml-1.5 inline">AQI ≈ {w.avgAqi}</small>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {plan.best_time && <p className="text-sm">{plan.best_time}</p>}

          {plan.advice.length > 0 && (
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm marker:text-primary">
              {plan.advice.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}

          {plan.avoid.length > 0 && (
            <section className="flex flex-col gap-1.5">
              <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                <ShieldAlert size={13} aria-hidden="true" />
                {t("air.plan.avoid")}
              </h4>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm marker:text-faint">
                {plan.avoid.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>
          )}

          <footer className="flex flex-col gap-1">
            <AiNotice />
            <small>{t("air.plan.notMedical")}</small>
          </footer>
        </article>
      )}
    </section>
  );
}
