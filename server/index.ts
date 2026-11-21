import "./env.ts";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import sharp from "sharp";
import rateLimit from "express-rate-limit";
import type { WithId } from "mongodb";
import { getReportsCollection, pingDb, toObjectId } from "./db.ts";
import { DISK_DIR, deleteImages, putImage, usingObjectStorage } from "./storage.ts";
import type { ReportAi, ReportDoc } from "./types.ts";
import { AiError, aiConfigured, analyzeReport, isAiLang } from "./ai/index.ts";

const PORT = Number(process.env.PORT) || 5050;
const TMP_DIR = path.join(import.meta.dirname, "uploads", "tmp");
fs.mkdirSync(TMP_DIR, { recursive: true });

const app = express();
const isProd = process.env.NODE_ENV === "production";
// Render/Vercel put a proxy in front: trust one hop so rate limiting sees the real client IP.
app.set("trust proxy", 1);

// --- Security headers (mirrors frontend vercel.json) ---
app.use((_req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "accelerometer=(), autoplay=(), camera=(), encrypted-media=(), geolocation=(self), gyroscope=(), microphone=(), midi=(), payment=(), usb=()"
  );
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  if (isProd) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  next();
});

// --- CORS: dev origin always allowed; production only CORS_ORIGINS ---
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .concat(["http://localhost:5173"]);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true); // no origin = curl, health checks
      return cb(new Error(`CORS: origin not allowed: ${origin}`));
    },
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// --- Static uploads (disk fallback only; object storage serves its own URLs) ---
if (!usingObjectStorage) {
  app.use("/uploads", (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD");
    }
    next();
  });
  app.use("/uploads", express.static(DISK_DIR));
}

// --- Multer: images only, up to 5 files, 5 MB each ---
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, TMP_DIR),
    filename: (_req, file, cb) => cb(null, crypto.randomBytes(12).toString("hex") + (path.extname(file.originalname) || ".jpg")),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|heic|heif|gif)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error("Only image files are allowed."));
  },
});

// --- AI endpoints: 10 requests per minute per IP, photos kept in memory only ---
const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { ok: false, code: "rate_limited", message: "Too many AI requests, try again in a minute." },
});

const aiUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|heic|heif|gif)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error("Only image files are allowed."));
  },
});

/** Optional AI block sent with a new report; anything malformed is dropped. */
function parseReportAi(raw: unknown): ReportAi | undefined {
  if (typeof raw !== "string" || !raw) return undefined;
  try {
    const v = JSON.parse(raw) as Partial<ReportAi>;
    const strings = (x: unknown) => (Array.isArray(x) ? x.filter((s) => typeof s === "string").map((s) => s.slice(0, 200)).slice(0, 5) : []);
    return {
      summary: String(v.summary ?? "").slice(0, 1000),
      visible_evidence: strings(v.visible_evidence),
      suggested_actions: strings(v.suggested_actions),
      confidence: Math.min(1, Math.max(0, Number(v.confidence) || 0)),
      category: String(v.category ?? "other").slice(0, 40),
      severity: Math.min(5, Math.max(1, Math.round(Number(v.severity) || 2))),
      model: String(v.model ?? "").slice(0, 60),
      edited: v.edited === true,
    };
  } catch {
    return undefined;
  }
}

/** Normalize any image to an auto-rotated, web-optimized JPEG (in place). */
async function optimizeImage(filePath: string): Promise<void> {
  try {
    const out = `${filePath}.opt.jpg`;
    await sharp(filePath, { failOn: "none" })
      .rotate()
      .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(out);
    fs.renameSync(out, filePath);
  } catch {
    /* keep the original if optimization fails */
  }
}

const serialize = (r: WithId<ReportDoc>) => ({ ...r, _id: r._id.toString() });

function parseId(req: Request, res: Response) {
  try {
    return toObjectId(String(req.params.id));
  } catch {
    res.status(400).json({ ok: false, message: "Invalid id" });
    return null;
  }
}

// --- Routes ---
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "taza-ai-api" });
});

app.get("/api/health", async (_req, res) => {
  let mongo = false;
  try {
    mongo = await pingDb();
  } catch {
    mongo = false;
  }
  res.json({ ok: true, mongo, time: Date.now() });
});

app.get("/api/reports", async (_req, res) => {
  try {
    const reports = await (await getReportsCollection()).find({}).sort({ createdAt: -1 }).toArray();
    res.json(reports.map(serialize));
  } catch {
    res.status(500).json({ ok: false, message: "Failed to read reports" });
  }
});

app.post("/api/reports", upload.array("images", 5), async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  try {
    const { title, desc, category, lat, lng, severity, ai } = req.body as Record<string, string | undefined>;
    if (!title?.trim()) return res.status(400).json({ ok: false, message: "Title is required." });
    const latitude = Number.parseFloat(lat ?? "");
    const longitude = Number.parseFloat(lng ?? "");
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({ ok: false, message: "Valid lat/lng required." });
    }

    const imageUrls: string[] = [];
    for (const f of files) {
      await optimizeImage(f.path);
      imageUrls.push(await putImage(f.path, `${crypto.randomBytes(12).toString("hex")}.jpg`, "image/jpeg"));
    }

    const doc: ReportDoc = {
      title: title.trim().slice(0, 120),
      desc: (desc || "").trim().slice(0, 2000),
      category: (category || "other").trim(),
      severity: Math.min(5, Math.max(1, Math.round(Number(severity) || 2))),
      lat: latitude,
      lng: longitude,
      imageUrl: imageUrls[0] ?? null, // first image kept for backward-compat
      imageUrls,
      status: "open",
      upvotes: 0,
      createdAt: new Date(),
    };
    const aiBlock = parseReportAi(ai);
    if (aiBlock) doc.ai = aiBlock;
    const result = await (await getReportsCollection()).insertOne(doc);
    res.status(201).json({ ok: true, report: { ...doc, _id: result.insertedId.toString() } });
  } catch (err) {
    res.status(400).json({ ok: false, message: err instanceof Error ? err.message : "Failed to create report" });
  } finally {
    for (const f of files) fs.rm(f.path, { force: true }, () => {});
  }
});

// F1: photo (+ optional note) → strict-JSON draft from Gemini. Nothing is stored.
app.post("/api/ai/analyze", aiLimiter, aiUpload.array("images", 3), async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (!aiConfigured()) return res.status(503).json({ ok: false, code: "not_configured", message: "AI is not configured." });
  if (!files.length) return res.status(400).json({ ok: false, code: "no_image", message: "Add at least one photo." });
  const { note, lang } = req.body as Record<string, string | undefined>;
  try {
    const { analysis, model } = await analyzeReport(
      files.map((f) => f.buffer),
      (note ?? "").trim(),
      isAiLang(lang) ? lang : "ru"
    );
    res.json({ ok: true, analysis, model });
  } catch (err) {
    console.error("[ai] analyze failed:", err instanceof Error ? err.message : err);
    const code = err instanceof AiError ? err.code : "unavailable";
    res.status(code === "bad_response" ? 502 : 503).json({ ok: false, code, message: "AI analysis failed." });
  }
});

app.get("/api/stats", async (_req, res) => {
  try {
    const collection = await getReportsCollection();
    const [total, resolved, open] = await Promise.all([
      collection.countDocuments({}),
      collection.countDocuments({ status: "resolved" }),
      collection.countDocuments({ status: { $ne: "resolved" } }),
    ]);
    const byCategory = await collection
      .aggregate<{ _id: string; count: number }>([{ $group: { _id: "$category", count: { $sum: 1 } } }])
      .toArray();
    res.json({ total, resolved, open, byCategory: Object.fromEntries(byCategory.map((x) => [x._id, x.count])) });
  } catch {
    res.status(500).json({ ok: false, message: "Failed to read stats" });
  }
});

// "solved" keeps the report (status = resolved); "false" deletes it.
app.patch("/api/reports/:id/resolve", async (req, res) => {
  const objectId = parseId(req, res);
  if (!objectId) return;
  try {
    const collection = await getReportsCollection();
    if ((req.body as { reason?: string })?.reason === "false") {
      const removed = await collection.findOneAndDelete({ _id: objectId });
      if (!removed) return res.status(404).json({ ok: false, message: "Not found" });
      void deleteImages([removed.imageUrl, ...removed.imageUrls]);
      return res.json({ ok: true, action: "deleted" });
    }
    const updated = await collection.findOneAndUpdate(
      { _id: objectId },
      { $set: { status: "resolved" } },
      { returnDocument: "after" }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true, action: "resolved", report: serialize(updated) });
  } catch {
    res.status(500).json({ ok: false, message: "Resolve failed" });
  }
});

app.patch("/api/reports/:id/upvote", async (req, res) => {
  const objectId = parseId(req, res);
  if (!objectId) return;
  try {
    const updated = await (await getReportsCollection()).findOneAndUpdate(
      { _id: objectId },
      { $inc: { upvotes: 1 } },
      { returnDocument: "after" }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true, upvotes: updated.upvotes, report: serialize(updated) });
  } catch {
    res.status(500).json({ ok: false, message: "Upvote failed" });
  }
});

app.delete("/api/reports/:id", async (req, res) => {
  const objectId = parseId(req, res);
  if (!objectId) return;
  try {
    const removed = await (await getReportsCollection()).findOneAndDelete({ _id: objectId });
    if (!removed) return res.status(404).json({ ok: false, message: "Not found" });
    void deleteImages([removed.imageUrl, ...removed.imageUrls]);
    res.json({ ok: true, action: "deleted" });
  } catch {
    res.status(500).json({ ok: false, message: "Delete failed" });
  }
});

// Upload/validation errors (multer limits, wrong MIME) → 400 JSON.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Bad request";
  const tooBig = err instanceof multer.MulterError && (err.code === "LIMIT_FILE_SIZE" || err.code === "LIMIT_FILE_COUNT");
  const code = tooBig ? "too_large" : err instanceof multer.MulterError ? "bad_upload" : "bad_image";
  res.status(tooBig ? 413 : 400).json({ ok: false, code, message });
});

app.listen(PORT, () => {
  console.log(`Taza AI API listening on http://localhost:${PORT}`);
});
