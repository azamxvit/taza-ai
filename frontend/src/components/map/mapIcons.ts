import L from "leaflet";
import { categoryById, markerSize, severityColor, severityOf } from "@/lib/categories";
import { nodeToSvg } from "@/lib/iconSvg";
import type { Report } from "@/types";

// Leaflet's default PNG markers break under Vite asset hashing, so every marker
// is a divIcon. Styling lives in styles/map.css via data attributes.

const cache = new Map<string, L.DivIcon>();

interface ReportIconOptions {
  isNew?: boolean;
  selected?: boolean;
}

const flag = (on: boolean, name: string) => (on ? ` data-${name}` : "");

/** Report marker: color + size from severity, category icon inside. */
export function reportIcon(report: Report, { isNew = false, selected = false }: ReportIconOptions = {}): L.DivIcon {
  const sev = severityOf(report);
  const cat = categoryById(report.category);
  const resolved = report.status === "resolved";
  const key = `${cat.id}|${sev}|${resolved}|${isNew}|${selected}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const size = markerSize(sev);
  const icon = L.divIcon({
    className: "",
    html: `<div data-marker="report"${flag(resolved, "resolved")}${flag(isNew, "new")}${flag(selected, "selected")} style="--size:${size}px;--color:${severityColor(sev)}">${nodeToSvg(cat.icon, Math.round(size * 0.5))}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  cache.set(key, icon);
  return icon;
}

/** Round photo marker ("photos on markers" mode). */
export function photoIcon(url: string, report: Report): L.DivIcon {
  const sev = severityOf(report);
  const size = markerSize(sev) + 10;
  return L.divIcon({
    className: "",
    html: `<div data-marker="photo" style="--size:${size}px;--color:${severityColor(sev)}"><img src="${encodeURI(url)}" alt="" /></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** The spot picked for a new report. */
export const selectionIcon = L.divIcon({
  className: "",
  html: `<svg width="34" height="46" viewBox="0 0 26 38" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 6px rgba(0,0,0,.5))"><path d="M13 0C5.8 0 0 5.8 0 13c0 9.2 13 25 13 25s13-15.8 13-25C26 5.8 20.2 0 13 0z" fill="#3ddc97" stroke="#0e1512" stroke-width="1.5"/><circle cx="13" cy="13" r="5" fill="#0e1512"/></svg>`,
  iconSize: [34, 46],
  iconAnchor: [17, 46],
});

/** Dot for the user's geolocation. */
export const userDotIcon = L.divIcon({
  className: "",
  html: `<div data-pin="user"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
