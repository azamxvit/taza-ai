// Device-local memory (localStorage): which reports this device already
// upvoted or confirmed as fixed, plus an anonymous random device id.
// Not an account: clearing the browser storage resets it.

function readSet(key: string): string[] {
  try {
    const arr: unknown = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(arr) ? (arr as string[]) : [];
  } catch {
    return [];
  }
}

function addToSet(key: string, id: string): void {
  try {
    const arr = readSet(key);
    if (!arr.includes(id)) arr.push(id);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {
    /* storage unavailable — no dedupe on this device */
  }
}

const UPVOTED = "taza:upvoted";
const CONFIRMED = "taza:confirmed";
const CLIENT_ID = "taza:client";

export const hasUpvoted = (id: string) => readSet(UPVOTED).includes(id);
export const markUpvoted = (id: string) => addToSet(UPVOTED, id);

export const hasConfirmed = (id: string) => readSet(CONFIRMED).includes(id);
export const markConfirmed = (id: string) => addToSet(CONFIRMED, id);

let memoryClientId: string | null = null;

/** Anonymous random id of this browser; the server stores only its salted hash. */
export function getClientId(): string {
  try {
    const saved = localStorage.getItem(CLIENT_ID);
    if (saved) return saved;
  } catch {
    /* ignore */
  }
  const id =
    memoryClientId ??
    (typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join(""));
  memoryClientId = id;
  try {
    localStorage.setItem(CLIENT_ID, id);
  } catch {
    /* ignore */
  }
  return id;
}
