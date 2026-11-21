import { useTranslation } from "react-i18next";
import { Droplets, Navigation2, Thermometer, Wind } from "lucide-react";
import { compassPoint } from "@/lib/aqi";
import type { AirCurrent } from "@/types";

const round = (v: number | null, digits = 0) => (v === null ? "—" : v.toFixed(digits));

/** Pollutant concentrations (µg/m³). */
export function PollutantList({ current }: { current: AirCurrent }) {
  const { t } = useTranslation();
  const rows: [string, number | null][] = [
    ["PM2.5", current.pm25],
    ["PM10", current.pm10],
    ["NO₂", current.no2],
    ["O₃", current.o3],
    ["SO₂", current.so2],
    ["CO", current.co],
  ];
  return (
    <section aria-labelledby="pollutants" data-surface="glass" className="flex flex-col gap-3 rounded-[20px] p-5">
      <header>
        <h2 id="pollutants" className="text-base">{t("air.pollutants")}</h2>
        <small>{t("air.unit")}</small>
      </header>
      <dl className="grid grid-cols-3 gap-2">
        {rows.map(([name, value]) => (
          <div key={name} className="flex flex-col-reverse rounded-xl border bg-background-2 p-2.5">
            <dt className="text-xs text-muted-foreground">{name}</dt>
            <dd className="text-lg font-bold">{round(value, value !== null && value < 10 ? 1 : 0)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Wind (direction it blows FROM, arrow points where it blows TO), temperature and humidity. */
export function WindCard({ current }: { current: AirCurrent }) {
  const { t } = useTranslation();
  const dir = current.windDirection;
  return (
    <section aria-labelledby="wind" data-surface="glass" className="flex flex-col gap-3 rounded-[20px] p-5">
      <h2 id="wind" className="flex items-center gap-2 text-base">
        <Wind size={16} aria-hidden="true" className="text-aqua" />
        {t("air.wind")}
      </h2>
      <p className="flex items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full border bg-background-2">
          {dir !== null && (
            <Navigation2
              size={26}
              aria-hidden="true"
              className="text-aqua"
              style={{ transform: `rotate(${(dir + 180) % 360}deg)` }}
            />
          )}
        </span>
        <span className="flex flex-col">
          <strong className="text-2xl">
            {round(current.windSpeed, 1)} <small className="inline text-sm">{t("air.ms")}</small>
          </strong>
          <span className="text-sm text-muted-foreground">
            {dir !== null && t("air.from", { dir: t(`air.compassFrom.${compassPoint(dir)}`) })}
            {current.windGusts !== null && ` · ${t("air.gusts", { value: round(current.windGusts, 1) })}`}
          </span>
        </span>
      </p>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 rounded-xl border bg-background-2 p-2.5">
          <Thermometer size={15} aria-hidden="true" className="text-faint" />
          <dt className="sr-only">{t("air.temperature")}</dt>
          <dd>{round(current.temperature)} °C</dd>
        </div>
        <div className="flex items-center gap-2 rounded-xl border bg-background-2 p-2.5">
          <Droplets size={15} aria-hidden="true" className="text-faint" />
          <dt className="sr-only">{t("air.humidity")}</dt>
          <dd>{round(current.humidity)}%</dd>
        </div>
      </dl>
      <small>{t("air.windHint")}</small>
    </section>
  );
}
