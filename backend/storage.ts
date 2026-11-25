// Storage-agnostic image backend (from CleanCity).
//
// If S3_ENDPOINT is configured (e.g. Cloudflare R2 or Supabase Storage, both
// S3-compatible), uploads go to object storage and we store the PUBLIC url.
// Otherwise we fall back to the local disk (dev / ephemeral).
// MongoDB only ever stores the URL string, never image bytes.
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";

export const DISK_DIR = path.join(import.meta.dirname, "uploads");
fs.mkdirSync(DISK_DIR, { recursive: true });

const { S3_ENDPOINT, S3_BUCKET, S3_PUBLIC_URL, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
export const usingObjectStorage = Boolean(S3_ENDPOINT && S3_BUCKET && S3_PUBLIC_URL);

const s3 = usingObjectStorage
  ? new S3Client({
      region: S3_REGION || "auto",
      endpoint: S3_ENDPOINT,
      forcePathStyle: true, // required for R2 / generic S3-compatible
      credentials: { accessKeyId: S3_ACCESS_KEY_ID ?? "", secretAccessKey: S3_SECRET_ACCESS_KEY ?? "" },
    })
  : null;

function publicBase(): string {
  const base = new URL(S3_PUBLIC_URL!.trim());
  // Hosted Supabase exposes public objects on the project host, even when
  // the S3 connection string uses the dedicated storage host.
  if (base.hostname.endsWith(".supabase.co") && (base.pathname === "/" || base.pathname.startsWith("/storage/v1/s3"))) {
    base.hostname = base.hostname.replace(/\.storage\.supabase\.co$/, ".supabase.co");
    base.pathname = `/storage/v1/object/public/${encodeURIComponent(S3_BUCKET!)}`;
  }
  return base.href.replace(/\/+$/, "");
}

/** Upload a local file and return a PUBLIC url the browser can load. */
export async function putImage(localPath: string, key: string, contentType = "image/jpeg"): Promise<string> {
  if (s3) {
    // No per-object ACL: Supabase and R2 reject ACLs; the bucket itself is public.
    await s3.send(
      new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: fs.readFileSync(localPath), ContentType: contentType })
    );
    return `${publicBase()}/${key}`;
  }
  fs.copyFileSync(localPath, path.join(DISK_DIR, key));
  return `/uploads/${key}`;
}

/** Delete image urls (handles both object-storage and disk urls). */
export async function deleteImages(urls: (string | null | undefined)[]): Promise<void> {
  const list = urls.filter((u): u is string => Boolean(u));
  if (list.length === 0) return;

  if (s3) {
    const base = publicBase();
    const keys = list.filter((u) => u.startsWith(base)).map((u) => u.slice(base.length + 1));
    if (keys.length) {
      await s3.send(
        new DeleteObjectsCommand({ Bucket: S3_BUCKET, Delete: { Objects: keys.map((Key) => ({ Key })) } })
      );
    }
    return;
  }
  for (const u of list) {
    try {
      fs.unlinkSync(path.join(import.meta.dirname, u));
    } catch {
      /* ignore missing */
    }
  }
}
