// Network failures name their cause.
// Bug it guards: a local try-on failed with only "Dev note: network: fetch
// failed". Node's fetch hides the real reason in error.cause, and the route
// threw it away, so the developer could not tell DNS from a firewall from an
// intercepted certificate. No browser or server needed.

import { diagnoseNetworkError } from "../../app/_lib/tryon/network-diagnosis.mjs";

const failed = (cause) => Object.assign(new TypeError("fetch failed"), { cause });
const coded = (code, message = code) => Object.assign(new Error(message), { code });

export default async function networkDiagnosis({ ok }) {
  // A real failed fetch, exactly as the Gemini SDK surfaces it.
  let real = null;
  try {
    await fetch("https://nonexistent-host.invalid/", { signal: AbortSignal.timeout(10000) });
  } catch (error) {
    real = diagnoseNetworkError(error);
  }
  ok("a real DNS failure is named, not just 'fetch failed'", real?.kind === "dns", real ? `${real.kind} ${real.code}` : "no diagnosis");

  const tls = diagnoseNetworkError(failed(coded("SELF_SIGNED_CERT_IN_CHAIN")));
  ok("an intercepted certificate says so", tls?.kind === "tls" && /NODE_EXTRA_CA_CERTS/.test(tls.advice));

  const aggregate = diagnoseNetworkError(failed(new AggregateError([coded("ETIMEDOUT")], "")));
  ok("a connect timeout inside AggregateError is found", aggregate?.kind === "connect" && aggregate.code === "ETIMEDOUT");

  const bare = diagnoseNetworkError(failed(undefined));
  ok("a bare 'fetch failed' still gets advice", bare?.kind === "unknown" && /doctor/.test(bare.advice));

  const http = diagnoseNetworkError(Object.assign(new Error("API key not valid"), { status: 400 }));
  ok("an HTTP error from Google is not treated as a network failure", http === null);

  const withProxy = diagnoseNetworkError(failed(coded("ECONNREFUSED")), { HTTPS_PROXY: "http://proxy:8080" });
  const proxyOn = diagnoseNetworkError(failed(coded("ECONNREFUSED")), { HTTPS_PROXY: "http://proxy:8080", NODE_USE_ENV_PROXY: "1" });
  ok("an ignored proxy is pointed out, and only when ignored", /NODE_USE_ENV_PROXY/.test(withProxy.advice) && !/NODE_USE_ENV_PROXY/.test(proxyOn.advice));
}
