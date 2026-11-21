import type { AiAnalysis, AirActivity, AirData, AirGroup, AirPlan, TimeWindow, Appeal, AppealLang, Lang, ReportStatus, NewReportPayload, Report, ResolveReason, ResolveResult, Stats } from "@/types";

// API base URL: VITE_API_URL in production, same origin in dev (Vite proxies /api).
const BASE = import.meta.env.VITE_API_URL?.trim() || "";

/** Error from our API; `code` is a stable id the UI translates (e.g. "rate_limited"). */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    const body = data as { message?: string; code?: string } | null;
    throw new ApiError(body?.message || `Request failed (${res.status})`, res.status, body?.code);
  }
  return data as T;
}

export async function fetchReports(): Promise<Report[]> {
  return handle<Report[]>(await fetch(`${BASE}/api/reports`));
}

export async function createReport({ title, desc, category, severity, lat, lng, images, ai }: NewReportPayload) {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("desc", desc || "");
  formData.append("category", category || "other");
  formData.append("severity", String(severity));
  if (ai) formData.append("ai", JSON.stringify(ai));
  formData.append("lat", String(lat));
  formData.append("lng", String(lng));
  images.slice(0, 5).forEach((img) => formData.append("images", img));
  return handle<{ ok: true; report: Report }>(await fetch(`${BASE}/api/reports`, { method: "POST", body: formData }));
}

/**
 * F1: ask the server to analyze photos (+ optional note). Only the photos and
 * the note are sent — no location and no personal data (Gemini free tier).
 */
export async function analyzeReport(images: Blob[], note: string, lang: Lang) {
  const formData = new FormData();
  images.slice(0, 3).forEach((img) => formData.append("images", img, "photo.jpg"));
  formData.append("note", note);
  formData.append("lang", lang);
  return handle<{ ok: true; analysis: AiAnalysis; model: string }>(
    await fetch(`${BASE}/api/ai/analyze`, { method: "POST", body: formData })
  );
}

/** F2: appeal text for eOtinish (cached on the server per language). */
export async function generateAppeal(reportId: string, lang: AppealLang, regenerate = false) {
  const res = await fetch(`${BASE}/api/ai/appeal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportId, lang, regenerate }),
  });
  return handle<{ ok: true; appeal: Appeal; cached: boolean }>(res);
}

/** open → appeal_sent → answered (the server rejects other transitions). */
export async function setReportStatus(id: string, status: Extract<ReportStatus, "appeal_sent" | "answered">) {
  const res = await fetch(`${BASE}/api/reports/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return handle<{ ok: true; report: Report }>(res);
}

/** "The problem is gone" with an "after" photo; 3 different devices → resolved. */
export async function confirmResolved(id: string, image: Blob, clientId: string) {
  const formData = new FormData();
  formData.append("image", image, "after.jpg");
  formData.append("clientId", clientId);
  const res = await fetch(`${BASE}/api/reports/${encodeURIComponent(id)}/confirm-resolved`, { method: "POST", body: formData });
  return handle<{ ok: true; report: Report }>(res);
}

/** F3: air quality + wind for Atyrau (server caches Open-Meteo for 15 min). */
export async function fetchAir() {
  return handle<AirData & { ok: true }>(await fetch(`${BASE}/api/air`));
}

/** F3: AI air plan for an anonymous profile (group + activity). */
export async function fetchAirPlan(group: AirGroup, activity: AirActivity, lang: Lang) {
  const res = await fetch(`${BASE}/api/ai/air-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ group, activity, lang }),
  });
  return handle<{ ok: true; plan: AirPlan; windows: TimeWindow[]; basedOn: string; model: string }>(res);
}

/** Resolve an uploaded image path (server returns /uploads/xxx) against the API base. */
export function resolveImage(imageUrl: string): string {
  return imageUrl.startsWith("http") ? imageUrl : `${BASE}${imageUrl}`;
}

/** All image paths of a report (handles legacy imageUrl and imageUrls[]). */
export function reportImages(report: Report | null | undefined): string[] {
  if (!report) return [];
  if (report.imageUrls?.length) return report.imageUrls;
  return report.imageUrl ? [report.imageUrl] : [];
}

export function firstImage(report: Report): string | null {
  const list = reportImages(report);
  return list.length ? resolveImage(list[0]) : null;
}

/** reason "false" deletes the report; otherwise marks it resolved (kept). */
export async function resolveReport(id: string, reason: ResolveReason = "solved") {
  const res = await fetch(`${BASE}/api/reports/${encodeURIComponent(id)}/resolve`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  return handle<ResolveResult>(res);
}

export async function upvoteReport(id: string) {
  const res = await fetch(`${BASE}/api/reports/${encodeURIComponent(id)}/upvote`, { method: "PATCH" });
  return handle<{ ok: true; upvotes: number; report: Report }>(res);
}

export async function fetchStats(): Promise<Stats> {
  return handle<Stats>(await fetch(`${BASE}/api/stats`));
}

export async function deleteReport(id: string) {
  const res = await fetch(`${BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
  return handle<{ ok: true }>(res);
}
