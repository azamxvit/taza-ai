import { useMemo } from "react";
import { CircleMarker, Popup } from "react-leaflet";
import L from "leaflet";
import { useTranslation } from "react-i18next";
import { MapPinPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { FirePoint, LatLng } from "@/types";
import { ATYRAU_TZ, FIRE_COLORS, fireRadius, SATELLITE_NAMES } from "./fireStyle";

interface FiresLayerProps {
  points: FirePoint[];
  /** Start a report at this point. */
  onReport: (pos: LatLng) => void;
}

/** Thermal anomaly dots (canvas renderer: fast with hundreds of points). Must be rendered inside <MapContainer>. */
export function FiresLayer({ points, onReport }: FiresLayerProps) {
  const { t, i18n } = useTranslation();
  // tolerance widens the tap area around each dot (~30 px), as small dots are hard to hit with a finger.
  const renderer = useMemo(() => L.canvas({ padding: 0.5, tolerance: 10 }), []);

  return (
    <>
      {points.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={fireRadius(p.frp)}
          renderer={renderer}
          bubblingMouseEvents={false}
          pathOptions={{
            color: p.persistent ? "#e8f1ec" : "#0e1512",
            weight: p.persistent ? 2 : 1,
            dashArray: p.persistent ? "3 3" : undefined,
            fillColor: FIRE_COLORS[p.confidence],
            fillOpacity: 0.85,
          }}
        >
          <Popup>
            <article className="flex min-w-56 flex-col gap-2 text-sm">
              <header>
                <h3 className="text-base">{t("fires.anomaly")}</h3>
                <time dateTime={p.time} className="text-xs text-muted-foreground">
                  {formatDateTime(p.time, i18n.language, ATYRAU_TZ)} · {p.daynight === "N" ? t("fires.night") : t("fires.day")}
                </time>
              </header>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                <dt className="text-muted-foreground">{t("fires.confidence")}</dt>
                <dd>{t(`fires.conf.${p.confidence}`)}</dd>
                <dt className="text-muted-foreground">{t("fires.frp")}</dt>
                <dd>{p.frp.toFixed(1)} {t("fires.mw")}</dd>
                <dt className="text-muted-foreground">{t("fires.satellite")}</dt>
                <dd>{SATELLITE_NAMES[p.satellite] ?? p.satellite} (VIIRS)</dd>
              </dl>
              {p.persistent && <p className="text-xs text-warn">{t("fires.persistentNote")}</p>}
              <small>{t("fires.notFire")}</small>
              <Button size="sm" variant="secondary" onClick={() => onReport({ lat: p.lat, lng: p.lng })} className="rounded-xl">
                <MapPinPlus aria-hidden="true" />
                {t("fires.reportHere")}
              </Button>
            </article>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
