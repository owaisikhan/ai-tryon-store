import "server-only";

export const tryOnConfig = {
  apiKey: process.env.GEMINI_API_KEY || "",
  // Gemini 2.5 Flash Image, the image editing model. Override without a code
  // change if Google renames or supersedes it.
  model: process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image",
  // Optional: send Gemini calls through a gateway instead of Google directly.
  baseUrl: process.env.GEMINI_BASE_URL || "",
  // TRYON_MOCK=1 composites the garment onto the photo locally instead of
  // calling Gemini. For building the UI without spending quota.
  mock: process.env.TRYON_MOCK === "1" || process.env.TRYON_MOCK === "true",
  // Requests per minute per visitor IP, before Gemini's own limits apply.
  ratePerMinute: Number(process.env.TRYON_RATE_LIMIT_PER_MIN) || 12,
  requestTimeoutMs: 55_000,
  maxGarmentsPerRequest: 8,
  // Longest edge, in pixels, of every image sent to Gemini.
  maxEdge: 1024,
  // Upload guard: base64 payload size, roughly 4.5 MB of image.
  maxImageChars: 6_000_000,
};
