// API base URL: prefers VITE_API_URL, else same-origin (works on Vercel + dev proxy).
const BASE =
  (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim()) || "";

async function handle(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    const message = (data && data.message) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export async function fetchReports() {
  const res = await fetch(`${BASE}/api/reports`);
  return handle(res);
}

export async function createReport({ title, desc, category, lat, lng, images }) {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("desc", desc || "");
  formData.append("category", category || "other");
  formData.append("lat", String(lat));
  formData.append("lng", String(lng));
  // images: array of File (up to 5)
  (images || []).slice(0, 5).forEach((img) => formData.append("images", img));

  const res = await fetch(`${BASE}/api/reports`, { method: "POST", body: formData });
  return handle(res);
}

// Resolve an uploaded image path (server returns /uploads/xxx) against the API base.
export function resolveImage(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http")) return imageUrl;
  return `${BASE}${imageUrl}`;
}

// Resolve the first usable image from a report (handles imageUrl or imageUrls[]).
export function firstImage(report) {
  if (!report) return null;
  const list = report.imageUrls && report.imageUrls.length ? report.imageUrls : report.imageUrl ? [report.imageUrl] : [];
  return list.length ? resolveImage(list[0]) : null;
}

// Resolve a report: reason "false" deletes it; otherwise marks it resolved (kept).
export async function resolveReport(id, reason) {
  const res = await fetch(`${BASE}/api/reports/${encodeURIComponent(id)}/resolve`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: reason || "solved" }),
  });
  return handle(res);
}

// Upvote a report (community validation).
export async function upvoteReport(id) {
  const res = await fetch(`${BASE}/api/reports/${encodeURIComponent(id)}/upvote`, {
    method: "PATCH",
  });
  return handle(res);
}

// Overall stats (counts by status + per category).
export async function fetchStats() {
  const res = await fetch(`${BASE}/api/stats`);
  return handle(res);
}

// Hard delete (admin/cleanup). Kept separate from resolveReport(false).
export async function deleteReport(id) {
  const res = await fetch(`${BASE}/api/reports/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return handle(res);
}
