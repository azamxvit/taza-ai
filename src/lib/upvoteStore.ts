// Device-local dedupe for "I see it too" confirmations (from CleanCity).
// The server stores only the aggregate count.
const KEY = "taza:upvoted";

function read(): string[] {
  try {
    const arr: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(arr) ? (arr as string[]) : [];
  } catch {
    return [];
  }
}

export function hasUpvoted(id: string): boolean {
  return read().includes(id);
}

export function markUpvoted(id: string): void {
  try {
    const arr = read();
    if (!arr.includes(id)) arr.push(id);
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch {
    /* storage unavailable — allow the click, just no dedupe */
  }
}
