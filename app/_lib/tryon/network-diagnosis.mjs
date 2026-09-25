// Why a request to Google's API never got an answer, in plain words.
//
// Node's fetch reports every network failure as "TypeError: fetch failed";
// the actual reason (DNS, a blocked connection, an intercepted certificate)
// is only in error.cause. The try-on route (as a dev hint) and
// scripts/tryon-doctor.mjs both read it through this one table, so they
// always give the same advice. Pure module (.mjs so plain Node can import it
// too): no Next or server-only imports.

export const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";

const TLS = new Set([
  "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UNABLE_TO_GET_ISSUER_CERT",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "CERT_HAS_EXPIRED",
  "CERT_UNTRUSTED",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);
const DNS = new Set(["ENOTFOUND", "EAI_AGAIN", "EAI_FAIL", "ENODATA"]);
const CONNECT = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "EPIPE",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);
// Worth one quiet retry: the connection opened and then dropped.
export const TRANSIENT = new Set(["ECONNRESET", "UND_ERR_SOCKET", "EPIPE"]);

function proxyIn(env) {
  return env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy || "";
}

// Returns { kind, code, detail, advice } for a network failure, or null when
// the error is something else (an HTTP error from Google, a bad image).
export function diagnoseNetworkError(error, env = {}) {
  if (!error || typeof error !== "object") return null;
  const cause = error.cause && typeof error.cause === "object" ? error.cause : null;
  const nested = [...(cause?.errors ?? []), ...(error.errors ?? [])];
  const codes = [cause?.code, ...nested.map((e) => e?.code), error.code].filter(
    (c) => typeof c === "string" && c.length > 0,
  );
  const fetchFailed = error instanceof TypeError && /fetch failed/i.test(error.message ?? "");
  const timedOut = error.name === "TimeoutError" || cause?.name === "TimeoutError";
  if (!fetchFailed && !timedOut && !codes.some((c) => TLS.has(c) || DNS.has(c) || CONNECT.has(c))) return null;

  const code = codes[0] ?? (timedOut ? "TIMEOUT" : "UNKNOWN");
  const detail = (cause?.message ?? error.message ?? "").slice(0, 200);
  const proxy = proxyIn(env);
  const proxyIgnored = proxy && env.NODE_USE_ENV_PROXY !== "1";
  const proxyNote = proxyIgnored
    ? " Also: HTTPS_PROXY or HTTP_PROXY is set, but Node's fetch ignores it unless NODE_USE_ENV_PROXY=1 is set too (your Node must list --use-env-proxy in `node --help`)."
    : "";

  if (TLS.has(code)) {
    return {
      kind: "tls",
      code,
      detail,
      advice:
        "Something is intercepting HTTPS on this machine or network (an antivirus web shield, a company proxy or a network filter). Turn off HTTPS scanning for Node, or set NODE_EXTRA_CA_CERTS to that tool's root certificate file and restart the server. Do not set NODE_TLS_REJECT_UNAUTHORIZED=0." +
        proxyNote,
    };
  }
  if (DNS.has(code)) {
    return {
      kind: "dns",
      code,
      detail,
      advice:
        "This machine could not look up Google's API address. Check the internet connection, try another DNS server (such as 8.8.8.8 or 1.1.1.1), or switch a VPN on or off." +
        proxyNote,
    };
  }
  if (CONNECT.has(code) || timedOut) {
    return {
      kind: "connect",
      code,
      detail,
      advice:
        "The connection to Google's API was blocked or dropped. A firewall, VPN or network filter is the usual cause; trying another network (a phone hotspot) tells you quickly." +
        proxyNote,
    };
  }
  return {
    kind: "unknown",
    code,
    detail,
    advice: "Try another network, and run `npm run doctor` for a step-by-step check." + proxyNote,
  };
}
