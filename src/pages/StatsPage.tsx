import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { NodeIcon } from "@/components/common";
import { useReports } from "@/context";
import { CATEGORIES } from "@/lib/categories";

function Tile({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <Card className="gap-1 rounded-[18px] border p-4 ring-0">
      <dd className={`m-0 text-3xl font-extrabold ${accent}`}>{value}</dd>
      <dt>{label}</dt>
    </Card>
  );
}

export function StatsPage() {
  const { t } = useTranslation();
  const { stats } = useReports();
  const byCat = stats.byCategory;
  const max = Math.max(1, ...Object.values(byCat).map((n) => n ?? 0));
  const rate = stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0;

  return (
    <>
      <header>
        <h1>{t("stats.title")}</h1>
        <p>{t("stats.subtitle")}</p>
      </header>

      <section aria-label={t("stats.title")}>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4 [&>div]:flex-col-reverse">
          <Tile label={t("stats.total")} value={stats.total} accent="text-foreground" />
          <Tile label={t("stats.open")} value={stats.open} accent="text-sky-300" />
          <Tile label={t("stats.resolved")} value={stats.resolved} accent="text-primary" />
          <Tile label={t("stats.rate")} value={`${rate}%`} accent="text-aqua" />
        </dl>
      </section>

      <section>
        <Card className="rounded-[18px] border p-5 ring-0">
          <h2 className="text-base">{t("stats.byCategory")}</h2>
          {stats.total === 0 ? (
            <p className="text-sm text-muted-foreground">{t("stats.empty")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {CATEGORIES.map((c) => {
                const n = byCat[c.id] ?? 0;
                return (
                  <li key={c.id} className="grid grid-cols-[minmax(0,14rem)_1fr_2.5rem] items-center gap-3 text-sm">
                    <span className="flex items-center gap-2 truncate text-muted-foreground">
                      <span style={{ color: c.color }}>
                        <NodeIcon node={c.icon} size={15} />
                      </span>
                      <span className="truncate">{t(`category.${c.id}`)}</span>
                    </span>
                    <meter
                      min={0}
                      max={max}
                      value={n}
                      aria-label={t(`category.${c.id}`)}
                      className="sr-only"
                    />
                    <span aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-background-2">
                      <span className="block h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: c.color }} />
                    </span>
                    <data value={n} className="text-right font-bold">
                      {n}
                    </data>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>
    </>
  );
}
