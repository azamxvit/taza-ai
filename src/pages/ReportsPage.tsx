import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryFilter } from "@/components/common";
import { ReportCard } from "@/components/reports";
import { useReports } from "@/context";

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

function SkeletonCard() {
  return (
    <li className="overflow-hidden rounded-[18px] border bg-card">
      <Skeleton className="h-40 rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-full" />
      </div>
    </li>
  );
}

export function ReportsPage() {
  const { t } = useTranslation();
  const { reports, loading, error, refresh, filter, setFilter } = useReports();
  const filtered = useMemo(
    () => (filter === "all" ? reports : reports.filter((r) => r.category === filter)),
    [reports, filter]
  );

  return (
    <>
      <header>
        <h1>{t("feed.title")}</h1>
        <p>{t("feed.count", { count: reports.length })}</p>
      </header>

      <CategoryFilter value={filter} onChange={setFilter} className="mb-6" />

      <section aria-live="polite" aria-busy={loading}>
        {loading && (
          <ul className={GRID} aria-label={t("feed.loading")}>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </ul>
        )}

        {!loading && error && (
          <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center">
            <p className="font-semibold text-destructive">{t("errors.network")}</p>
            <small>{error}</small>
            <Button variant="secondary" onClick={() => void refresh()} className="mt-3 flex mx-auto">
              <RefreshCw aria-hidden="true" /> {t("feed.retry")}
            </Button>
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <p className="text-muted-foreground">{t("feed.empty")}</p>
            <Button asChild size="lg" className="mt-4 h-10 rounded-xl px-5 font-bold">
              <Link to="/?new=1">
                <Camera aria-hidden="true" /> {t("nav.report")}
              </Link>
            </Button>
          </div>
        )}

        {!loading && !error && reports.length > 0 && filtered.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">{t("feed.emptyCategory")}</p>
        )}

        {!loading && !error && filtered.length > 0 && (
          <ul className={GRID}>
            {filtered.map((r) => (
              <li key={r._id}>
                <ReportCard report={r} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
