"use client";

export class TryOnRequestError extends Error {
  constructor({ status, code, message, retryAfter, hint }) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter ?? null;
    this.hint = hint ?? null;
  }
}

// One call to our own route. The browser never talks to Gemini.
export async function requestTryOn({ base, garmentIds, note, signal }) {
  let response;
  try {
    response = await fetch("/api/tryon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base, garmentIds, note }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new TryOnRequestError({
      status: 0,
      code: "network",
      message: "Could not reach the fitting room. Check your connection and try again.",
    });
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.image) {
    const retryHeader = Number(response.headers.get("Retry-After"));
    throw new TryOnRequestError({
      status: response.status,
      code: data?.error?.code ?? "unknown",
      message: data?.error?.message ?? "Something went wrong while making the photo. Please try again.",
      retryAfter: data?.error?.retryAfter ?? (Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : null),
      hint: data?.error?.hint,
    });
  }
  return data;
}

export async function fetchTryOnStatus() {
  try {
    const response = await fetch("/api/tryon", { cache: "no-store" });
    return await response.json();
  } catch {
    return { ready: false, mock: false };
  }
}
