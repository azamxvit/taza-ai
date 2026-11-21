import L from "leaflet";

// NOTE: We do NOT rely on Leaflet's default PNG markers (they break under Vite
// asset hashing and would render as broken images). Every marker in the app uses
// a self-contained inline-SVG icon (see coloredIcon) or a divIcon.

// Build a colored teardrop pin as an inline SVG data URI (no external assets).
// If `resolved` is true, draw a green check ring to signal it's been handled.
function pinDataUri(color, resolved = false, stroke = "#0f172a", inner = "#ffffff") {
  const badge = resolved
    ? `<circle cx="13" cy="13" r="8" fill="#16a34a"/><path d="M9 13l3 3 5-6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<circle cx="13" cy="13" r="5" fill="${inner}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="38" viewBox="0 0 26 38">
    <path d="M13 0C5.8 0 0 5.8 0 13c0 9.2 13 25 13 25s13-15.8 13-25C26 5.8 20.2 0 13 0z" fill="${color}" stroke="${stroke}" stroke-width="1.5"/>
    ${badge}
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const cache = {};
export function coloredIcon(color, resolved = false) {
  const key = `${color}|${resolved ? 1 : 0}`;
  if (!cache[key]) {
    cache[key] = new L.Icon({
      iconUrl: pinDataUri(color, resolved),
      iconSize: [26, 38],
      iconAnchor: [13, 38],
      popupAnchor: [0, -34],
    });
  }
  return cache[key];
}

// Distinct pins for non-report markers.
export const selectionIcon = coloredIcon("#14b8a6"); // teal = spot you clicked
export const userIcon = coloredIcon("#3b82f6"); // blue = you are here

// Pulsing blue dot for the geolocated user position.
export const userDotIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,.45);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export default L;
