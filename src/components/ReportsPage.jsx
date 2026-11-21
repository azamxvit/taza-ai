import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Camera, RefreshCw } from "lucide-react";
import { useReports } from "../context/useReports";
import CategoryFilter from "./CategoryFilter";
import ReportCard from "./ReportCard";

function SkeletonCard() {
  return (
    <div className="rounded-[18px] bg-surface border border-line overflow-hidden">
      <div className="skeleton h-40 rounded-none" />
      <div className="p-4 flex flex-col gap-2">
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-5 w-4/5" />
        <div className="skeleton h-4 w-full" />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const { reports, loading, error, refresh, filter, setFilter } = useReports();
  const filtered = useMemo(
    () => (filter === "all" ? reports : reports.filter((r) => r.category === filter)),
    [reports, filter]
  );

  return (
    <div className="max-w-6xl mx-auto px-4">
      <header className="mb-5">
        <h1 className="text-3xl font-extrabold text-ink">{t("feed.title")}</h1>
        <p className="text-muted mt-1">{t("feed.count", { count: reports.length })}</p>
      </header>

      <CategoryFilter value={filter} onChange={setFilter} className="mb-6 -mx-4 px-4" />

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true" aria-label={t("feed.loading")}>
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 p-6 text-center">
          <p className="text-danger font-semibold">{t("errors.network")}</p>
          <p className="text-xs text-muted mt-1">{error}</p>
          <button onClick={refresh} className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-raised text-ink font-semibold">
            <RefreshCw size={16} aria-hidden="true" /> {t("feed.retry")}
          </button>
        </div>
      )}

      {!loading && !error && reports.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center">
          <p className="text-muted">{t("feed.empty")}</p>
          <Link to="/?new=1" className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-eco text-night font-bold">
            <Camera size={18} aria-hidden="true" /> {t("nav.report")}
          </Link>
        </div>
      )}

      {!loading && !error && reports.length > 0 && filtered.length === 0 && (
        <p className="text-center text-muted py-12">{t("feed.emptyCategory")}</p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <ReportCard key={r._id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}
