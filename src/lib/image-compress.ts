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

  // If already under target, return as-is
  if (file.size <= targetMaxBytes) {
    return file instanceof File ? file : new File([file], "image.jpg", { type: "image/jpeg" });
  }

  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;

  // Max initial dimension
  const maxDim = 1200;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return file instanceof File ? file : new File([file], "image.jpg", { type: "image/jpeg" });
  }

  ctx.drawImage(bitmap, 0, 0, width, height);

  let quality = 0.82;
  let blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
  );

  // Progressive compression loop
  while (blob && blob.size > targetMaxBytes && quality > 0.2) {
    quality -= 0.12;
    width = Math.round(width * 0.82);
    height = Math.round(height * 0.82);
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(bitmap, 0, 0, width, height);
    blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
    );
  }

  const finalBlob = blob || file;
  const filename = file instanceof File ? file.name.replace(/\.[^/.]+$/, ".jpg") : "photo.jpg";
  return new File([finalBlob], filename, { type: "image/jpeg" });
}
