import { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
  ScaleControl,
} from "react-leaflet";
import L from "leaflet";
import ReportForm from "./ReportForm";
import { useReports } from "../context/useReports";
import { firstImage } from "../api";
import { coloredIcon, selectionIcon, userDotIcon } from "../leafletIcon";
import { categoryById } from "../categories";
import { BASE_LAYERS } from "../leafletLayers";
import ImageGallery from "./ImageGallery";

function ClickSelector({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng);
    },
  });
  return null;
}

// Fits the map to all report markers once, after the first load.
function FitController({ reports }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || reports.length === 0) return;
    const bounds = reports.map((r) => [r.lat, r.lng]);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    fitted.current = true;
  }, [map, reports]);
  return null;
}

// Flies to a specific report when ?focus=<id> or #focus=<id> is present.
// Reacts to hash changes so "View in map" works even if the map is already open.
function FocusController({ reports }) {
  const map = useMap();

  useEffect(() => {
    const fly = () => {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.match(/focus=([^&]+)/);
      const id = params.get("focus") || (hash ? hash[1] : null);
      if (!id) return;
      const r = reports.find((x) => x._id === id);
      if (!r) return;
      map.flyTo([r.lat, r.lng], 17, { duration: 1.2 });
      map.once("moveend", () => {
        // open the popup for the focused report, if present
        const m = map._layers
          ? Object.values(map._layers).find(
              (l) => l.getLatLng && l.options && l.options.reportId === id
            )
          : null;
        if (m) m.openPopup();
      });
      // clear so a reload doesn't re-fly
      const url = new URL(window.location.href);
      url.searchParams.delete("focus");
      url.hash = "";
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    };

    fly();
    window.addEventListener("hashchange", fly);
    return () => window.removeEventListener("hashchange", fly);
  }, [map, reports]);

  return null;
}

// Circular photo marker (Snapchat-style "memory" pin).
function photoIcon(url) {
  return L.divIcon({
    className: "",
    html: `<div style="width:40px;height:40px;border-radius:50%;overflow:hidden;border:3px solid #14b8a6;box-shadow:0 2px 6px rgba(0,0,0,.5);background:#0f172a;">
      <img src="${url}" style="width:100%;height:100%;object-fit:cover;" />
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

function LayerSwitcher() {
  const map = useMap();
  const [active, setActive] = useState("Street");

  useEffect(() => {
    BASE_LAYERS.Street.addTo(map);
    return () => map.removeLayer(BASE_LAYERS.Street);
  }, [map]);

  const pick = (name) => {
    Object.entries(BASE_LAYERS).forEach(([key, layer]) => {
      if (key === name) layer.addTo(map);
      else if (map.hasLayer(layer)) map.removeLayer(layer);
    });
    setActive(name);
  };

  return (
    <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1 bg-gray-900/90 backdrop-blur rounded-lg p-1.5 shadow-lg border border-gray-700">
      {Object.keys(BASE_LAYERS).map((name) => (
        <button
          key={name}
          onClick={() => pick(name)}
          className={`text-xs font-medium px-3 py-1.5 rounded transition ${
            active === name ? "bg-teal-600 text-white" : "text-gray-300 hover:bg-gray-700"
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

function LocateButton() {
  const map = useMap();
  const [loc, setLoc] = useState(null);

  const go = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = [pos.coords.latitude, pos.coords.longitude];
        setLoc(ll);
        map.flyTo(ll, 16);
      },
      () => alert("Could not get your location.")
    );
  };

  return (
    <>
      <button
        onClick={go}
        title="Locate me"
        className="absolute bottom-20 right-3 z-[1000] w-10 h-10 rounded-full bg-gray-900/90 backdrop-blur border border-gray-700 text-white shadow-lg hover:bg-gray-700 transition"
      >
        ⊕
      </button>
      {loc && (
        <Marker position={loc} icon={userDotIcon}>
          <Popup>You are here</Popup>
        </Marker>
      )}
    </>
  );
}

// Actions inside a Leaflet popup: upvote, mark solved (kept), report false (removed).
function ReportPopupActions({ report, onResolve, onUpvote }) {
  const [busy, setBusy] = useState(false);
  const go = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  const resolved = report.status === "resolved";
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <button
        onClick={() => go(() => onUpvote(report._id))}
        disabled={busy}
        className="text-xs font-semibold px-2 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
      >
        ▲ {report.upvotes || 0}
      </button>
      {!resolved && (
        <button
          onClick={() => go(() => onResolve(report._id, "solved"))}
          disabled={busy}
          className="text-xs font-semibold px-2 py-1 rounded bg-green-600 text-white disabled:opacity-50"
        >
          ✓ Solved
        </button>
      )}
      <button
        onClick={() => go(() => onResolve(report._id, "false"))}
        disabled={busy}
        className="text-xs font-semibold px-2 py-1 rounded bg-amber-600 text-white disabled:opacity-50"
      >
        ⚑ False
      </button>
    </div>
  );
}

export default function MapView() {
  const center = [9.0108, 38.7613]; // Addis Ababa
  const { reports, addReport, filter, resolve, upvote } = useReports();
  const [selectedPos, setSelectedPos] = useState(null);
  const [memories, setMemories] = useState(false); // photo-thumbnail map mode

  const handleSubmit = async (payload) => {
    await addReport(payload);
    setSelectedPos(null);
  };

  const visible = reports.filter((r) => filter === "all" || r.category === filter);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-2 text-white">CleanCity – Report an Issue</h2>
      <p className="mb-4 text-gray-400">
        Click anywhere on the map to report trash, pollution, hazards, or anything
        affecting the environment. Switch base maps with the control on the right.
      </p>

      <div className="rounded-lg overflow-hidden shadow-lg mb-6 h-[500px] relative z-0">
        <MapContainer center={center} zoom={13} className="h-full w-full">
          <ScaleControl position="bottomleft" />
          <FitController reports={reports} />
          <FocusController reports={reports} />
          <ClickSelector onSelect={(pos) => setSelectedPos(pos)} />
          <LayerSwitcher />
          <LocateButton />

          {/* Memories toggle (top-left) */}
          <button
            onClick={() => setMemories((m) => !m)}
            className={`absolute top-3 left-3 z-[1000] text-xs font-semibold px-3 py-1.5 rounded-lg backdrop-blur border transition ${
              memories
                ? "bg-purple-600 text-white border-purple-500"
                : "bg-gray-900/90 text-gray-200 border-gray-700 hover:bg-gray-700"
            }`}
          >
            📸 Memories {memories ? "ON" : "OFF"}
          </button>

          {/* Existing reports (respect shared category filter) */}
          {visible.map((r) => {
            const cover = firstImage(r);
            const isMemories = memories && cover;
            return (
              <Marker
                key={r._id}
                position={[r.lat, r.lng]}
                reportId={r._id}
                icon={
                  isMemories
                    ? photoIcon(cover)
                    : coloredIcon(categoryById(r.category).color, r.status === "resolved")
                }
                eventHandlers={{
                  click(e) {
                    e.originalEvent.stopPropagation();
                  },
                }}
              >
                <Popup>
                  <div className="text-gray-800 max-w-[240px]">
                    <strong>{r.title}</strong>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      {categoryById(r.category).label}
                      {r.status === "resolved" && " · ✓ Resolved"}
                    </div>
                    {r.desc && <p className="mt-1 text-sm">{r.desc}</p>}
                    {cover && (
                      <div className="mt-2">
                        <ImageGallery
                          images={r.imageUrls && r.imageUrls.length ? r.imageUrls : [r.imageUrl]}
                          alt={r.title}
                        />
                      </div>
                    )}
                    <ReportPopupActions report={r} onResolve={resolve} onUpvote={upvote} />
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* The spot you clicked — teal pin (no broken default icon) */}
          {selectedPos && (
            <Marker position={selectedPos} icon={selectionIcon}>
              <Popup>New report location</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {selectedPos && (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-xl">
          <ReportForm pos={selectedPos} onSubmit={handleSubmit} onCancel={() => setSelectedPos(null)} />
        </div>
      )}
    </div>
  );
}
