// What kind of 429 Google sent, from the error body the Gemini SDK puts in
// ApiError.message (the JSON response, stringified).
//
// Three very different situations share HTTP 429:
//   zero      the key has no quota at all for this model (the free tier often
//             allows 0 image generations): only billing fixes it
//   perDay    today's quota is used up: it resets at midnight Pacific time
//   otherwise a per-minute rate limit: waiting retryAfter seconds works
// Pure module (.mjs so plain Node checks can import it).

function seconds(value) {
  const match = /(\d+(?:\.\d+)?)s/.exec(String(value ?? ""));
  return match ? Math.ceil(Number(match[1])) : null;
}

export function describeQuota(errorText) {
  const text = String(errorText ?? "");
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    // Not JSON: fall back to reading the text.
  }
  const error = body?.error ?? {};
  const message = typeof error.message === "string" ? error.message : text;
  const details = Array.isArray(error.details) ? error.details : [];

  const violations = details.flatMap((d) => (Array.isArray(d?.violations) ? d.violations : []));
  const quotas = violations.map((v) => v?.quotaId || v?.quotaMetric).filter(Boolean);
  const limits = [...message.matchAll(/limit:\s*(\d+)/gi)].map((m) => Number(m[1]));
  const values = violations.map((v) => v?.quotaValue).filter((v) => v !== undefined && v !== null).map(Number);
  const everything = `${message} ${quotas.join(" ")}`;

  const retryInfo = details.find((d) => d?.retryDelay)?.retryDelay;
  const retryAfter =
    seconds(retryInfo) ??
    seconds(/retryDelay["'\s:]+["']?([\d.]+s)/i.exec(text)?.[1]) ??
    seconds(/retry in ([\d.]+s)/i.exec(message)?.[1]);

  return {
    zero: limits.includes(0) || values.includes(0),
    freeTier: /free_?tier/i.test(everything),
    perDay: /per ?day/i.test(everything),
    quotas: [...new Set(quotas)],
    retryAfter,
    // Google's first sentence, for the dev note.
    summary: message.split(/\n|(?<=\.)\s/)[0].slice(0, 200),
  };
}
