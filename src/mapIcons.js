import L from "leaflet";
import { categoryById, severityOf, severityColor, markerSize } from "./categories";
import { nodeToSvg } from "./iconSvg";

// We never use Leaflet's default PNG markers (they break under Vite asset
// hashing). All markers are divIcons with inline SVG.

const cache = new Map();

// Report marker: color + size from severity, category icon inside.
export function reportIcon(report, { isNew = false, selected = false } = {}) {
  const sev = severityOf(report);
  const cat = categoryById(report.category);
  const resolved = report.status === "resolved";
  const key = `${cat.id}|${sev}|${resolved}|${isNew}|${selected}`;
  if (cache.has(key)) return cache.get(key);
  const size = markerSize(sev);
  const color = severityColor(sev);
  const classes = ["taza-marker", resolved && "is-resolved", isNew && "is-new", selected && "is-selected"]
    .filter(Boolean)
    .join(" ");
  const icon = L.divIcon({
    className: "",
    html: `<div class="${classes}" style="width:${size}px;height:${size}px;background:${color};--pulse:${color}">${nodeToSvg(
      cat.icon,
      Math.round(size * 0.5)
    )}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  cache.set(key, icon);
  return icon;
}

// Round photo marker ("photos on markers" mode).
export function photoIcon(url, report) {
  const sev = severityOf(report);
  const size = markerSize(sev) + 10;
  return L.divIcon({
    className: "",
    html: `<div class="taza-marker" style="width:${size}px;height:${size}px;overflow:hidden;border:3px solid ${severityColor(
      sev
    )}"><img src="${url}" alt="" style="width:100%;height:100%;object-fit:cover" /></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// The spot picked for a new report.
export const selectionIcon = L.divIcon({
  className: "",
  html: `<svg width="34" height="46" viewBox="0 0 26 38" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 6px rgba(0,0,0,.5))"><path d="M13 0C5.8 0 0 5.8 0 13c0 9.2 13 25 13 25s13-15.8 13-25C26 5.8 20.2 0 13 0z" fill="#3ddc97" stroke="#0e1512" stroke-width="1.5"/><circle cx="13" cy="13" r="5" fill="#0e1512"/></svg>`,
  iconSize: [34, 46],
  iconAnchor: [17, 46],
});

// Pulsing dot for the user's geolocation.
export const userDotIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#2ec4b6;border:3px solid #e8f1ec;box-shadow:0 0 0 6px rgba(46,196,182,.3)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
