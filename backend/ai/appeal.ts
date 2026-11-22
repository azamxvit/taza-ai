import { Type, type Schema } from "@google/genai";
import type { AppealDoc, ReportDoc } from "../types.ts";
import { generateJson } from "./gemini.ts";

export type AppealLang = "ru" | "kk";
export const isAppealLang = (v: unknown): v is AppealLang => v === "ru" || v === "kk";

export type Appeal = AppealDoc;

interface AppealDraft {
  subject: string;
  description: string;
  requests: string[];
}

const SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    subject: { type: Type.STRING, description: "Subject line, up to 100 characters" },
    description: { type: Type.STRING, description: "1–2 short formal paragraphs describing the problem" },
    requests: { type: Type.ARRAY, items: { type: Type.STRING }, maxItems: "4", description: "What the applicant asks the agency to do" },
  },
  required: ["subject", "description", "requests"],
  propertyOrdering: ["subject", "description", "requests"],
};

/**
 * Recommended recipient by category — a deterministic rule, not the AI's choice.
 * The resident picks the final agency in eOtinish.
 */
const RECIPIENT: Record<AppealLang, { city: string; ecology: string }> = {
  ru: {
    city: "ГУ «Аппарат акима города Атырау»",
    ecology: "РГУ «Департамент экологии по Атырауской области» Комитета экологического регулирования и контроля МЭПР РК",
  },
  kk: {
    city: "«Атырау қаласы әкімінің аппараты» ММ",
    ecology: "ҚР ЭТРМ Экологиялық реттеу және бақылау комитетінің «Атырау облысы бойынша экология департаменті» РММ",
  },
};
const ECOLOGY_CATEGORIES = new Set(["oil_spill", "water_pollution", "air_emission", "dead_wildlife"]);

export const recipientFor = (category: string, lang: AppealLang) =>
  ECOLOGY_CATEGORIES.has(category) ? RECIPIENT[lang].ecology : RECIPIENT[lang].city;

const system = (lang: AppealLang) => `You draft a short formal citizen appeal (обращение) to a state agency in Atyrau, Kazakhstan,
to be submitted by a resident through the eOtinish portal.

Rules (strict):
- Formal, polite, neutral. Describe only the facts given. Use cautious wording: "возможное загрязнение",
  "по внешним признакам", "предположительно".
- Never claim a law was broken, never name or blame a company, organisation or person.
- Do not invent facts, addresses, dates, names, numbers or legal article references.
- Do not include a greeting, the place, the date or a signature — they are added separately.
- "requests": 2–4 concrete asks, e.g. inspect the site, take measures to clean up, inform the applicant
  about the results within the time limit established by law.
- Write everything in ${lang === "kk" ? "Kazakh (Cyrillic script), official style" : "Russian, official style"}.`;

const T = {
  ru: {
    to: "Кому",
    subject: "Тема",
    place: "Место",
    date: "Дата фиксации",
    photos: (n: number) => (n ? `Фотографии: прилагаются (${n} шт.)` : "Фотографии: —"),
    ask: "Прошу:",
    link: "Карточка проблемы",
    footer: "Текст подготовлен с помощью сервиса Taza AI и проверен заявителем.",
  },
  kk: {
    to: "Кімге",
    subject: "Тақырыбы",
    place: "Орны",
    date: "Тіркелген күні",
    photos: (n: number) => (n ? `Фотосуреттер: қоса беріледі (${n} дана)` : "Фотосуреттер: —"),
    ask: "Сұраймын:",
    link: "Мәселе карточкасы",
    footer: "Мәтін Taza AI сервисінің көмегімен дайындалып, өтініш берушімен тексерілді.",
  },
};

const pad = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
const clip = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");

/**
 * Only the problem description goes to Gemini (no coordinates, no personal data).
 * Place, date, photos count and links are added here on the server.
 */
export async function generateAppeal(report: ReportDoc, lang: AppealLang, publicUrl: string): Promise<Appeal> {
  const facts = [
    `Category: ${report.category}`,
    `Severity (1–5): ${report.severity ?? 2}`,
    `Title: ${report.title}`,
    report.ai?.summary && `AI description: ${report.ai.summary}`,
    report.ai?.visible_evidence.length && `Visible in the photo: ${report.ai.visible_evidence.join("; ")}`,
    report.desc && `Resident's note: ${report.desc.slice(0, 1000)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const { data, model } = await generateJson<Partial<AppealDraft>>({
    system: system(lang),
    parts: [{ text: facts }],
    schema: SCHEMA,
    temperature: 0.3,
  });

  const subject = clip(data.subject, 120) || report.title;
  const description = clip(data.description, 2000);
  const requests = (Array.isArray(data.requests) ? data.requests : []).map((r) => clip(r, 300)).filter(Boolean).slice(0, 4);
  const t = T[lang];
  const recipient = recipientFor(report.category, lang);
  const photos = report.imageUrls?.length ?? (report.imageUrl ? 1 : 0);
  const osm = `https://www.openstreetmap.org/?mlat=${report.lat.toFixed(5)}&mlon=${report.lng.toFixed(5)}#map=17/${report.lat.toFixed(5)}/${report.lng.toFixed(5)}`;

  const text = [
    `${t.to}: ${recipient}`,
    `${t.subject}: ${subject}`,
    "",
    description,
    "",
    `${t.place}: ${report.lat.toFixed(5)}, ${report.lng.toFixed(5)} — ${osm}`,
    `${t.date}: ${formatDate(new Date(report.createdAt))}`,
    t.photos(photos),
    publicUrl ? `${t.link}: ${publicUrl}` : null,
    "",
    t.ask,
    ...requests.map((r, i) => `${i + 1}. ${r}`),
    "",
    t.footer,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return { lang, recipient, subject, text, model, createdAt: new Date() };
}
