import { useTranslation } from "react-i18next";
import { aqiCategory, localHour } from "@/lib/aqi";
import type { AirCurrent } from "@/types";

/** Big current US AQI number with its EPA band, label and short advice. */
export function AqiHero({ current }: { current: AirCurrent }) {
  const { t } = useTranslation();
  const cat = aqiCategory(current.usAqi);

  return (
    <section aria-labelledby="aqi-now" data-surface="glass" className="flex flex-col gap-4 rounded-[20px] p-5">
      <header className="flex items-baseline justify-between gap-2">
        <h2 id="aqi-now" className="text-base">{t("air.now")}</h2>
        <small>
          {t("air.atTime", { time: localHour(current.time) })}
        </small>
      </header>

      <p className="flex items-center gap-4">
        <data
          value={current.usAqi ?? ""}
          className="flex size-24 shrink-0 flex-col items-center justify-center rounded-[20px] text-4xl leading-none font-extrabold"
          style={cat ? { background: cat.color, color: cat.ink } : undefined}
        >
          {current.usAqi ?? "—"}
          <span className="mt-1 text-[11px] font-bold tracking-wide opacity-80">US AQI</span>
        </data>
        <span className="flex flex-col gap-1">
          <strong className="text-xl">{cat ? t(`air.cat.${cat.id}.label`) : t("air.noData")}</strong>
          {cat && <span className="text-sm text-muted-foreground">{t(`air.cat.${cat.id}.advice`)}</span>}
        </span>
      </p>

      <ol aria-label={t("air.scale")} className="grid grid-cols-6 gap-[2px]">
        {(["good", "moderate", "sensitive", "unhealthy", "very_unhealthy", "hazardous"] as const).map((id) => (
          <li key={id} className="flex flex-col gap-1">
            <span
              aria-hidden="true"
              className={`h-1.5 rounded-full ${cat?.id === id ? "" : "opacity-35"}`}
              style={{ background: `var(--aqi-${id.replace("_", "-")})` }}
            />
            <small className={`truncate text-[10px] ${cat?.id === id ? "font-bold text-foreground" : ""}`}>
              {t(`air.cat.${id}.short`)}
            </small>
          </li>
        ))}
      </ol>
    </section>
  );
}
