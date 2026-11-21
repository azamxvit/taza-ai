// Storage-agnostic image backend.
//
// If S3_ENDPOINT is configured (e.g. Cloudflare R2 or Supabase Storage, both
// S3-compatible), uploads go to object storage and we store the PUBLIC url.
// Otherwise we fall back to the local disk (dev / ephemeral).
//
// In BOTH cases the database stores only a URL string (like Instagram's CDN
// URLs) — the image bytes are never put in MongoDB. The browser loads the
// image straight from its public URL, so there is no "download" step.
import { S3Client, PutObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import fssync from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DISK_DIR = path.join(__dirname, "uploads");
fssync.mkdirSync(DISK_DIR, { recursive: true });

const USE_S3 = Boolean(process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_PUBLIC_URL);

const s3 = USE_S3
  ? new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: true, // required for R2 / generic S3-compatible
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    })
  : null;

export const usingObjectStorage = USE_S3;

// Upload a local file (full path) and return a PUBLIC url the browser can load.
// `key` is the object key (e.g. "<hex>.jpg").
export async function putImage(localPath, key, contentType = "image/jpeg") {
  if (USE_S3) {
    const body = fssync.readFileSync(localPath);
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        // NOTE: no per-object ACL. Supabase and R2 both reject ACLs on their
        // S3 endpoints — public read is controlled by the bucket being Public.
      })
    );
    // Normalize the public base (strip trailing slash) and join with key.
    const base = process.env.S3_PUBLIC_URL.replace(/\/+$/, "");
    return `${base}/${key}`;
  }
  // Disk fallback: keep the file in uploads/ and return a same-origin path.
  const dest = path.join(DISK_DIR, key);
  fssync.copyFileSync(localPath, dest);
  return `/uploads/${key}`;
}

// Delete one or more image urls (handles both object-storage and disk urls).
export async function deleteImages(urls) {
  const list = (urls || []).filter(Boolean);
  if (list.length === 0) return;

  if (USE_S3) {
    const base = process.env.S3_PUBLIC_URL.replace(/\/+$/, "");
    const keys = list
      .map((u) => (u.startsWith(base) ? u.slice(base.length + 1) : null))
      .filter(Boolean);
    if (keys.length) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: process.env.S3_BUCKET,
          Delete: { Objects: keys.map((Key) => ({ Key })) },
        })
      );
    }
    return;
  }
  // Disk fallback: the stored path is "/uploads/<key>".
  for (const u of list) {
    try {
      fssync.unlinkSync(path.join(__dirname, u));
    } catch {
      /* ignore missing */
    }
  }
}

export { DISK_DIR };
