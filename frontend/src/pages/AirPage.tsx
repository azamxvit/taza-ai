import { useTranslation } from "react-i18next";
import { CloudOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AirAttribution, AirPlanForm, AqiChart, AqiHero, PollutantList, WindCard } from "@/components/air";
import { useAir } from "@/hooks";
import { formatDateTime } from "@/lib/format";

export function AirPage() {
  const { t, i18n } = useTranslation();
  const { data, loading, error, reload } = useAir();

  return (
    <>
      <header>
        <h1>{t("air.title")}</h1>
        <p>{t("air.subtitle")}</p>
      </header>

      {!data && loading && (
        <section aria-busy="true" className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-52 rounded-[20px]" />
          <Skeleton className="h-52 rounded-[20px]" />
          <Skeleton className="h-52 rounded-[20px]" />
        </section>
      )}

      {!data && !loading && error && (
        <section role="alert" data-surface="glass" className="flex flex-col items-center gap-3 rounded-[20px] p-8 text-center">
          <CloudOff size={28} aria-hidden="true" className="text-faint" />
          <p>{t("air.error")}</p>
          <Button variant="secondary" onClick={() => void reload()} className="rounded-xl">
            <RotateCcw aria-hidden="true" />
            {t("ai.retry")}
          </Button>
        </section>
      )}

      {data && (
        <>
          {data.stale && (
            <p role="status" className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">
              {t("air.stale", { time: formatDateTime(data.fetchedAt, i18n.language) })}
            </p>
          )}
          <section aria-label={t("air.now")} className="grid gap-3 md:grid-cols-3">
            <AqiHero current={data.current} />
            <WindCard current={data.current} />
            <PollutantList current={data.current} />
          </section>
          <section aria-label={t("air.chartTitle")}>
            <AqiChart hours={data.hourly} />
          </section>
          <AirPlanForm />
          <AirAttribution />
        </>
      )}
    </>
  );
}
