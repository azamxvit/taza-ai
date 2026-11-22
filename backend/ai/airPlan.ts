import { Type, type Schema } from "@google/genai";
import type { AirSnapshot, TimeWindow } from "../air/index.ts";
import { createCache } from "../cache.ts";
import type { AiLang } from "./analyze.ts";
import { generateJson } from "./gemini.ts";

// Coarse, anonymous profile — no name, age or diagnosis details are sent.
export const AIR_GROUPS = ["general", "children", "elderly", "respiratory", "heart", "pregnant"] as const;
export const AIR_ACTIVITIES = ["walk", "sport", "commute", "kids_outdoor", "ventilate"] as const;
export type AirGroup = (typeof AIR_GROUPS)[number];
export type AirActivity = (typeof AIR_ACTIVITIES)[number];

export const isAirGroup = (v: unknown): v is AirGroup => AIR_GROUPS.includes(v as AirGroup);
export const isAirActivity = (v: unknown): v is AirActivity => AIR_ACTIVITIES.includes(v as AirActivity);

export interface AirPlan {
  headline: string;
  risk: "low" | "moderate" | "high" | "very_high";
  advice: string[];
  best_time: string;
  avoid: string[];
}

const SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    headline: { type: Type.STRING, description: "One short sentence: can this person do the activity today and when" },
    risk: { type: Type.STRING, enum: ["low", "moderate", "high", "very_high"] },
    advice: { type: Type.ARRAY, items: { type: Type.STRING }, maxItems: "5" },
    best_time: { type: Type.STRING, description: "When to go out, using the given clean windows" },
    avoid: { type: Type.ARRAY, items: { type: Type.STRING }, maxItems: "3" },
  },
  required: ["headline", "risk", "advice", "best_time", "avoid"],
  propertyOrdering: ["headline", "risk", "advice", "best_time", "avoid"],
};

const GROUP_TEXT: Record<AirGroup, string> = {
  general: "healthy adult",
  children: "family with young children",
  elderly: "older adult (65+)",
  respiratory: "person with asthma or another lung condition",
  heart: "person with a heart condition",
  pregnant: "pregnant person",
};
const ACTIVITY_TEXT: Record<AirActivity, string> = {
  walk: "a walk outdoors",
  sport: "running or outdoor sport",
  commute: "walking or cycling to work/school",
  kids_outdoor: "children playing outdoors",
  ventilate: "airing the apartment",
};
const LANG_NAME: Record<AiLang, string> = { ru: "Russian", kk: "Kazakh (Cyrillic script)", en: "English" };

const system = (lang: AiLang) => `You give short, practical air-quality advice for residents of Atyrau, Kazakhstan.
Data is a CAMS model forecast via Open-Meteo (US AQI scale), not ground-station measurements.

Rules (strict):
- Base advice on the given US AQI, PM2.5/PM10, wind and the person's group and activity.
- Use EPA US AQI guidance: 0–50 good, 51–100 moderate, 101–150 unhealthy for sensitive groups,
  151–200 unhealthy, 201–300 very unhealthy, 301+ hazardous. Sensitive groups get stricter advice.
- For "best_time" use ONLY the clean time windows given, keep their "today"/"tomorrow"; format times as HH:MM.
  Do not invent other times. If it is late evening now, the headline should talk about tomorrow.
- No diagnoses and no medication advice. For sensitive groups you may add: "if you feel worse, contact a doctor".
- Do not name or blame companies or industries as the source of pollution.
- Keep each list item under 120 characters. Write everything in ${LANG_NAME[lang]}.`;

const hhmm = (iso: string) => iso.slice(11, 16);
const fmt = (v: number | null, unit = "") => (v === null ? "n/a" : `${Math.round(v * 10) / 10}${unit}`);

function facts(air: AirSnapshot, windows: TimeWindow[], group: AirGroup, activity: AirActivity) {
  const c = air.current;
  const day = (iso: string) => (iso.slice(0, 10) === c.time.slice(0, 10) ? "today" : "tomorrow");
  const next24 = air.hourly
    .slice(0, 24)
    .filter((_, i) => i % 3 === 0)
    .map((h) => `${hhmm(h.time)} AQI ${fmt(h.usAqi)}`)
    .join(", ");
  return [
    `Person: ${GROUP_TEXT[group]}. Planned activity: ${ACTIVITY_TEXT[activity]}.`,
    `Now (${hhmm(c.time)} local): US AQI ${fmt(c.usAqi)}, PM2.5 ${fmt(c.pm25, " µg/m³")}, PM10 ${fmt(c.pm10, " µg/m³")}, ` +
      `NO2 ${fmt(c.no2, " µg/m³")}, O3 ${fmt(c.o3, " µg/m³")}, temperature ${fmt(c.temperature, " °C")}, ` +
      `wind ${fmt(c.windSpeed, " m/s")} from ${fmt(c.windDirection, "°")}, gusts ${fmt(c.windGusts, " m/s")}.`,
    `Next 24 h (every 3 h): ${next24}.`,
    windows.length
      ? `Cleanest daytime windows: ${windows.map((w) => `${day(w.from)} ${hhmm(w.from)}–${hhmm(w.to)} (avg AQI ${w.avgAqi})`).join("; ")}.`
      : "No daytime clean windows available.",
  ].join("\n");
}

const clip = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");
const list = (v: unknown, n: number) => (Array.isArray(v) ? v.map((x) => clip(x, 200)).filter(Boolean).slice(0, n) : []);
const RISKS = ["low", "moderate", "high", "very_high"] as const;

// Same profile + same air snapshot → same plan: saves free-tier quota.
const cache = createCache<{ plan: AirPlan; model: string }>(15 * 60_000);

export function airPlan(air: AirSnapshot, windows: TimeWindow[], group: AirGroup, activity: AirActivity, lang: AiLang) {
  return cache.get(`${air.fetchedAt}:${group}:${activity}:${lang}`, async () => {
    const { data, model } = await generateJson<Partial<AirPlan>>({
      system: system(lang),
      parts: [{ text: facts(air, windows, group, activity) }],
      schema: SCHEMA,
      temperature: 0.3,
    });
    const plan: AirPlan = {
      headline: clip(data.headline, 200),
      risk: RISKS.includes(data.risk as AirPlan["risk"]) ? (data.risk as AirPlan["risk"]) : "moderate",
      advice: list(data.advice, 5),
      best_time: clip(data.best_time, 300),
      avoid: list(data.avoid, 3),
    };
    return { plan, model };
  });
}
