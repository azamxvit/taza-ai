// US AQI categories (EPA). Colours come from tokens.css; the label is always shown next to them.

export type AqiCategoryId = "good" | "moderate" | "sensitive" | "unhealthy" | "very_unhealthy" | "hazardous";

export interface AqiCategory {
  id: AqiCategoryId;
  /** Upper bound of the band (inclusive). */
  max: number;
  color: string;
  /** Text colour readable on top of `color`. */
  ink: string;
}

export const AQI_CATEGORIES: AqiCategory[] = [
  { id: "good", max: 50, color: "var(--aqi-good)", ink: "#0e1512" },
  { id: "moderate", max: 100, color: "var(--aqi-moderate)", ink: "#0e1512" },
  { id: "sensitive", max: 150, color: "var(--aqi-sensitive)", ink: "#0e1512" },
  { id: "unhealthy", max: 200, color: "var(--aqi-unhealthy)", ink: "#ffffff" },
  { id: "very_unhealthy", max: 300, color: "var(--aqi-very-unhealthy)", ink: "#ffffff" },
  { id: "hazardous", max: Infinity, color: "var(--aqi-hazardous)", ink: "#ffffff" },
];

export function aqiCategory(value: number | null | undefined): AqiCategory | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return AQI_CATEGORIES.find((c) => value <= c.max) ?? AQI_CATEGORIES[AQI_CATEGORIES.length - 1];
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export type CompassPoint = (typeof COMPASS)[number];

/** 8-point compass name for a "wind from" direction in degrees. */
export const compassPoint = (deg: number): CompassPoint => COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

/** "23:00" from an ISO string with offset (keeps the city's local time). */
export const localHour = (iso: string) => iso.slice(11, 16);
