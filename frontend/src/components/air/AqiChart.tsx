import { useState } from "react";
import { useTranslation } from "react-i18next";
import { aqiCategory, compassPoint, localHour } from "@/lib/aqi";
import type { AirHour } from "@/types";

const GRID = [50, 100, 150, 200, 300];

/**
 * 48-hour US AQI forecast as thin bars coloured by EPA band.
 * Each bar is focusable and has its own tooltip; the same values are in the table below.
 */
export function AqiChart({ hours }: { hours: AirHour[] }) {
  const { t } = useTranslation();
  const [active, setActive] = useState<number | null>(null);
  const values = hours.map((h) => h.usAqi ?? 0);
  const top = Math.max(100, Math.ceil(Math.max(...values) / 50) * 50);
  const lines = GRID.filter((g) => g <= top);
  const today = hours[0]?.time.slice(0, 10);
  const shown = active !== null ? hours[active] : null;
  const shownCat = shown ? aqiCategory(shown.usAqi) : null;

  const describe = (h: AirHour) => {
    const cat = aqiCategory(h.usAqi);
    return `${dayLabel(h.time)} ${localHour(h.time)} — US AQI ${h.usAqi ?? "—"}${cat ? `, ${t(`air.cat.${cat.id}.label`)}` : ""}`;
  };
  const dayLabel = (iso: string) => (iso.slice(0, 10) === today ? t("air.today") : t("air.tomorrow"));

  return (
    <figure data-surface="glass" className="flex flex-col gap-3 rounded-[20px] p-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <strong className="text-base">{t("air.chartTitle")}</strong>
        <small>{t("air.chartHint")}</small>
      </figcaption>

      <div className="relative h-44 pl-8">
        {/* Recessive grid with AQI band boundaries */}
        {lines.map((g) => (
          <span
            key={g}
            aria-hidden="true"
            className="absolute right-0 left-8 border-t border-dashed border-border/70"
            style={{ bottom: `${(g / top) * 100}%` }}
          >
            <span className="absolute -top-2 -left-8 w-7 text-right text-[10px] text-faint">{g}</span>
          </span>
        ))}

        <ol aria-label={t("air.chartTitle")} className="relative flex h-full items-end gap-[2px]" onPointerLeave={() => setActive(null)}>
          {hours.map((h, i) => {
            const cat = aqiCategory(h.usAqi);
            const height = h.usAqi === null ? 0 : Math.max(2, (h.usAqi / top) * 100);
            const newDay = i > 0 && h.time.slice(0, 10) !== hours[i - 1].time.slice(0, 10);
            return (
              <li
                key={h.time}
                tabIndex={0}
                aria-label={describe(h)}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className={`relative flex h-full flex-1 cursor-default items-end outline-none ${newDay ? "border-l border-border" : ""}`}
              >
                <span
                  aria-hidden="true"
                  className={`w-full rounded-t-[4px] transition-[filter] ${active === i ? "brightness-125" : ""}`}
                  style={{ height: `${height}%`, background: cat?.color ?? "var(--muted)" }}
                />
                {active === i && <span aria-hidden="true" className="absolute inset-x-0 -bottom-1 h-0.5 rounded bg-foreground" />}
              </li>
            );
          })}
        </ol>

        {shown && active !== null && (
          <p
            role="status"
            className="pointer-events-none absolute top-0 z-10 flex -translate-x-1/2 flex-col rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg"
            style={{ left: `calc(2rem + (100% - 2rem) * ${(active + 0.5) / hours.length})` }}
          >
            <strong className="text-base leading-tight">{shown.usAqi ?? "—"} <small className="inline">US AQI</small></strong>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {shownCat && <span aria-hidden="true" className="h-0.5 w-3 rounded" style={{ background: shownCat.color }} />}
              {shownCat ? t(`air.cat.${shownCat.id}.label`) : t("air.noData")}
            </span>
            <span className="text-muted-foreground">
              {dayLabel(shown.time)}, {localHour(shown.time)} · PM2.5 {shown.pm25 ?? "—"}
              {shown.windSpeed !== null && ` · ${shown.windSpeed.toFixed(1)} ${t("air.ms")}`}
            </span>
          </p>
        )}
      </div>

      {/* Time axis: a label every 6 hours */}
      <ol aria-hidden="true" className="flex pl-8 text-[10px] text-faint">
        {hours.map((h, i) => (
          <li key={h.time} className="relative flex-1">
            {i % 6 === 0 && <span className="absolute left-0 whitespace-nowrap">{i === 0 ? t("air.nowShort") : localHour(h.time)}</span>}
          </li>
        ))}
      </ol>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted-foreground">{t("air.table")}</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-xl border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-card">
              <tr>
                <th className="p-2">{t("air.time")}</th>
                <th className="p-2">US AQI</th>
                <th className="p-2">PM2.5</th>
                <th className="p-2">PM10</th>
                <th className="p-2">{t("air.wind")}</th>
              </tr>
            </thead>
            <tbody>
              {hours.map((h) => {
                const cat = aqiCategory(h.usAqi);
                return (
                  <tr key={h.time} className="border-t">
                    <td className="p-2 whitespace-nowrap">{dayLabel(h.time)} {localHour(h.time)}</td>
                    <td className="p-2">
                      {h.usAqi ?? "—"} {cat && <span className="text-muted-foreground">· {t(`air.cat.${cat.id}.short`)}</span>}
                    </td>
                    <td className="p-2">{h.pm25 ?? "—"}</td>
                    <td className="p-2">{h.pm10 ?? "—"}</td>
                    <td className="p-2 whitespace-nowrap">
                      {h.windSpeed !== null ? `${h.windSpeed.toFixed(1)} ${t("air.ms")}` : "—"}
                      {h.windDirection !== null && `, ${t(`air.compass.${compassPoint(h.windDirection)}`)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
