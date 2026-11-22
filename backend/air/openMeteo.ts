import { createCache } from "../cache.ts";

// Open-Meteo: free, no key. Air quality comes from the CAMS model (a forecast
// for a ~10 km grid cell), not from ground stations. Licence: CC BY 4.0.

export const ATYRAU = { name: "Atyrau", lat: 47.105, lng: 51.915 } as const;
const TZ = "Asia/Atyrau";
const CACHE_TTL_MS = 15 * 60_000;
const HOURS = 48;

export interface AirCurrent {
  time: string;
  usAqi: number | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
  so2: number | null;
  co: number | null;
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  windGusts: number | null;
}

export interface AirHour {
  time: string;
  usAqi: number | null;
  pm25: number | null;
  pm10: number | null;
  windSpeed: number | null;
  windDirection: number | null;
}

export interface AirSnapshot {
  location: typeof ATYRAU;
  current: AirCurrent;
  hourly: AirHour[];
  fetchedAt: string;
  stale?: boolean;
}

type Series = Record<string, (number | null)[]> & { time: string[] };
interface AqResponse {
  utc_offset_seconds: number;
  current: Record<string, number | string>;
  hourly: Series;
}
type WxResponse = AqResponse;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { "User-Agent": "taza-ai (student project)" } });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  return (await res.json()) as T;
}

/** "2026-11-21T23:00" in local time + offset → "2026-11-21T23:00:00+05:00". */
function withOffset(local: string, offsetSec: number) {
  const sign = offsetSec >= 0 ? "+" : "-";
  const abs = Math.abs(offsetSec);
  const hh = String(Math.floor(abs / 3600)).padStart(2, "0");
  const mm = String(Math.floor((abs % 3600) / 60)).padStart(2, "0");
  return `${local.length === 16 ? `${local}:00` : local}${sign}${hh}:${mm}`;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

async function load(): Promise<AirSnapshot> {
  const q = `latitude=${ATYRAU.lat}&longitude=${ATYRAU.lng}&timezone=${encodeURIComponent(TZ)}&forecast_days=4`;
  const [aq, wx] = await Promise.all([
    getJson<AqResponse>(
      `https://air-quality-api.open-meteo.com/v1/air-quality?${q}` +
        "&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide" +
        "&hourly=us_aqi,pm2_5,pm10"
    ),
    getJson<WxResponse>(
      `https://api.open-meteo.com/v1/forecast?${q}&wind_speed_unit=ms` +
        "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m" +
        "&hourly=wind_speed_10m,wind_direction_10m"
    ),
  ]);

  const off = aq.utc_offset_seconds;
  const c = aq.current;
  const w = wx.current;
  // Hourly series start at local midnight; keep 48 hours from the current hour.
  const currentHour = String(c.time).slice(0, 13);
  const start = Math.max(0, aq.hourly.time.findIndex((t) => t.slice(0, 13) === currentHour));
  const wxIndex = new Map(wx.hourly.time.map((t, i) => [t, i]));

  const hourly: AirHour[] = aq.hourly.time.slice(start, start + HOURS).map((t, k) => {
    const i = start + k;
    const j = wxIndex.get(t);
    return {
      time: withOffset(t, off),
      usAqi: num(aq.hourly.us_aqi?.[i]),
      pm25: num(aq.hourly.pm2_5?.[i]),
      pm10: num(aq.hourly.pm10?.[i]),
      windSpeed: j === undefined ? null : num(wx.hourly.wind_speed_10m?.[j]),
      windDirection: j === undefined ? null : num(wx.hourly.wind_direction_10m?.[j]),
    };
  });

  return {
    location: ATYRAU,
    current: {
      time: withOffset(String(c.time), off),
      usAqi: num(c.us_aqi),
      pm25: num(c.pm2_5),
      pm10: num(c.pm10),
      no2: num(c.nitrogen_dioxide),
      o3: num(c.ozone),
      so2: num(c.sulphur_dioxide),
      co: num(c.carbon_monoxide),
      temperature: num(w.temperature_2m),
      humidity: num(w.relative_humidity_2m),
      windSpeed: num(w.wind_speed_10m),
      windDirection: num(w.wind_direction_10m),
      windGusts: num(w.wind_gusts_10m),
    },
    hourly,
    fetchedAt: new Date().toISOString(),
  };
}

const cache = createCache<AirSnapshot>(CACHE_TTL_MS);

/** Cached for 15 minutes; if Open-Meteo is down, the last snapshot is returned marked stale. */
export async function getAirSnapshot(): Promise<AirSnapshot> {
  try {
    return await cache.get("atyrau", load);
  } catch (err) {
    const old = cache.stale("atyrau");
    if (old) return { ...old, stale: true };
    throw err;
  }
}

export interface TimeWindow {
  from: string;
  to: string;
  avgAqi: number;
}

/**
 * Cleanest 2-hour daytime windows (07–22 local) in the next 24 hours.
 * Computed here, not by the AI, so the times are exact.
 */
export function bestWindows(hours: AirHour[], count = 2): TimeWindow[] {
  const next = hours.slice(0, 24);
  const candidates: TimeWindow[] = [];
  for (let i = 0; i + 1 < next.length; i++) {
    const a = next[i];
    const b = next[i + 1];
    const hour = Number(a.time.slice(11, 13));
    if (hour < 7 || hour > 20 || a.usAqi === null || b.usAqi === null) continue;
    const end = new Date(new Date(b.time).getTime() + 3600_000);
    candidates.push({ from: a.time, to: withOffset(localIso(end, b.time), offsetOf(b.time)), avgAqi: Math.round((a.usAqi + b.usAqi) / 2) });
  }
  candidates.sort((x, y) => x.avgAqi - y.avgAqi || x.from.localeCompare(y.from));
  const picked: TimeWindow[] = [];
  for (const c of candidates) {
    if (picked.every((p) => Math.abs(new Date(p.from).getTime() - new Date(c.from).getTime()) >= 2 * 3600_000)) picked.push(c);
    if (picked.length === count) break;
  }
  return picked.sort((x, y) => x.from.localeCompare(y.from));
}

/** Offset in seconds of an ISO string like "...+05:00". */
function offsetOf(iso: string) {
  const m = /([+-])(\d{2}):(\d{2})$/.exec(iso);
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 3600 + Number(m[3]) * 60) : 0;
}

/** Local "YYYY-MM-DDTHH:MM" for a Date in the zone of `sample`. */
function localIso(date: Date, sample: string) {
  return new Date(date.getTime() + offsetOf(sample) * 1000).toISOString().slice(0, 16);
}
