// Client-side image compression (from CleanCity) so uploads are fast on any
// connection. Returns a JPEG Blob resized to maxDim; the server re-optimizes
// with sharp (auto-orient + web JPEG).

interface CompressOptions {
  maxDim?: number;
  quality?: number;
}

export async function compressImage(file: File, { maxDim = 1280, quality = 0.8 }: CompressOptions = {}): Promise<Blob> {
  if (!file.type?.startsWith("image/")) return file;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // give up, send the original
    };
    img.src = url;
  });
}

export function compressImages(files: File[], opts?: CompressOptions): Promise<Blob[]> {
  return Promise.all(files.map((f) => compressImage(f, opts)));
}
