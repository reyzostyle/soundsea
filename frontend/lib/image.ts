// Center-crop a cover image to a square for lock-screen artwork (MediaSession shows
// the image as-is, so 16:9 video thumbnails look wrong without this). Cached per URL.
const coverCache = new Map<string, string>();

export async function squareCoverUrl(src: string, size = 512): Promise<string> {
  const cached = coverCache.get(src);
  if (cached) return cached;
  const img = new Image();
  img.crossOrigin = "anonymous";
  const loaded = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("image load failed"));
  });
  img.src = src;
  await loaded;
  const s = Math.min(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("crop failed");
  const url = URL.createObjectURL(blob);
  coverCache.set(src, url);
  return url;
}

// Downscale a picked image to a small square-ish data URL so custom covers stay
// tiny enough to live in localStorage / a Supabase text column without a bucket.
export function downscaleToDataUrl(file: File, max = 256, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a valid image."));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not process the image."));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
