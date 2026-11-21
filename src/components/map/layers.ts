import L from "leaflet";

export type BaseLayerId = "dark" | "street" | "satellite";

// Base tile layers. Dark is the default (Taza AI design).
export const BASE_LAYER_IDS: BaseLayerId[] = ["dark", "street", "satellite"];

export function createBaseLayer(id: BaseLayerId): L.TileLayer {
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
      // CARTO dark tiles now require an API key, so standard OSM tiles are
      // darkened with a CSS filter (.tiles-dark in styles/map.css).
      return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        className: "tiles-dark",
        attribution: "&copy; OpenStreetMap contributors",
      });
  }
}

// Atyrau city center and default zoom.
export const ATYRAU_CENTER: L.LatLngTuple = [47.105, 51.915];
export const ATYRAU_ZOOM = 12;
