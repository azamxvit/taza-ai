import "../env.ts";
import { ApiError, GoogleGenAI, type Part, type Schema } from "@google/genai";

// Gemini is called only from the server: the key never reaches the browser.
// Free-tier traffic may be used by Google for training, so callers must send
// only the photo and the problem description — never names, contacts or GPS.

const apiKey = process.env.GEMINI_API_KEY?.trim();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/** Primary model first, then fallbacks (all from the Flash family). */
const MODELS = [
  process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash",
  ...(process.env.GEMINI_FALLBACK_MODELS ?? "gemini-3.1-flash-lite")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
].filter((m, i, all) => all.indexOf(m) === i);

const ATTEMPT_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 20_000;
/** A model that was overloaded or timed out is skipped for this long. */
const COOLDOWN_MS = 5 * 60_000;
const cooldownUntil = new Map<string, number>();

export class AiError extends Error {
  constructor(
    public code: "not_configured" | "unavailable" | "bad_response",
    message: string
  ) {
    super(message);
  }
}

export const aiConfigured = () => ai !== null;

interface JsonRequest {
  system: string;
  parts: Part[];
  schema: Schema;
  temperature?: number;
}

/** Errors worth trying the next model for (overload, quota, timeout, retired model). */
function isTransient(err: unknown): boolean {
  if (err instanceof ApiError) return [404, 408, 429, 500, 502, 503, 504].includes(err.status);
  return err instanceof Error && /abort|timeout|fetch failed|ECONNRESET/i.test(err.message);
}

/** Generate strict JSON (responseSchema) with model fallback. Returns parsed JSON and the model used. */
export async function generateJson<T>({ system, parts, schema, temperature = 0.2 }: JsonRequest): Promise<{ data: T; model: string }> {
  if (!ai) throw new AiError("not_configured", "GEMINI_API_KEY is not set");

  const now = Date.now();
  const ready = MODELS.filter((m) => (cooldownUntil.get(m) ?? 0) <= now);
  const queue = ready.length ? ready : MODELS; // all cooling down → try anyway

  let lastError: unknown;
  for (const model of queue) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature,
          abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        },
      });
      const text = res.text?.trim();
      if (!text) throw new AiError("bad_response", "Empty response");
      try {
        return { data: JSON.parse(text) as T, model };
      } catch {
        throw new AiError("bad_response", "Response is not valid JSON");
      }
    } catch (err) {
      lastError = err;
      if (err instanceof AiError || isTransient(err)) {
        cooldownUntil.set(model, Date.now() + COOLDOWN_MS);
        console.warn(`[ai] ${model} failed: ${err instanceof Error ? err.message.slice(0, 160) : err}`);
        continue;
      }
      throw err;
    }
  }
  if (lastError instanceof AiError && lastError.code === "bad_response") throw lastError;
  throw new AiError("unavailable", lastError instanceof Error ? lastError.message : "All models failed");
}
