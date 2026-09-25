import "server-only";
import sharp from "sharp";

// Where each kind of piece sits on a standing full-body photo, as fractions
// of the frame: left, top, width.
const PLACEMENT = {
  outer: [0.24, 0.2, 0.52],
  top: [0.27, 0.22, 0.46],
  bottom: [0.3, 0.52, 0.4],
  full: [0.26, 0.2, 0.48],
};

// TRYON_MOCK=1: lay the garment cutout over the photo instead of calling
// Gemini. Crude on purpose; it exists to exercise the flow, the loading state
// and the cache without spending quota.
export async function mockTryOn({ base, garmentCutout, slot }) {
  const meta = await sharp(base).metadata();
  const [left, top, width] = PLACEMENT[slot] ?? PLACEMENT.outer;
  const w = Math.round(meta.width * width);
  const overlay = await sharp(garmentCutout).resize({ width: w }).toBuffer();
  await new Promise((resolve) => setTimeout(resolve, 900));
  return sharp(base)
    .composite([{ input: overlay, left: Math.round(meta.width * left), top: Math.round(meta.height * top) }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
