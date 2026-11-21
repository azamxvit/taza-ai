import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, ScaleControl, useMapEvents } from "react-leaflet";
import type L from "leaflet";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, MousePointerClick, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AirChip } from "@/components/air";
import { CategoryFilter } from "@/components/common";
import { FiresLayer, FiresPanel } from "@/components/fires";
import { ReportDetail, ReportForm } from "@/components/reports";
import { useReports } from "@/context";
import { DESKTOP_QUERY, useFires, useSlow } from "@/hooks";
import { firstImage } from "@/lib/api";
import type { LatLng, NewReportPayload, Report } from "@/types";
import { ATYRAU_CENTER, ATYRAU_ZOOM, createBaseLayer, type BaseLayerId } from "./layers";
import { MapControls } from "./MapControls";
import { MapSheet } from "./MapSheet";
import { photoIcon, reportIcon, selectionIcon, userDotIcon } from "./mapIcons";

function ClickHandler({ onClick }: { onClick: (latlng: LatLng) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng) });
  return null;
}

/** Fly to a report, leaving room for the bottom sheet (mobile) or side panel (desktop). */
function flyToReport(map: L.Map, report: Report) {
  const zoom = Math.max(map.getZoom(), 15);
  const offset: L.PointTuple = window.matchMedia(DESKTOP_QUERY).matches ? [210, 0] : [0, map.getSize().y * 0.25];
  const point = map.project([report.lat, report.lng], zoom).add(offset);
  map.flyTo(map.unproject(point, zoom), zoom, { duration: 0.8 });
}

export function MapScreen() {
  const { t } = useTranslation();
  const { reports, loading, error, refresh, addReport, filter, setFilter, resolve, upvote, removeReport, lastAddedId } = useReports();
  const slow = useSlow(loading);
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("r");
  const isNew = params.get("new") === "1";

  const [map, setMap] = useState<L.Map | null>(null);
  const [layer, setLayer] = useState<BaseLayerId>("dark");
  const [photos, setPhotos] = useState(false);
  const [firesOn, setFiresOn] = useState(false);
  const fires = useFires(firesOn);
  const [pickPos, setPickPos] = useState<LatLng | null>(null);
  const [userPos, setUserPos] = useState<LatLng | null>(null);

  const visible = useMemo(() => reports.filter((r) => filter === "all" || r.category === filter), [reports, filter]);
  const selected = selectedId ? reports.find((r) => r._id === selectedId) : undefined;
  const formPos: LatLng | null = isNew
    ? pickPos ?? (map ? map.getCenter() : { lat: ATYRAU_CENTER[0], lng: ATYRAU_CENTER[1] })
    : null;
  const sheetOpen = Boolean(selectedId || isNew);

  useEffect(() => {
    if (!map) return;
    const tile = createBaseLayer(layer).addTo(map);
    return () => {
      tile.remove();
    };
  }, [map, layer]);

  // Fly to the selected report (e.g. opened from the feed via /?r=<id>).
  const selectedKey = selected?._id;
  useEffect(() => {
    if (map && selected) flyToReport(map, selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the selection changes
  }, [map, selectedKey]);

  // Switching the satellite layer on zooms out to the whole oblast once the data arrives.
  const firesBbox = fires.data?.bbox.join(",");
  useEffect(() => {
    if (!map || !firesOn || !fires.data) return;
    const [w, s, e, n] = fires.data.bbox;
    // Leave room for the fires panel: left column on desktop, bottom card on mobile.
    const desktop = window.matchMedia(DESKTOP_QUERY).matches;
    map.flyToBounds(
      [
        [s, w],
        [n, e],
      ],
      {
        paddingTopLeft: desktop ? [400, 130] : [16, 170],
        paddingBottomRight: desktop ? [80, 24] : [64, 440],
        duration: 0.8,
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the layer is switched on / data arrives
  }, [map, firesOn, firesBbox]);

  const reportAt = (pos: LatLng) => {
    map?.closePopup();
    setPickPos(pos);
    setParams({ new: "1" });
  };

  const closeSheet = useCallback(() => {
    setPickPos(null);
    setParams({}, { replace: true });
  }, [setParams]);

  const onMapClick = (latlng: LatLng) => {
    if (selectedId) return closeSheet();
    setPickPos(latlng);
    if (!isNew) setParams({ new: "1" });
  };

  const handleSubmit = async (payload: NewReportPayload) => {
    const report = await addReport(payload);
    setPickPos(null);
    setParams({ r: report._id }, { replace: true });
  };

  const locate = () => {
    if (!navigator.geolocation || !map) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(ll);
        map.flyTo(ll, 16);
        if (isNew) setPickPos(ll);
      },
      () => toast.error(t("map.locateError")),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <main className="fixed inset-0 min-h-0 p-0">
      <h1 className="sr-only">{t("nav.map")}</h1>
      <MapContainer ref={setMap} center={ATYRAU_CENTER} zoom={ATYRAU_ZOOM} zoomControl={false} className="z-0 size-full">
        <ScaleControl position="bottomleft" />
        <ClickHandler onClick={onMapClick} />

        {visible.map((r) => {
          const cover = photos ? firstImage(r) : null;
          return (
            <Marker
              key={r._id}
              position={[r.lat, r.lng]}
              icon={cover ? photoIcon(cover, r) : reportIcon(r, { isNew: r._id === lastAddedId, selected: r._id === selectedId })}
              title={r.title}
              alt={r.title}
              eventHandlers={{ click: () => setParams({ r: r._id }) }}
            />
          );
        })}

        {firesOn && fires.data && <FiresLayer points={fires.data.points} onReport={reportAt} />}

        {formPos && <Marker position={formPos} icon={selectionIcon} interactive={false} />}
        {userPos && <Marker position={userPos} icon={userDotIcon} interactive={false} title={t("map.youAreHere")} />}
      </MapContainer>

      <CategoryFilter
        value={filter}
        onChange={setFilter}
        className="fixed top-[76px] right-3 left-3 z-[1000] py-1 md:right-auto md:left-4 md:max-w-[calc(100%-480px)]"
      />

      <AirChip className="fixed top-[124px] left-3 z-[1000] md:left-4" />

      <MapControls
        layer={layer}
        onLayerChange={setLayer}
        photos={photos}
        onTogglePhotos={() => setPhotos((v) => !v)}
        fires={firesOn}
        onToggleFires={() => setFiresOn((v) => !v)}
        onLocate={locate}
        onZoomIn={() => map?.zoomIn()}
        onZoomOut={() => map?.zoomOut()}
        shifted={sheetOpen}
      />

      {firesOn && (
        <FiresPanel
          data={fires.data}
          loading={fires.loading}
          error={fires.error}
          onRetry={fires.retry}
          onClose={() => setFiresOn(false)}
          className={`fixed right-3 bottom-[112px] left-3 z-[1000] md:right-auto md:bottom-6 md:left-4 md:w-[360px] ${sheetOpen ? "max-md:hidden" : ""}`}
        />
      )}

      {!sheetOpen && !firesOn && error && !loading && (
        <p
          role="alert"
          data-surface="glass"
          className="fixed bottom-[112px] left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-2 rounded-full py-1.5 pr-1.5 pl-4 text-xs font-semibold whitespace-nowrap text-destructive md:bottom-6"
        >
          <WifiOff size={14} aria-hidden="true" />
          {t("errors.network")}
          <Button size="xs" variant="secondary" onClick={() => void refresh()} className="rounded-full">
            {t("feed.retry")}
          </Button>
        </p>
      )}

      {!sheetOpen && !firesOn && !error && (
        <p
          role="status"
          data-surface="glass"
          className="pointer-events-none fixed bottom-[112px] left-1/2 z-[1000] flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground animate-in fade-in md:bottom-6"
        >
          {loading ? (
            <Loader2 size={14} className="shrink-0 animate-spin text-primary" aria-hidden="true" />
          ) : (
            <MousePointerClick size={14} className="shrink-0 text-primary" aria-hidden="true" />
          )}
          {loading ? (slow ? t("errors.waking") : t("feed.loading")) : t("map.hint")}
        </p>
      )}

      <MapSheet open={sheetOpen} onClose={closeSheet} title={isNew ? t("form.title") : selected?.title ?? t("nav.reports")}>
        {isNew && formPos && <ReportForm pos={formPos} onSubmit={handleSubmit} onCancel={closeSheet} />}
        {!isNew && selected && (
          <ReportDetail
            key={selected._id}
            report={selected}
            onResolve={resolve}
            onUpvote={upvote}
            onDelete={removeReport}
            onClose={closeSheet}
          />
        )}
        {!isNew && !selected && (
          <p className="py-10 text-center text-muted-foreground">{loading ? t("feed.loading") : t("report.notFound")}</p>
        )}
      </MapSheet>
    </main>
  );
}
