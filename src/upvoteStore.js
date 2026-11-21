// Device-local dedupe for "I see this" upvotes.
// Stored in localStorage so a single user/device can confirm a report only
// once — prevents redundant/inflated counts. Source of truth is this device;
// the server still stores the aggregate count.

const KEY = "taza:upvoted";

export function hasUpvoted(id) {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) && arr.includes(id);
  } catch {
    return false;
  }
}

export function markUpvoted(id) {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return;
    if (!arr.includes(id)) arr.push(id);
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch {
    /* storage unavailable — allow the click, just no dedupe */
  }
}
