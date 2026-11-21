import "./env.ts";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import sharp from "sharp";
import type { WithId } from "mongodb";
import { getReportsCollection, pingDb, toObjectId } from "./db.ts";
import { DISK_DIR, deleteImages, putImage, usingObjectStorage } from "./storage.ts";
import type { ReportDoc } from "./types.ts";

const PORT = Number(process.env.PORT) || 5050;
const TMP_DIR = path.join(import.meta.dirname, "uploads", "tmp");
fs.mkdirSync(TMP_DIR, { recursive: true });

const app = express();
const isProd = process.env.NODE_ENV === "production";

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
    const { title, desc, category, lat, lng } = req.body as Record<string, string | undefined>;
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
      lat: latitude,
      lng: longitude,
      imageUrl: imageUrls[0] ?? null, // first image kept for backward-compat
      imageUrls,
      status: "open",
      upvotes: 0,
      createdAt: new Date(),
    };
    const result = await (await getReportsCollection()).insertOne(doc);
    res.status(201).json({ ok: true, report: { ...doc, _id: result.insertedId.toString() } });
  } catch (err) {
    res.status(400).json({ ok: false, message: err instanceof Error ? err.message : "Failed to create report" });
  } finally {
    for (const f of files) fs.rm(f.path, { force: true }, () => {});
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
  res.status(err instanceof multer.MulterError ? 413 : 400).json({ ok: false, message });
});

app.listen(PORT, () => {
  console.log(`Taza AI API listening on http://localhost:${PORT}`);
});
