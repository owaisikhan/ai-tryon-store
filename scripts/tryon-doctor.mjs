// npm run doctor: can this machine run real try-ons?
//
// Checks, in order, and stops at the first failure with advice:
//   1. GEMINI_API_KEY is set (read from .env.local like `next dev` does)
//   2. Google's API host resolves in DNS
//   3. An HTTPS connection to it succeeds
//   4. The key is accepted and the image model is available to it
// Costs nothing: no image is generated. Image billing or quota problems only
// show up on a real try-on, as a 403 or 429 in the fitting room.

import { lookup } from "node:dns/promises";
import nextEnv from "@next/env";
import { DEFAULT_GEMINI_BASE_URL, diagnoseNetworkError } from "../app/_lib/tryon/network-diagnosis.mjs";

nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error: console.error });

const env = process.env;
const baseUrl = (env.GEMINI_BASE_URL || DEFAULT_GEMINI_BASE_URL).replace(/\/$/, "");
const host = new URL(baseUrl).hostname;
const model = env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const TIMEOUT_MS = 15_000;

const pad = (label) => `${label} `.padEnd(26, ".");
const ok = (label, text) => console.log(`  ok    ${pad(label)} ${text}`);
const note = (text) => console.log(`        ${text}`);
function fail(label, text, advice) {
  console.log(`  FAIL  ${pad(label)} ${text}`);
  if (advice) for (const line of wrap(advice)) note(line);
  console.log("\nFix that, restart the dev server, and run npm run doctor again.");
  process.exit(1);
}
function wrap(text, width = 76) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if ((line + " " + word).trim().length > width) {
      lines.push(line);
      line = word;
    } else line = (line + " " + word).trim();
  }
  if (line) lines.push(line);
  return lines;
}

console.log(`\nTry-on doctor (Node ${process.version}, ${process.platform})\n`);

const proxy = env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy;
if (proxy) note(`Proxy variable set. NODE_USE_ENV_PROXY=${env.NODE_USE_ENV_PROXY || "(not set)"}`);
if (env.NODE_EXTRA_CA_CERTS) note(`NODE_EXTRA_CA_CERTS=${env.NODE_EXTRA_CA_CERTS}`);
if (env.NODE_TLS_REJECT_UNAUTHORIZED === "0") note("Warning: NODE_TLS_REJECT_UNAUTHORIZED=0 turns off certificate checks. Remove it.");
if (env.TRYON_MOCK === "1" || env.TRYON_MOCK === "true") note("TRYON_MOCK is on, so the app will not call Gemini until you turn it off.");
if (env.GEMINI_BASE_URL) note(`GEMINI_BASE_URL=${baseUrl}`);
if (proxy || env.NODE_EXTRA_CA_CERTS || env.TRYON_MOCK || env.GEMINI_BASE_URL) console.log("");

// 1. Key
const key = (env.GEMINI_API_KEY || "").trim();
if (!key) {
  fail("GEMINI_API_KEY", "not set", "Copy .env.example to .env.local and paste your Google AI Studio key after GEMINI_API_KEY= (see README).");
}
ok("GEMINI_API_KEY", `set (${key.length} characters${key.startsWith("AIza") ? ", starts with AIza" : ", but Google AI Studio keys usually start with AIza"})`);

// 2. DNS
try {
  const addresses = await lookup(host, { all: true });
  ok("DNS lookup", `${host} -> ${addresses[0].address}${addresses.length > 1 ? ` (+${addresses.length - 1} more)` : ""}`);
} catch (error) {
  const d = diagnoseNetworkError(Object.assign(new TypeError("fetch failed"), { cause: error }), env);
  fail("DNS lookup", `${host}: ${error.code}`, d?.advice);
}

// 3. HTTPS connection (any HTTP answer means the network path works)
try {
  const res = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  ok("HTTPS connection", `reached ${host} (HTTP ${res.status})`);
} catch (error) {
  const d = diagnoseNetworkError(error, env);
  fail("HTTPS connection", `${d?.code ?? error.name}: ${d?.detail ?? error.message}`, d?.advice);
}

// 4. Key and model
let res;
try {
  res = await fetch(`${baseUrl}/v1beta/models/${encodeURIComponent(model)}`, {
    headers: { "x-goog-api-key": key },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
} catch (error) {
  const d = diagnoseNetworkError(error, env);
  fail("Key and model", `${d?.code ?? error.name}: ${d?.detail ?? error.message}`, d?.advice);
}
const body = await res.json().catch(() => ({}));
const message = body?.error?.message ?? "";
if (res.ok) {
  ok("Key and model", `${model} is available to this key`);
  console.log("\nAll good. If a try-on still fails, the Dev note in the fitting room names the reason.\n");
  process.exit(0);
}
const advice =
  res.status === 400 && /api key/i.test(message)
    ? "Google does not accept this key. Copy it again from https://aistudio.google.com/apikey (no quotes or spaces) into .env.local."
    : res.status === 400 && /location/i.test(message)
      ? "The Gemini API is not available from this country or network location. A server in a supported region (such as a Vercel deployment) can still call it."
      : res.status === 403
        ? "The key was refused. If it has API restrictions, allow the Generative Language API; if it is restricted to websites (HTTP referrers), it cannot be used from a server. Create an unrestricted key in AI Studio."
        : res.status === 404
          ? `The model "${model}" was not found for this key. Set GEMINI_IMAGE_MODEL in .env.local to a current Gemini image model.`
          : res.status === 429
            ? "Quota or rate limit reached for this key. Wait a minute, or check limits and billing in Google AI Studio."
            : "Unexpected answer from Google; the message above says why.";
fail("Key and model", `HTTP ${res.status}: ${message.slice(0, 160) || "no message"}`, advice);
