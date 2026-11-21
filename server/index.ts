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
import { CONFIRMATIONS_TO_RESOLVE, type ReportAi, type ReportDoc, type ReportStatus } from "./types.ts";
import { AiError, aiConfigured, airPlan, firesSummary, analyzeReport, generateAppeal, isAiLang, isAirActivity, isAirGroup, isAppealLang } from "./ai/index.ts";
import { bestWindows, getAirSnapshot } from "./air/index.ts";
import { FirmsError, getFires } from "./firms/index.ts";
import { seedDemo } from "./seed/index.ts";

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

/** Public shape: device hashes of confirmations are never sent to the browser. */
const serialize = (r: WithId<ReportDoc>) => ({
  ...r,
  _id: r._id.toString(),
  confirmations: (r.confirmations ?? []).map(({ imageUrl, at }) => ({ imageUrl, at })),
});

const CLIENT_SALT = process.env.CLIENT_ID_SALT || "taza-ai";
const hashClient = (id: string) => crypto.createHash("sha256").update(`${CLIENT_SALT}:${id}`).digest("hex").slice(0, 32);
const isClientId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9-]{8,64}$/.test(v);

/** Link to the report on the site, for the appeal text. */
function publicReportUrl(req: Request, id: string) {
  const origin = process.env.PUBLIC_SITE_URL?.trim() || (allowedOrigins.includes(req.headers.origin ?? "") ? req.headers.origin : "");
  return origin ? `${origin.replace(/\/$/, "")}/?r=${id}` : "";
}

const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { ok: false, code: "rate_limited", message: "Too many requests, try again in a minute." },
});

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
      statusHistory: [],
      confirmations: [],
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

// F2: appeal draft for eOtinish (ru/kk), cached in the report. We only generate text.
app.post("/api/ai/appeal", aiLimiter, async (req, res) => {
  const { reportId, lang, regenerate } = (req.body ?? {}) as { reportId?: string; lang?: string; regenerate?: boolean };
  if (!isAppealLang(lang)) return res.status(400).json({ ok: false, code: "bad_lang", message: "lang must be ru or kk" });
  let objectId;
  try {
    objectId = toObjectId(String(reportId));
  } catch {
    return res.status(400).json({ ok: false, code: "bad_id", message: "Invalid id" });
  }
  try {
    const collection = await getReportsCollection();
    const report = await collection.findOne({ _id: objectId });
    if (!report) return res.status(404).json({ ok: false, code: "not_found", message: "Not found" });
    const cached = report.appeals?.[lang];
    if (cached && !regenerate) return res.json({ ok: true, appeal: cached, cached: true });
    if (!aiConfigured()) return res.status(503).json({ ok: false, code: "not_configured", message: "AI is not configured." });

    const appeal = await generateAppeal(report, lang, publicReportUrl(req, report._id.toString()));
    await collection.updateOne({ _id: objectId }, { $set: { [`appeals.${lang}`]: appeal } });
    res.json({ ok: true, appeal, cached: false });
  } catch (err) {
    console.error("[ai] appeal failed:", err instanceof Error ? err.message : err);
    const code = err instanceof AiError ? err.code : "unavailable";
    res.status(code === "bad_response" ? 502 : 503).json({ ok: false, code, message: "Appeal generation failed." });
  }
});

// F2: open → appeal_sent → answered. "resolved" only via 3 confirmations below.
const NEXT_STATUS: Partial<Record<ReportStatus, ReportStatus>> = { open: "appeal_sent", appeal_sent: "answered" };

app.patch("/api/reports/:id/status", writeLimiter, async (req, res) => {
  const objectId = parseId(req, res);
  if (!objectId) return;
  const status = (req.body as { status?: string })?.status as ReportStatus | undefined;
  const from = (Object.keys(NEXT_STATUS) as ReportStatus[]).find((k) => NEXT_STATUS[k] === status);
  if (!from) return res.status(400).json({ ok: false, code: "bad_status", message: "Status must be appeal_sent or answered" });
  try {
    const updated = await (await getReportsCollection()).findOneAndUpdate(
      { _id: objectId, status: from },
      { $set: { status: status! }, $push: { statusHistory: { status: status!, at: new Date() } } },
      { returnDocument: "after" }
    );
    if (!updated) return res.status(409).json({ ok: false, code: "bad_transition", message: `Report is not in status ${from}` });
    res.json({ ok: true, report: serialize(updated) });
  } catch {
    res.status(500).json({ ok: false, message: "Status update failed" });
  }
});

// F2: "the problem is gone" with an "after" photo; 3 distinct devices → resolved.
app.post("/api/reports/:id/confirm-resolved", writeLimiter, upload.single("image"), async (req, res) => {
  const file = req.file;
  try {
    const objectId = parseId(req, res);
    if (!objectId) return;
    const { clientId } = req.body as { clientId?: string };
    if (!isClientId(clientId)) return res.status(400).json({ ok: false, code: "bad_client", message: "clientId required" });
    if (!file) return res.status(400).json({ ok: false, code: "no_image", message: "An 'after' photo is required." });

    const collection = await getReportsCollection();
    const client = hashClient(clientId);
    const report = await collection.findOne({ _id: objectId });
    if (!report) return res.status(404).json({ ok: false, code: "not_found", message: "Not found" });
    if (report.status === "resolved") return res.status(409).json({ ok: false, code: "already_resolved", message: "Already resolved" });
    if (report.confirmations?.some((c) => c.client === client)) {
      return res.status(409).json({ ok: false, code: "already_confirmed", message: "You have already confirmed" });
    }

    await optimizeImage(file.path);
    const imageUrl = await putImage(file.path, `${crypto.randomBytes(12).toString("hex")}.jpg`, "image/jpeg");
    // Condition on the hash too, so two parallel requests from one device can't both count.
    let updated = await collection.findOneAndUpdate(
      { _id: objectId, "confirmations.client": { $ne: client } },
      { $push: { confirmations: { client, imageUrl, at: new Date() } } },
      { returnDocument: "after" }
    );
    if (!updated) {
      void deleteImages([imageUrl]);
      return res.status(409).json({ ok: false, code: "already_confirmed", message: "You have already confirmed" });
    }
    if ((updated.confirmations?.length ?? 0) >= CONFIRMATIONS_TO_RESOLVE && updated.status !== "resolved") {
      const now = new Date();
      updated =
        (await collection.findOneAndUpdate(
          { _id: objectId, status: { $ne: "resolved" } },
          { $set: { status: "resolved", resolvedAt: now }, $push: { statusHistory: { status: "resolved", at: now } } },
          { returnDocument: "after" }
        )) ?? updated;
    }
    res.json({ ok: true, report: serialize(updated) });
  } catch {
    res.status(500).json({ ok: false, message: "Confirmation failed" });
  } finally {
    if (file) fs.rm(file.path, { force: true }, () => {});
  }
});

// F3: air quality + wind for Atyrau (Open-Meteo, cached 15 min).
app.get("/api/air", async (_req, res) => {
  try {
    const air = await getAirSnapshot();
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({ ok: true, ...air, bestWindows: bestWindows(air.hourly) });
  } catch (err) {
    console.error("[air] Open-Meteo failed:", err instanceof Error ? err.message : err);
    res.status(503).json({ ok: false, code: "air_unavailable", message: "Air quality data is unavailable." });
  }
});

// F3: personal air plan by an anonymous profile (group + activity).
app.post("/api/ai/air-plan", aiLimiter, async (req, res) => {
  const { group, activity, lang } = (req.body ?? {}) as Record<string, unknown>;
  if (!isAirGroup(group) || !isAirActivity(activity)) {
    return res.status(400).json({ ok: false, code: "bad_profile", message: "Unknown group or activity" });
  }
  if (!aiConfigured()) return res.status(503).json({ ok: false, code: "not_configured", message: "AI is not configured." });
  try {
    const air = await getAirSnapshot();
    const windows = bestWindows(air.hourly);
    const { plan, model } = await airPlan(air, windows, group, activity, isAiLang(lang) ? lang : "ru");
    res.json({ ok: true, plan, model, windows, basedOn: air.current.time });
  } catch (err) {
    console.error("[ai] air plan failed:", err instanceof Error ? err.message : err);
    const code = err instanceof AiError ? err.code : "unavailable";
    res.status(code === "bad_response" ? 502 : 503).json({ ok: false, code, message: "Air plan failed." });
  }
});

// F4: NASA FIRMS VIIRS thermal anomalies in Atyrau oblast, last 7 days (cached 3 h).
app.get("/api/fires", async (_req, res) => {
  try {
    const fires = await getFires();
    res.setHeader("Cache-Control", "public, max-age=900");
    res.json({ ok: true, ...fires });
  } catch (err) {
    const code = err instanceof FirmsError ? err.code : "unavailable";
    console.error("[firms]", err instanceof Error ? err.message : err);
    res.status(503).json({ ok: false, code: code === "not_configured" ? "firms_not_configured" : "firms_unavailable", message: "Satellite data is unavailable." });
  }
});

// F4: weekly AI digest of the same FIRMS snapshot (only aggregated numbers go to Gemini).
app.post("/api/ai/fires-summary", aiLimiter, async (req, res) => {
  const { lang } = (req.body ?? {}) as { lang?: string };
  if (!aiConfigured()) return res.status(503).json({ ok: false, code: "not_configured", message: "AI is not configured." });
  try {
    const fires = await getFires();
    const { summary, model } = await firesSummary(fires, isAiLang(lang) ? lang : "ru");
    res.json({ ok: true, summary, model, from: fires.from, to: fires.to, total: fires.stats.total });
  } catch (err) {
    if (err instanceof FirmsError) {
      return res.status(503).json({ ok: false, code: err.code === "not_configured" ? "firms_not_configured" : "firms_unavailable", message: "Satellite data is unavailable." });
    }
    console.error("[ai] fires summary failed:", err instanceof Error ? err.message : err);
    const code = err instanceof AiError ? err.code : "unavailable";
    res.status(code === "bad_response" ? 502 : 503).json({ ok: false, code, message: "Summary failed." });
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
    const [byCategory, byStatus] = await Promise.all(
      ["$category", "$status"].map((field) =>
        collection.aggregate<{ _id: string; count: number }>([{ $group: { _id: field, count: { $sum: 1 } } }]).toArray()
      )
    );
    res.json({
      total,
      resolved,
      open,
      byCategory: Object.fromEntries(byCategory.map((x) => [x._id, x.count])),
      byStatus: Object.fromEntries(byStatus.map((x) => [x._id ?? "open", x.count])),
    });
  } catch {
    res.status(500).json({ ok: false, message: "Failed to read stats" });
  }
});

// "false" deletes a false report. Marking as resolved needs 3 confirmations (see confirm-resolved).
app.patch("/api/reports/:id/resolve", async (req, res) => {
  const objectId = parseId(req, res);
  if (!objectId) return;
  try {
    const collection = await getReportsCollection();
    if ((req.body as { reason?: string })?.reason !== "false") {
      return res.status(400).json({
        ok: false,
        code: "needs_confirmations",
        message: `Resolved requires ${CONFIRMATIONS_TO_RESOLVE} confirmations with an 'after' photo.`,
      });
    }
    const removed = await collection.findOneAndDelete({ _id: objectId });
    if (!removed) return res.status(404).json({ ok: false, message: "Not found" });
    void deleteImages([removed.imageUrl, ...removed.imageUrls, ...(removed.confirmations ?? []).map((c) => c.imageUrl)]);
    res.json({ ok: true, action: "deleted" });
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
    void deleteImages([removed.imageUrl, ...removed.imageUrls, ...(removed.confirmations ?? []).map((c) => c.imageUrl)]);
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
  if (isProd && !usingObjectStorage) {
    console.warn("[storage] S3_* not set: photos are saved to the local disk, which Render's free plan wipes on every restart.");
  }
  // Demo data: always for the in-memory dev DB (it starts empty), or when SEED_DEMO=1.
  if ((!process.env.MONGODB_URI && !isProd) || process.env.SEED_DEMO === "1") {
    seedDemo()
      .then((n) => n && console.log(`[seed] added ${n} demo reports`))
      .catch((err) => console.error("[seed] failed:", err instanceof Error ? err.message : err));
  }
});
