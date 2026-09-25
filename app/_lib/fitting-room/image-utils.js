"use client";

const MAX_EDGE = 1024;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

// Shrinks an uploaded photo in the browser before it is ever sent anywhere:
// upright, at most 1024px on the long side, JPEG. Keeps requests small and
// well under the 4.5 MB request cap on Vercel.
export async function prepareUploadedPhoto(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error("Use a JPEG, PNG or WebP photo. On an iPhone, choose Most Compatible in camera settings.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("That photo is over 15 MB. Try a smaller one.");
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("That photo could not be opened. Try a different one.");
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f2f1ee";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(dataUrl));
  const hash = Array.from(new Uint8Array(digest).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");

  return { dataUrl, hash, width, height };
}
