import { useTranslation } from "react-i18next";
import { useReports } from "../context/useReports";
import { CATEGORIES } from "../categories";
import NodeIcon from "./Icon";

function Tile({ label, value, accent }) {
  return (
    <div className="rounded-[18px] bg-surface border border-line p-4">
      <div className={`text-3xl font-extrabold ${accent}`}>{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted mt-1">{label}</div>
    </div>
  );
}

export default function StatsPage() {
  const { t } = useTranslation();
  const { stats } = useReports();
  const byCat = stats.byCategory || {};
  const max = Math.max(1, ...Object.values(byCat));
  const rate = stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4">
      <header className="mb-5">
        <h1 className="text-3xl font-extrabold text-ink">{t("stats.title")}</h1>
        <p className="text-muted mt-1">{t("stats.subtitle")}</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Tile label={t("stats.total")} value={stats.total} accent="text-ink" />
        <Tile label={t("stats.open")} value={stats.open} accent="text-sky-300" />
        <Tile label={t("stats.resolved")} value={stats.resolved} accent="text-eco" />
        <Tile label={t("stats.rate")} value={`${rate}%`} accent="text-aqua" />
      </div>

      <section className="rounded-[18px] bg-surface border border-line p-5">
        <h2 className="font-bold text-ink mb-4">{t("stats.byCategory")}</h2>
        {stats.total === 0 ? (
          <p className="text-muted text-sm">{t("stats.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {CATEGORIES.map((c) => {
              const n = byCat[c.id] || 0;
              return (
                <li key={c.id} className="grid grid-cols-[minmax(0,11rem)_1fr_2rem] items-center gap-3 text-sm">
                  <span className="flex items-center gap-2 text-muted truncate">
                    <span style={{ color: c.color }}>
                      <NodeIcon node={c.icon} size={15} />
                    </span>
                    <span className="truncate">{t(`category.${c.id}`)}</span>
                  </span>
                  <span className="h-2.5 rounded-full bg-night-2 overflow-hidden">
                    <span className="block h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: c.color }} />
                  </span>
                  <span className="text-right font-bold text-ink">{n}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
