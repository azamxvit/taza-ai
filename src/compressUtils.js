// Client-side image compression so uploads are fast on any connection.
// Accepts a File (any image type the browser can decode), returns a JPEG Blob
// resized to maxDim and quality. This is a *fast* pre-compress; the server also
// re-optimizes with sharp (auto-orient + web JPEG) so the final stored image is
// consistent regardless of the original format (jpg/png/webp/heic-like, gif, tiff).

export async function compressImage(file, { maxDim = 1280, quality = 0.8 } = {}) {
  if (!file || !file.type || !file.type.startsWith("image/")) return file;

  // Tiny images don't need resizing.
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close?.();
    if (width <= maxDim && height <= maxDim) {
      // Still re-encode to JPEG for predictable size/format.
      return await toJpegBlob(file, maxDim, quality);
    }
    return await toJpegBlob(file, maxDim, quality);
  } catch {
    // createImageBitmap unsupported (rare) — fall back to sending the original.
    return file;
  }
}

function toJpegBlob(file, maxDim, quality) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => resolve(blob || file),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // give up, send original
    };
    img.src = url;
  });
}

// Compress several files in parallel.
export async function compressImages(files, opts) {
  return Promise.all((files || []).map((f) => compressImage(f, opts)));
}
