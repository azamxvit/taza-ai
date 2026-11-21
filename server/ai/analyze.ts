import { Type, type Part, type Schema } from "@google/genai";
import sharp from "sharp";
import { generateJson } from "./gemini.ts";

// Keep in sync with src/lib/categories.ts
export const CATEGORY_IDS = [
  "illegal_dump",
  "waste_burning",
  "oil_spill",
  "water_pollution",
  "air_emission",
  "dead_wildlife",
  "tree_damage",
  "other",
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export type AiLang = "ru" | "kk" | "en";
export const isAiLang = (v: unknown): v is AiLang => v === "ru" || v === "kk" || v === "en";

export interface Analysis {
  relevant: boolean;
  category: CategoryId;
  severity: 1 | 2 | 3 | 4 | 5;
  title: string;
  summary: string;
  visible_evidence: string[];
  suggested_actions: string[];
  confidence: number;
}

const SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    relevant: { type: Type.BOOLEAN, description: "true if the photo shows an environmental problem" },
    category: { type: Type.STRING, enum: [...CATEGORY_IDS] },
    severity: { type: Type.INTEGER, minimum: 1, maximum: 5 },
    title: { type: Type.STRING, description: "Short neutral title, up to 80 characters" },
    summary: { type: Type.STRING, description: "2–3 neutral sentences; if not relevant — a polite explanation why" },
    visible_evidence: { type: Type.ARRAY, items: { type: Type.STRING }, maxItems: "5" },
    suggested_actions: { type: Type.ARRAY, items: { type: Type.STRING }, maxItems: "4" },
    confidence: { type: Type.NUMBER, minimum: 0, maximum: 1 },
  },
  required: ["relevant", "category", "severity", "title", "summary", "visible_evidence", "suggested_actions", "confidence"],
  propertyOrdering: ["relevant", "category", "severity", "title", "summary", "visible_evidence", "suggested_actions", "confidence"],
};

const LANG_NAME: Record<AiLang, string> = { ru: "Russian", kk: "Kazakh (Cyrillic script)", en: "English" };

const system = (lang: AiLang) => `You help residents of Atyrau, Kazakhstan (Ural/Zhaiyk river, Caspian coast, steppe, oil industry)
describe environmental problems they photographed, so they can later file an official appeal.

Decide if the photo shows an environmental problem (waste dump, burning waste, oil or fuel spill,
water pollution, smoke or emissions, dead animals or fish, damaged or cut trees, etc.).
If it does not (selfie, food, screenshot, indoor scene, unclear photo), set relevant=false,
category="other", severity=1, confidence low, empty lists, and in "summary" politely explain why
and what photo would help.

Severity scale:
1 — minor litter; 2 — small dump or local pollution; 3 — large dump, visible smoke, polluted water area;
4 — hazardous: oil or chemical spill, waste burning near homes, dead animals; 5 — emergency: large fire,
major spill into a river or sea, mass death of fish or birds.

Rules (strict):
- Describe only what is visible. Use neutral, cautious wording: "possible pollution", "looks like", "thermal anomaly".
- Never claim a law was broken and never name or blame a company, organisation or person.
- Do not describe or identify people, faces, car plates or private details; ignore them.
- "suggested_actions": safe, practical steps for a resident (keep distance, do not touch, photograph from
  several angles, report to the akimat via eOtinish, call 112 if there is fire or immediate danger).
- "confidence" from 0 to 1: how sure you are about category and severity.
- Write title, summary and list items in ${LANG_NAME[lang]}.`;

/** Resize to ≤1024 px JPEG. sharp drops EXIF by default, so GPS and camera data never reach Gemini. */
async function toInlineImage(buf: Buffer): Promise<Part> {
  const jpeg = await sharp(buf, { failOn: "none" })
    .rotate()
    .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  return { inlineData: { mimeType: "image/jpeg", data: jpeg.toString("base64") } };
}

const clip = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");
const list = (v: unknown, n: number) => (Array.isArray(v) ? v.map((x) => clip(x, 200)).filter(Boolean).slice(0, n) : []);

/** Defensive normalisation: the schema is a strong hint, not a guarantee. */
function normalize(raw: Partial<Analysis>): Analysis {
  const sev = Math.round(Number(raw.severity));
  const conf = Number(raw.confidence);
  return {
    relevant: raw.relevant === true,
    category: CATEGORY_IDS.includes(raw.category as CategoryId) ? (raw.category as CategoryId) : "other",
    severity: (sev >= 1 && sev <= 5 ? sev : 2) as Analysis["severity"],
    title: clip(raw.title, 120),
    summary: clip(raw.summary, 1000),
    visible_evidence: list(raw.visible_evidence, 5),
    suggested_actions: list(raw.suggested_actions, 4),
    confidence: Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : 0.5,
  };
}

export async function analyzeReport(images: Buffer[], note: string, lang: AiLang) {
  const parts: Part[] = await Promise.all(images.slice(0, 3).map(toInlineImage));
  parts.push({
    text: note
      ? `Resident's note (may be inaccurate, rely on the photo): """${note.slice(0, 1000)}"""`
      : "No note from the resident.",
  });
  const { data, model } = await generateJson<Partial<Analysis>>({ system: system(lang), parts, schema: SCHEMA });
  return { analysis: normalize(data), model };
}
