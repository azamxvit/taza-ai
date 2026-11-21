import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Wind } from "lucide-react";
import { useAir } from "@/hooks";
import { aqiCategory } from "@/lib/aqi";

/** Small "air now" pill on the map that links to the Air page. Hidden if data is unavailable. */
export function AirChip({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { data } = useAir();
  const aqi = data?.current.usAqi ?? null;
  const cat = aqiCategory(aqi);
  if (!data || !cat) return null;

  return (
    <Link
      to="/air"
      data-surface="glass"
      aria-label={`${t("nav.air")}: US AQI ${aqi}, ${t(`air.cat.${cat.id}.label`)}`}
      className={`flex items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5 text-xs font-semibold transition hover:brightness-110 ${className}`}
    >
      <span className="flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold" style={{ background: cat.color, color: cat.ink }}>
        {aqi}
      </span>
      <Wind size={14} aria-hidden="true" className="text-muted-foreground" />
      {t(`air.cat.${cat.id}.short`)}
    </Link>
  );
}
