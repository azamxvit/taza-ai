import L from "leaflet";

// Base tile layers. Dark is the default (Taza AI design).
export const BASE_LAYER_IDS = ["dark", "street", "satellite"];

export function createBaseLayer(id) {
  switch (id) {
    case "street":
      return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      });
    case "satellite":
      return L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Tiles &copy; Esri — Esri, Maxar, Earthstar Geographics" }
      );
    default:
      // CARTO dark tiles now require an API key, so we darken standard OSM
      // tiles with a CSS filter instead (see .tiles-dark in index.css).
      return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        className: "tiles-dark",
        attribution: "&copy; OpenStreetMap contributors",
      });
  }
}

// Atyrau city center and default zoom.
export const ATYRAU_CENTER = [47.105, 51.915];
export const ATYRAU_ZOOM = 12;
