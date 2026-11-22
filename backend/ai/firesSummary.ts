import { Type, type Schema } from "@google/genai";
import { createCache } from "../cache.ts";
import type { FiresSnapshot } from "../firms/index.ts";
import type { AiLang } from "./analyze.ts";
import { generateJson } from "./gemini.ts";

export interface FiresSummary {
  headline: string;
  summary: string;
  highlights: string[];
  advice: string[];
}

const SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    headline: { type: Type.STRING, description: "One sentence about the week" },
    summary: { type: Type.STRING, description: "2–4 sentences" },
    highlights: { type: Type.ARRAY, items: { type: Type.STRING }, maxItems: "4" },
    advice: { type: Type.ARRAY, items: { type: Type.STRING }, maxItems: "3" },
  },
  required: ["headline", "summary", "highlights", "advice"],
  propertyOrdering: ["headline", "summary", "highlights", "advice"],
};

const LANG_NAME: Record<AiLang, string> = { ru: "Russian", kk: "Kazakh (Cyrillic script)", en: "English" };
const DIR: Record<AiLang, Record<string, string>> = {
  ru: { N: "к северу", NE: "к северо-востоку", E: "к востоку", SE: "к юго-востоку", S: "к югу", SW: "к юго-западу", W: "к западу", NW: "к северо-западу" },
  kk: { N: "солтүстікке", NE: "солтүстік-шығысқа", E: "шығысқа", SE: "оңтүстік-шығысқа", S: "оңтүстікке", SW: "оңтүстік-батысқа", W: "батысқа", NW: "солтүстік-батысқа" },
  en: { N: "north", NE: "north-east", E: "east", SE: "south-east", S: "south", SW: "south-west", W: "west", NW: "north-west" },
};

const system = (lang: AiLang) => `You write a short weekly digest of satellite thermal anomalies (NASA FIRMS, VIIRS 375 m)
for residents of Atyrau oblast, Kazakhstan.

Rules (strict):
- Call them "thermal anomalies" / "тепловые аномалии" / "жылу аномалиялары", never "fires" as a fact:
  a hot spot can be a fire, a gas flare or another hot surface.
- Repeated detections in the same place over several days are likely steady heat sources (for example
  industrial flares) — say so cautiously. Never name or blame companies, facilities or people.
- Use only the numbers given; describe places only by distance and direction from Atyrau city.
- "advice": practical and calm (e.g. if you see open burning, report it via Taza AI; for fire or danger call 112).
- Write everything in ${LANG_NAME[lang]}.`;

function facts(f: FiresSnapshot, lang: AiLang) {
  const s = f.stats;
  const clusters = s.clusters
    .map(
      (c) =>
        `${c.distanceKm} km ${DIR[lang][c.direction] ?? c.direction} of Atyrau: ${c.count} detections on ${c.days} day(s), max FRP ${c.maxFrp} MW${c.persistent ? ", repeated (likely steady source)" : ""}`
    )
    .join("\n");
  return [
    `Period: ${f.from} – ${f.to} (${f.days} days). Area: Atyrau oblast (approximate rectangle).`,
    `Total detections: ${s.total}. Confidence: high ${s.byConfidence.high}, nominal ${s.byConfidence.nominal}, low ${s.byConfidence.low}.`,
    `Repeated-location detections: ${s.persistentPoints}. Within 30 km of Atyrau city: ${s.nearCity}.`,
    `By day: ${s.byDay.map((d) => `${d.date}: ${d.count}`).join(", ") || "none"}.`,
    clusters ? `Main groups:\n${clusters}` : "No groups.",
  ].join("\n");
}

const clip = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");
const list = (v: unknown, n: number) => (Array.isArray(v) ? v.map((x) => clip(x, 240)).filter(Boolean).slice(0, n) : []);

// One summary per FIRMS snapshot (3 h) and language.
const cache = createCache<{ summary: FiresSummary; model: string }>(3 * 60 * 60_000);

export function firesSummary(fires: FiresSnapshot, lang: AiLang) {
  return cache.get(`${fires.fetchedAt}:${lang}`, async () => {
    const { data, model } = await generateJson<Partial<FiresSummary>>({
      system: system(lang),
      parts: [{ text: facts(fires, lang) }],
      schema: SCHEMA,
      temperature: 0.3,
    });
    return {
      summary: {
        headline: clip(data.headline, 200),
        summary: clip(data.summary, 1000),
        highlights: list(data.highlights, 4),
        advice: list(data.advice, 3),
      },
      model,
    };
  });
}
