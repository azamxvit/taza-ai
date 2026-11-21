import type { NewReportPayload, Report, ResolveReason, ResolveResult, Stats } from "@/types";

// API base URL: VITE_API_URL in production, same origin in dev (Vite proxies /api).
const BASE = import.meta.env.VITE_API_URL?.trim() || "";

async function handle<T>(res: Response): Promise<T> {
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    const message = (data as { message?: string } | null)?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchReports(): Promise<Report[]> {
  return handle<Report[]>(await fetch(`${BASE}/api/reports`));
}

export async function createReport({ title, desc, category, lat, lng, images }: NewReportPayload) {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("desc", desc || "");
  formData.append("category", category || "other");
  formData.append("lat", String(lat));
  formData.append("lng", String(lng));
  images.slice(0, 5).forEach((img) => formData.append("images", img));
  return handle<{ ok: true; report: Report }>(await fetch(`${BASE}/api/reports`, { method: "POST", body: formData }));
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
