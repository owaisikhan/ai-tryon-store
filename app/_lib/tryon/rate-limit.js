import "server-only";
import { tryOnConfig } from "@/app/_lib/tryon/config";

// A sliding one-minute window per visitor IP, kept in this server instance's
// memory. It protects the API key from a runaway client; Gemini's own quota
// is handled separately in gemini.js.
const WINDOW_MS = 60_000;
const hits = new Map();

export function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "local";
}

// Returns null when allowed, or the seconds to wait.
export function checkRateLimit(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= tryOnConfig.ratePerMinute) {
    hits.set(ip, recent);
    return Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0])) / 1000));
  }
  recent.push(now);
  hits.set(ip, recent);

  // Keep the map from growing without bound on a long-lived instance.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (!times.some((t) => now - t < WINDOW_MS)) hits.delete(key);
    }
  }
  return null;
}
