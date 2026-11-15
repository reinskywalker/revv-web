/**
 * Shared client-side image resize & compression utilities.
 */

export async function renderCanvasBlob(
  img: { width: number; height: number } | HTMLImageElement | ImageBitmap,
  maxDimension: number,
  quality: number,
  preferWebp = true,
): Promise<{ blob: Blob; mime: string; ext: string }> {
  const srcW =
    "naturalWidth" in img && img.naturalWidth > 0 ? img.naturalWidth : Math.max(1, img.width);
  const srcH =
    "naturalHeight" in img && img.naturalHeight > 0 ? img.naturalHeight : Math.max(1, img.height);

  const ratio = Math.min(1, maxDimension / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * ratio));
  const height = Math.max(1, Math.round(srcH * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }
  ctx.drawImage(img as CanvasImageSource, 0, 0, width, height);

  const tryEncode = (mime: string, q: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), mime, q));

  if (preferWebp) {
    const webp = await tryEncode("image/webp", quality);
    if (webp && webp.type === "image/webp" && webp.size > 0) {
      return { blob: webp, mime: "image/webp", ext: "webp" };
    }
  }
  const jpeg = await tryEncode("image/jpeg", quality);
  if (jpeg && jpeg.size > 0) {
    return { blob: jpeg, mime: "image/jpeg", ext: "jpg" };
  }
  throw new Error("Failed to compress image");
}

/**
 * Compresses an image File to fit within maxDimension and returns JPEG.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 2048,
  quality = 0.82,
): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Invalid image file"));
      el.src = url;
    });
    const rendered = await renderCanvasBlob(img, maxDimension, quality, false);
    return new File([rendered.blob], file.name.replace(/\.[^/.]+$/, `.${rendered.ext}`), {
      type: rendered.mime,
    });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Compresses an image File or Blob to ensure it stays strictly under maxBytes (default 100 KB),
 * accepting original photos up to maxInputBytes (default 5 MB).
 */
export async function compressImageToTarget(
  file: File | Blob,
  targetMaxBytes = 100 * 1024,
  maxInputBytes = 5 * 1024 * 1024,
): Promise<File> {
  if (file.size > maxInputBytes) {
    throw new Error(
      `Selected photo exceeds the 5 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please choose a smaller photo.`,
    );
  }

  if (file.size <= targetMaxBytes) {
    return file instanceof File ? file : new File([file], "image.jpg", { type: "image/jpeg" });
  }

  const bitmap = await createImageBitmap(file);
  try {
    let maxDim = 1200;
    let quality = 0.82;
    let encoded = await renderCanvasBlob(bitmap, maxDim, quality, false);

    while (encoded.blob.size > targetMaxBytes && quality > 0.2) {
      quality = Math.max(0.2, quality - 0.12);
      maxDim = Math.max(240, Math.round(maxDim * 0.82));
      encoded = await renderCanvasBlob(bitmap, maxDim, quality, false);
    }

    const filename = file instanceof File ? file.name.replace(/\.[^/.]+$/, ".jpg") : "photo.jpg";
    return new File([encoded.blob], filename, { type: "image/jpeg" });
  } finally {
    bitmap.close?.();
  }
}
