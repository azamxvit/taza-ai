import type { FirePoint } from "@/types";

// Fixed colours by VIIRS confidence; the panel legend shows the same labels.
export const FIRE_COLORS: Record<FirePoint["confidence"], string> = {
  high: "#f43f5e",
  nominal: "#fb923c",
  low: "#facc15",
};

/** Radius grows with fire radiative power (MW), 5–12 px. */
export const fireRadius = (frp: number) => Math.min(12, 5 + Math.sqrt(Math.max(0, frp)) * 1.2);

export const SATELLITE_NAMES: Record<string, string> = {
  N: "Suomi NPP",
  N20: "NOAA-20",
  N21: "NOAA-21",
};

export const ATYRAU_TZ = "Asia/Atyrau";
