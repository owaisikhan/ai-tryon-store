import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { tryOnConfig } from "@/app/_lib/tryon/config";
import { TryOnError } from "@/app/_lib/tryon/errors";

// Preset models and product images are read from /public on disk.
// next.config.mjs adds them to the route's file trace so Vercel ships them.
const PUBLIC_DIR = path.join(process.cwd(), "public");

// The pale studio grey the model photos are shot on. Transparent garment
// cutouts are flattened onto it so Gemini sees a clean product shot.
const STUDIO = { r: 242, g: 241, b: 238 };

const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function readPublicImage(publicPath) {
  const resolved = path.join(PUBLIC_DIR, publicPath);
  if (!resolved.startsWith(PUBLIC_DIR + path.sep)) {
    throw new TryOnError(400, "bad_path", "That image is not available.");
  }
  try {
    return await readFile(resolved);
  } catch {
    throw new TryOnError(500, "missing_asset", "A store image is missing on the server.", { hint: resolved });
  }
}

export function decodeDataUrl(dataUrl) {
  if (typeof dataUrl !== "string" || dataUrl.length > tryOnConfig.maxImageChars) {
    throw new TryOnError(413, "image_too_large", "That photo is too large. Try one under 4 MB.");
  }
  const match = /^data:(image\/[a-z+.-]+);base64,([a-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!match || !ACCEPTED.has(match[1].toLowerCase())) {
    throw new TryOnError(415, "bad_image", "Use a JPEG, PNG or WebP photo.");
  }
  return Buffer.from(match[2], "base64");
}

// Every image sent to Gemini: upright, at most maxEdge on its long side, JPEG.
export async function prepareBase(buffer) {
  try {
    const image = sharp(buffer, { failOn: "error" }).rotate();
    const meta = await image.metadata();
    if (!meta.width || !meta.height) throw new Error("no dimensions");
    const out = await image
      .resize({ width: tryOnConfig.maxEdge, height: tryOnConfig.maxEdge, fit: "inside", withoutEnlargement: true })
      .flatten({ background: STUDIO })
      .jpeg({ quality: 90 })
      .toBuffer({ resolveWithObject: true });
    return { buffer: out.data, width: out.info.width, height: out.info.height };
  } catch {
    throw new TryOnError(415, "bad_image", "That photo could not be read. Try a different JPEG, PNG or WebP.");
  }
}

export async function prepareGarment(buffer) {
  const out = await sharp(buffer)
    .resize({ width: 1024, height: 1024, fit: "contain", background: { ...STUDIO, alpha: 1 } })
    .flatten({ background: STUDIO })
    .jpeg({ quality: 90 })
    .toBuffer();
  return out;
}

// Results go back to the browser as WebP: small enough to chain as the next
// step's base image without a heavy upload.
export async function encodeResult(buffer) {
  return sharp(buffer).webp({ quality: 88 }).toBuffer();
}

export function toDataUrl(buffer, mime = "image/webp") {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

// Gemini takes a fixed set of aspect ratios; pick the closest to the base.
const RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9"];
export function nearestAspectRatio(width, height) {
  const target = width / height;
  let best = "3:4";
  let bestDiff = Infinity;
  for (const r of RATIOS) {
    const [w, h] = r.split(":").map(Number);
    const diff = Math.abs(Math.log(w / h / target));
    if (diff < bestDiff) {
      best = r;
      bestDiff = diff;
    }
  }
  return best;
}
