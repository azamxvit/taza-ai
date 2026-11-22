import "../env.ts";
import { createCache } from "../cache.ts";

// NASA FIRMS: VIIRS 375 m near-real-time thermal anomalies. Free MAP_KEY,
// called only from the server. A thermal anomaly is a hot spot seen from
// orbit — a fire, a gas flare or another hot surface — not a confirmed fire.

const MAP_KEY = process.env.FIRMS_MAP_KEY?.trim();
const SOURCES = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT"] as const;
/** Approximate rectangle around Atyrau oblast (west, south, east, north). Kept east of the Volga delta so Russian territory is excluded; still includes edges of neighbouring oblasts and the Caspian. */
export const ATYRAU_OBLAST_BBOX = [48.5, 45.2, 55.8, 49.4] as const;
export const DAYS = 7;
const CACHE_TTL_MS = 3 * 60 * 60_000;
const ATYRAU_CITY = { lat: 47.105, lng: 51.915 };

export const firmsConfigured = () => Boolean(MAP_KEY);

export interface FirePoint {
  id: string;
  lat: number;
  lng: number;
  /** UTC ISO time of the satellite pass. */
  time: string;
  satellite: string;
  /** VIIRS confidence: l(ow), n(ominal), h(igh). */
  confidence: "low" | "nominal" | "high";
  /** Fire radiative power, MW. */
  frp: number;
  daynight: "D" | "N";
  /** Seen in the same ~1 km cell on 3+ different days: likely a steady heat source (e.g. a flare). */
  persistent: boolean;
}

export interface FireCluster {
  lat: number;
  lng: number;
  count: number;
  days: number;
  maxFrp: number;
  persistent: boolean;
  distanceKm: number;
  direction: string;
}

export interface FireStats {
  total: number;
  byDay: { date: string; count: number }[];
  byConfidence: Record<FirePoint["confidence"], number>;
  persistentPoints: number;
  nearCity: number;
  clusters: FireCluster[];
}

export interface FiresSnapshot {
  points: FirePoint[];
  stats: FireStats;
  bbox: typeof ATYRAU_OBLAST_BBOX;
  days: number;
  from: string;
  to: string;
  fetchedAt: string;
  stale?: boolean;
}

export class FirmsError extends Error {
  constructor(
    public code: "not_configured" | "unavailable",
    message: string
  ) {
    super(message);
  }
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** The API allows at most 5 days per request, so 7 days = [D-6, 5 days] + [D-1, 2 days]. */
function windows(now = new Date()): { start: string; range: number }[] {
  const day = (n: number) => isoDay(new Date(now.getTime() - n * 86_400_000));
  return [
    { start: day(DAYS - 1), range: 5 },
    { start: day(1), range: DAYS - 5 },
  ];
}

async function fetchCsv(source: string, start: string, range: number): Promise<string> {
  const area = ATYRAU_OBLAST_BBOX.join(",");
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${MAP_KEY}/${source}/${area}/${range}/${start}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  const text = await res.text();
  // FIRMS answers errors as plain text with HTTP 200 (e.g. "Invalid MAP_KEY.").
  if (!res.ok || !text.startsWith("latitude")) throw new Error(`FIRMS ${source}: ${text.slice(0, 80).replace(MAP_KEY ?? "", "***")}`);
  return text;
}

const CONF: Record<string, FirePoint["confidence"]> = { l: "low", n: "nominal", h: "high" };

function parse(csv: string): Omit<FirePoint, "id" | "persistent">[] {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const cols = header.split(",");
  const idx = (name: string) => cols.indexOf(name);
  const [iLat, iLng, iDate, iTime, iSat, iConf, iFrp, iDn] = [
    "latitude",
    "longitude",
    "acq_date",
    "acq_time",
    "satellite",
    "confidence",
    "frp",
    "daynight",
  ].map(idx);
  return rows
    .map((line) => line.split(","))
    .filter((c) => c.length === cols.length)
    .map((c) => {
      const hhmm = c[iTime].padStart(4, "0");
      return {
        lat: Number(c[iLat]),
        lng: Number(c[iLng]),
        time: `${c[iDate]}T${hhmm.slice(0, 2)}:${hhmm.slice(2)}:00Z`,
        satellite: c[iSat],
        confidence: CONF[c[iConf]] ?? "nominal",
        frp: Number(c[iFrp]) || 0,
        daynight: c[iDn] === "N" ? ("N" as const) : ("D" as const),
      };
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

/** Great-circle distance in km. */
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
function bearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const y = Math.sin((to.lng - from.lng) * rad) * Math.cos(to.lat * rad);
  const x =
    Math.cos(from.lat * rad) * Math.sin(to.lat * rad) -
    Math.sin(from.lat * rad) * Math.cos(to.lat * rad) * Math.cos((to.lng - from.lng) * rad);
  const deg = (Math.atan2(y, x) / rad + 360) % 360;
  return COMPASS[Math.round(deg / 45) % 8];
}

const PERSISTENT_RADIUS_KM = 1;
const CLUSTER_RADIUS_KM = 5;

function analyse(raw: Omit<FirePoint, "id" | "persistent">[]): { points: FirePoint[]; stats: FireStats } {
  // "Persistent": detections within 1 km of this one on 3+ different days.
  // Distance-based (not a grid), so a spot on a grid line is not split in two. O(n²) is fine for a week of data.
  const points: FirePoint[] = raw
    .map((p, i) => {
      const days = new Set(raw.filter((q) => distanceKm(p, q) <= PERSISTENT_RADIUS_KM).map((q) => q.time.slice(0, 10)));
      return { ...p, id: `${p.time}-${i}`, persistent: days.size >= 3 };
    })
    .sort((a, b) => b.time.localeCompare(a.time));

  // Greedy clusters for the summary: a point joins the first group whose first point is within 5 km.
  const groups: FirePoint[][] = [];
  for (const p of points) {
    const group = groups.find((g) => distanceKm(g[0], p) <= CLUSTER_RADIUS_KM);
    if (group) group.push(p);
    else groups.push([p]);
  }
  const clusters: FireCluster[] = groups
    .map((list) => {
      const lat = list.reduce((s, p) => s + p.lat, 0) / list.length;
      const lng = list.reduce((s, p) => s + p.lng, 0) / list.length;
      return {
        lat: Math.round(lat * 1000) / 1000,
        lng: Math.round(lng * 1000) / 1000,
        count: list.length,
        days: new Set(list.map((p) => p.time.slice(0, 10))).size,
        maxFrp: Math.round(Math.max(...list.map((p) => p.frp)) * 10) / 10,
        persistent: list.some((p) => p.persistent),
        distanceKm: Math.round(distanceKm(ATYRAU_CITY, { lat, lng })),
        direction: bearing(ATYRAU_CITY, { lat, lng }),
      };
    })
    .sort((a, b) => b.count - a.count || b.maxFrp - a.maxFrp)
    .slice(0, 8);

  const byDayMap = new Map<string, number>();
  for (const p of points) byDayMap.set(p.time.slice(0, 10), (byDayMap.get(p.time.slice(0, 10)) ?? 0) + 1);

  return {
    points,
    stats: {
      total: points.length,
      byDay: [...byDayMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
      byConfidence: {
        low: points.filter((p) => p.confidence === "low").length,
        nominal: points.filter((p) => p.confidence === "nominal").length,
        high: points.filter((p) => p.confidence === "high").length,
      },
      persistentPoints: points.filter((p) => p.persistent).length,
      nearCity: points.filter((p) => distanceKm(ATYRAU_CITY, p) <= 30).length,
      clusters,
    },
  };
}

async function load(): Promise<FiresSnapshot> {
  if (!MAP_KEY) throw new FirmsError("not_configured", "FIRMS_MAP_KEY is not set");
  const wins = windows();
  const results = await Promise.allSettled(
    SOURCES.flatMap((src) => wins.map((w) => fetchCsv(src, w.start, w.range)))
  );
  const ok = results.filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled");
  if (!ok.length) {
    const reason = results.find((r): r is PromiseRejectedResult => r.status === "rejected")?.reason;
    throw new FirmsError("unavailable", reason instanceof Error ? reason.message : "FIRMS unavailable");
  }
  const { points, stats } = analyse(ok.flatMap((r) => parse(r.value)));
  const end = new Date();
  return {
    points,
    stats,
    bbox: ATYRAU_OBLAST_BBOX,
    days: DAYS,
    from: wins[0].start,
    to: isoDay(end),
    fetchedAt: end.toISOString(),
  };
}

const cache = createCache<FiresSnapshot>(CACHE_TTL_MS);

/** Cached for 3 hours (NRT data updates a few times a day); stale data if FIRMS is down. */
export async function getFires(): Promise<FiresSnapshot> {
  try {
    return await cache.get("atyrau-oblast", load);
  } catch (err) {
    const old = cache.stale("atyrau-oblast");
    if (old && !(err instanceof FirmsError && err.code === "not_configured")) return { ...old, stale: true };
    throw err;
  }
}
