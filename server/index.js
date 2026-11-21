import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fssync from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { getReportsCollection, pingDb, toObjectId } from "./db.js";
import { putImage, deleteImages, usingObjectStorage } from "./storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 5000;
const UPLOAD_DIR = path.join(__dirname, "uploads");

// --- Ensure upload dir exists ---
fssync.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();

// --- Security headers (mirrors frontend vercel.json) ---
const isProd = process.env.NODE_ENV === "production";
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
  if (isProd) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
  next();
});

// --- CORS ---
// Dev (localhost:5173) is always allowed. In production, only origins listed in
// CORS_ORIGINS are permitted; unknown origins are rejected (no more "*").
const DEV_ORIGINS = ["http://localhost:5173"];
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .concat(DEV_ORIGINS);

app.use(
  cors({
    origin: (origin, cb) => {
      // no origin = non-browser (curl, health checks) → allow
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin not allowed: ${origin}`));
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Static uploads (disk fallback only) ---
// When using object storage, images are served from the public bucket URL, so
// there is nothing to serve locally. In disk mode, the Vercel frontend fetches
// these cross-origin, so this route overrides the global same-origin CORP.
if (!usingObjectStorage) {
  app.use("/uploads", (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD");
    }
    next();
  });
  app.use("/uploads", express.static(UPLOAD_DIR));
}

import sharp from "sharp";

// --- Multer: images only, up to 5 files, 12MB each ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const name = crypto.randomBytes(12).toString("hex");
    cb(null, `${name}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new Error("Only image files are allowed."));
  },
});

// Normalize any image (jpg/png/heic/webp/gif/tiff) to a web-optimized JPEG,
// auto-rotated from EXIF so phone photos aren't sideways. Limits upload size.
async function optimizeImage(filePath) {
  try {
    const out = filePath + ".opt.jpg";
    await sharp(filePath, { failOn: "none" })
      .rotate() // auto-orient using EXIF Orientation
      .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(out);
    fssync.unlinkSync(filePath); // remove the raw upload
    fssync.renameSync(out, filePath);
    return true;
  } catch {
    return false; // keep original if optimization fails
  }
}

// Remove all uploaded image files/objects for a report (handles imageUrl + imageUrls[]).
async function deleteImageFiles(report) {
  if (!report) return;
  const urls = [report.imageUrl, ...(report.imageUrls || [])].filter(Boolean);
  await deleteImages(urls);
}

// --- Routes ---
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "clean-city-api" });
});

app.get("/api/health", async (_req, res) => {
  let mongo = false;
  try {
    await pingDb();
    mongo = true;
  } catch {
    mongo = false;
  }
  res.json({ ok: true, mongo, time: Date.now() });
});

app.get("/api/reports", async (_req, res) => {
  try {
    const collection = await getReportsCollection();
    const reports = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    // Serialize _id to a string for the client.
    const serialized = reports.map((r) => ({
      ...r,
      _id: r._id.toString(),
    }));
    res.json(serialized);
  } catch {
    res.status(500).json({ ok: false, message: "Failed to read reports" });
  }
});

app.post("/api/reports", upload.array("images", 5), async (req, res) => {
  try {
    const { title, desc, category, lat, lng } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ ok: false, message: "Title is required." });
    }
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({ ok: false, message: "Valid lat/lng required." });
    }

    // Optimize + collect up to 5 uploaded images, then store (disk or object storage).
    const files = (req.files || []).slice(0, 5);
    const imageUrls = [];
    for (const f of files) {
      await optimizeImage(f.path); // raw -> optimized jpg at same path
      const key = `${crypto.randomBytes(12).toString("hex")}.jpg`;
      const url = await putImage(f.path, key, "image/jpeg");
      imageUrls.push(url);
      // local temp no longer needed (for disk mode the copy is in uploads/)
      try {
        fssync.unlinkSync(f.path);
      } catch {
        /* ignore */
      }
    }

    const doc = {
      title: title.trim(),
      desc: (desc || "").trim(),
      category: (category || "other").trim(),
      lat: latitude,
      lng: longitude,
      imageUrl: imageUrls[0] || null, // first image kept for backward-compat
      imageUrls,
      status: "open",
      upvotes: 0,
      createdAt: new Date(),
    };

    const collection = await getReportsCollection();
    const result = await collection.insertOne(doc);

    res.status(201).json({
      ok: true,
      report: { ...doc, _id: result.insertedId.toString() },
    });
  } catch (err) {
    const msg = err && err.message ? err.message : "Failed to create report";
    res.status(400).json({ ok: false, message: msg });
  }
});

// Stats: counts by status + total + per-category breakdown.
app.get("/api/stats", async (_req, res) => {
  try {
    const collection = await getReportsCollection();
    const [total, resolved, open] = await Promise.all([
      collection.countDocuments({}),
      collection.countDocuments({ status: "resolved" }),
      collection.countDocuments({ status: "open" }),
    ]);
    const byCategory = await collection
      .aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }])
      .toArray();
    res.json({
      total,
      resolved,
      open,
      byCategory: byCategory.reduce((acc, x) => {
        acc[x._id] = x.count;
        return acc;
      }, {}),
    });
  } catch {
    res.status(500).json({ ok: false, message: "Failed to read stats" });
  }
});

// Toggle resolved status (mark solved/false -> here: "solved" keeps, "false" deletes).
app.patch("/api/reports/:id/resolve", async (req, res) => {
  try {
    const collection = await getReportsCollection();
    let objectId;
    try {
      objectId = toObjectId(req.params.id);
    } catch {
      return res.status(400).json({ ok: false, message: "Invalid id" });
    }
    const reason = req.body && req.body.reason;
    if (reason === "false") {
      // false report: remove entirely
      const removed = await collection.findOneAndDelete({ _id: objectId });
      if (!removed) return res.status(404).json({ ok: false, message: "Not found" });
      deleteImageFiles(removed);
      console.log(`[reports] deleted ${req.params.id} reason=false`);
      return res.json({ ok: true, action: "deleted" });
    }
    // default / "solved": mark as resolved (kept)
    const updated = await collection.findOneAndUpdate(
      { _id: objectId },
      { $set: { status: "resolved" } },
      { returnDocument: "after" }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true, action: "resolved", report: { ...updated, _id: updated._id.toString() } });
  } catch {
    res.status(500).json({ ok: false, message: "Resolve failed" });
  }
});

// Upvote a report (community validation).
app.patch("/api/reports/:id/upvote", async (req, res) => {
  try {
    const collection = await getReportsCollection();
    let objectId;
    try {
      objectId = toObjectId(req.params.id);
    } catch {
      return res.status(400).json({ ok: false, message: "Invalid id" });
    }
    const updated = await collection.findOneAndUpdate(
      { _id: objectId },
      { $inc: { upvotes: 1 } },
      { returnDocument: "after" }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true, upvotes: updated.upvotes, report: { ...updated, _id: updated._id.toString() } });
  } catch {
    res.status(500).json({ ok: false, message: "Upvote failed" });
  }
});

// Delete (admin/cleanup). Optional ?reason=false for audit logging.
app.delete("/api/reports/:id", async (req, res) => {
  try {
    const collection = await getReportsCollection();
    let objectId;
    try {
      objectId = toObjectId(req.params.id);
    } catch {
      return res.status(400).json({ ok: false, message: "Invalid id" });
    }
    const removed = await collection.findOneAndDelete({ _id: objectId });
    if (!removed) return res.status(404).json({ ok: false, message: "Not found" });
    deleteImageFiles(removed);
    console.log(`[reports] deleted ${req.params.id} reason=${req.query.reason || "none"}`);
    res.json({ ok: true, action: "deleted" });
  } catch {
    res.status(500).json({ ok: false, message: "Delete failed" });
  }
});

app.listen(PORT, () => {
  console.log(`CleanCity API listening on http://localhost:${PORT}`);
  console.log(`Uploads dir: ${UPLOAD_DIR}`);
});
