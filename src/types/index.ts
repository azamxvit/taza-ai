// Shared domain types for the Taza AI frontend.

export type CategoryId =
  | "illegal_dump"
  | "waste_burning"
  | "oil_spill"
  | "water_pollution"
  | "air_emission"
  | "dead_wildlife"
  | "tree_damage"
  | "other";

export type Severity = 1 | 2 | 3 | 4 | 5;

export type ReportStatus = "open" | "appeal_sent" | "answered" | "resolved";

/** Strict JSON returned by POST /api/ai/analyze (Gemini responseSchema). */
export interface AiAnalysis {
  relevant: boolean;
  category: CategoryId;
  severity: Severity;
  title: string;
  summary: string;
  visible_evidence: string[];
  suggested_actions: string[];
  confidence: number;
}

/** AI block stored with a published report. category/severity are the AI's original proposal. */
export interface ReportAi {
  summary: string;
  visible_evidence: string[];
  suggested_actions: string[];
  confidence: number;
  category: string;
  severity: number;
  model: string;
  /** The author changed the AI draft before publishing. */
  edited: boolean;
}

export type AppealLang = "ru" | "kk";

/** Appeal draft for eOtinish. Taza AI never sends it — the resident does. */
export interface Appeal {
  lang: AppealLang;
  recipient: string;
  subject: string;
  text: string;
  model: string;
  createdAt: string;
}

export interface StatusEvent {
  status: ReportStatus;
  at: string;
}

/** "Problem is gone" confirmation with an "after" photo. */
export interface ResolveConfirmation {
  imageUrl: string;
  at: string;
}

export const CONFIRMATIONS_TO_RESOLVE = 3;

export interface Report {
  _id: string;
  title: string;
  desc: string;
  /** Legacy CleanCity categories may still appear; unknown ids render as "other". */
  category: CategoryId | (string & {});
  severity?: Severity;
  lat: number;
  lng: number;
  imageUrl: string | null;
  imageUrls: string[];
  status: ReportStatus;
  upvotes: number;
  createdAt: string;
  ai?: ReportAi;
  appeals?: Partial<Record<AppealLang, Appeal>>;
  statusHistory?: StatusEvent[];
  confirmations?: ResolveConfirmation[];
  resolvedAt?: string;
  demo?: boolean;
}

export interface NewReportPayload {
  title: string;
  desc: string;
  category: CategoryId;
  severity: Severity;
  lat: number;
  lng: number;
  images: Blob[];
  ai?: ReportAi;
}

export interface Stats {
  total: number;
  open: number;
  resolved: number;
  byCategory: Partial<Record<string, number>>;
}

export type ResolveReason = "solved" | "false";

export interface ResolveResult {
  ok: boolean;
  action: "deleted" | "resolved";
  report?: Report;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export type Lang = "ru" | "kk" | "en";

// --- F3: air quality (Open-Meteo, CAMS model) ---

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

export interface TimeWindow {
  from: string;
  to: string;
  avgAqi: number;
}

export interface AirData {
  location: { name: string; lat: number; lng: number };
  current: AirCurrent;
  hourly: AirHour[];
  bestWindows: TimeWindow[];
  fetchedAt: string;
  /** Open-Meteo was down: this is the last known data. */
  stale?: boolean;
}

export type AirGroup = "general" | "children" | "elderly" | "respiratory" | "heart" | "pregnant";
export type AirActivity = "walk" | "sport" | "commute" | "kids_outdoor" | "ventilate";

export interface AirPlan {
  headline: string;
  risk: "low" | "moderate" | "high" | "very_high";
  advice: string[];
  best_time: string;
  avoid: string[];
}
