import { useEffect, useMemo, useState, useCallback } from "react";
import { MapContainer, Marker, useMapEvents, ScaleControl } from "react-leaflet";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Layers, LocateFixed, Images, Plus, Minus, MousePointerClick, Loader2 } from "lucide-react";
import { useReports } from "../context/useReports";
import { firstImage } from "../api";
import { reportIcon, photoIcon, selectionIcon, userDotIcon } from "../mapIcons";
import { BASE_LAYER_IDS, createBaseLayer, ATYRAU_CENTER, ATYRAU_ZOOM } from "../leafletLayers";
import CategoryFilter from "./CategoryFilter";
import Sheet from "./Sheet";
import ReportDetail from "./ReportDetail";
import ReportForm from "./ReportForm";

const isDesktop = () => window.matchMedia("(min-width: 768px)").matches;

function ClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick(e.latlng) });
  return null;
}

// Fly to a report, leaving room for the bottom sheet (mobile) or side panel (desktop).
function flyToReport(map, report) {
  const zoom = Math.max(map.getZoom(), 15);
  const size = map.getSize();
  const offset = isDesktop() ? [210, 0] : [0, size.y * 0.25];
  const point = map.project([report.lat, report.lng], zoom).add(offset);
  map.flyTo(map.unproject(point, zoom), zoom, { duration: 0.8 });
}

function ControlButton({ label, active, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={`w-11 h-11 rounded-2xl flex items-center justify-center transition ${
        active ? "bg-eco text-night" : "glass text-ink hover:text-eco"
      }`}
    >
      {children}
    </button>
  );
}

export default function MapScreen() {
  const { t } = useTranslation();
  const { reports, loading, addReport, filter, setFilter, resolve, upvote, removeReport, lastAddedId } = useReports();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("r");
  const isNew = params.get("new") === "1";

  const [map, setMap] = useState(null);
  const [layer, setLayer] = useState("dark");
  const [layerMenu, setLayerMenu] = useState(false);
  const [photos, setPhotos] = useState(false);
  const [pickPos, setPickPos] = useState(null);
  const [userPos, setUserPos] = useState(null);

  const visible = useMemo(
    () => reports.filter((r) => filter === "all" || r.category === filter),
    [reports, filter]
  );
  const selected = selectedId ? reports.find((r) => r._id === selectedId) : null;
  const formPos = isNew ? pickPos || (map ? map.getCenter() : { lat: ATYRAU_CENTER[0], lng: ATYRAU_CENTER[1] }) : null;
  const sheetOpen = Boolean(selectedId || isNew);

  // Base tile layer.
  useEffect(() => {
    if (!map) return;
    const tile = createBaseLayer(layer).addTo(map);
    return () => tile.remove();
  }, [map, layer]);

  // Fly to the selected report (e.g. opened from the feed via /?r=<id>).
  useEffect(() => {
    if (map && selected) flyToReport(map, selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selected?._id]);

  const closeSheet = useCallback(() => {
    setPickPos(null);
    setParams({}, { replace: true });
  }, [setParams]);

  const onMapClick = (latlng) => {
    if (selectedId) return closeSheet();
    setPickPos(latlng);
    if (!isNew) setParams({ new: "1" });
  };

  const handleSubmit = async (payload) => {
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
      () => alert(t("map.locateError")),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="fixed inset-0">
      <MapContainer
        ref={setMap}
        center={ATYRAU_CENTER}
        zoom={ATYRAU_ZOOM}
        zoomControl={false}
        className="h-full w-full z-0"
      >
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
              keyboard
              eventHandlers={{ click: () => setParams({ r: r._id }) }}
            />
          );
        })}

        {formPos && <Marker position={formPos} icon={selectionIcon} interactive={false} />}
        {userPos && <Marker position={userPos} icon={userDotIcon} interactive={false} title={t("map.youAreHere")} />}
      </MapContainer>

      {/* Category filters under the top bar */}
      <CategoryFilter
        value={filter}
        onChange={setFilter}
        className="fixed z-[1000] top-[76px] left-3 right-3 md:left-4 md:right-auto md:max-w-[calc(100%-480px)] py-1"
      />

      {/* Right-hand map controls */}
      <div
        className={`fixed z-[1000] right-3 top-[128px] flex flex-col gap-2 transition-[right] ${
          sheetOpen ? "md:right-[452px]" : "md:right-4"
        }`}
      >
        <div className="relative">
          <ControlButton label={t("map.layer")} active={layerMenu} onClick={() => setLayerMenu((v) => !v)}>
            <Layers size={20} />
          </ControlButton>
          {layerMenu && (
            <div className="glass absolute right-13 top-0 rounded-2xl p-1.5 flex flex-col gap-1 min-w-32 animate-fade-in">
              {BASE_LAYER_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={layer === id}
                  onClick={() => {
                    setLayer(id);
                    setLayerMenu(false);
                  }}
                  className={`text-left text-sm font-semibold px-3 py-2 rounded-xl ${
                    layer === id ? "bg-eco text-night" : "text-muted hover:text-ink hover:bg-raised"
                  }`}
                >
                  {t(`map.layers.${id}`)}
                </button>
              ))}
            </div>
          )}
        </div>
        <ControlButton label={t("map.photos")} active={photos} onClick={() => setPhotos((v) => !v)}>
          <Images size={20} />
        </ControlButton>
        <ControlButton label={t("map.locate")} onClick={locate}>
          <LocateFixed size={20} />
        </ControlButton>
        <div className="hidden md:flex flex-col gap-2 mt-2">
          <ControlButton label="+" onClick={() => map?.zoomIn()}>
            <Plus size={20} />
          </ControlButton>
          <ControlButton label="−" onClick={() => map?.zoomOut()}>
            <Minus size={20} />
          </ControlButton>
        </div>
      </div>

      {/* Hint / loading pill */}
      {!sheetOpen && (
        <div className="glass fixed z-[1000] left-1/2 -translate-x-1/2 bottom-[112px] md:bottom-6 rounded-full px-4 py-2 text-xs font-semibold text-muted flex items-center gap-2 whitespace-nowrap pointer-events-none animate-fade-in">
          {loading ? (
            <Loader2 size={14} className="animate-spin text-eco" aria-hidden="true" />
          ) : (
            <MousePointerClick size={14} className="text-eco" aria-hidden="true" />
          )}
          {loading ? t("feed.loading") : t("map.hint")}
        </div>
      )}

      <Sheet open={sheetOpen} onClose={closeSheet} labelledBy={isNew ? "report-form-title" : "report-title"}>
        {isNew && formPos && <ReportForm key="new" pos={formPos} onSubmit={handleSubmit} onCancel={closeSheet} />}
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
          <p className="py-10 text-center text-muted">{loading ? t("feed.loading") : t("report.notFound")}</p>
        )}
      </Sheet>
    </div>
  );
}
