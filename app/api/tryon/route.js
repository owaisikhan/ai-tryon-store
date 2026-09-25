import { tryOnConfig } from "@/app/_lib/tryon/config";
import { TryOnError } from "@/app/_lib/tryon/errors";
import { toDataUrl } from "@/app/_lib/tryon/images";
import { checkRateLimit, clientIp } from "@/app/_lib/tryon/rate-limit";
import { runTryOn } from "@/app/_lib/tryon/service";

// Gemini is called only from here, with the key from the server environment.
export const runtime = "nodejs";
export const maxDuration = 60;

const isDev = process.env.NODE_ENV !== "production";

/*
  POST /api/tryon
  {
    "base": { "type": "preset", "id": "amara" }
          | { "type": "image", "image": "data:image/jpeg;base64,..." },
    "garmentIds": ["camel-belted-trench"],      // one or more, applied in order
    "note": "tuck the shirt in"                  // optional, under 200 characters
  }
  200 { "image": "data:image/webp;base64,...", "cached": false, "steps": 1, "mock": false }
  4xx/5xx { "error": { "code", "message", "retryAfter"? } }
*/
export async function POST(request) {
  try {
    const wait = checkRateLimit(clientIp(request));
    if (wait) {
      throw new TryOnError(429, "rate_limited", "You are trying things on very fast. Give it a few seconds.", {
        retryAfter: wait,
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      throw new TryOnError(400, "bad_request", "The request could not be read.");
    }

    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 200) : "";
    const result = await runTryOn({ base: body?.base, garmentIds: body?.garmentIds, note });

    return Response.json({
      image: toDataUrl(result.buffer),
      cached: result.cached,
      steps: result.steps,
      mock: result.mock,
    });
  } catch (error) {
    const e =
      error instanceof TryOnError
        ? error
        : new TryOnError(500, "internal", "Something went wrong while making the photo. Please try again.", {
            hint: error?.message,
          });

    if (e.status >= 500) console.error(`[tryon] ${e.code}: ${e.hint ?? e.message}`);

    return Response.json(
      {
        error: {
          code: e.code,
          message: e.message,
          retryAfter: e.retryAfter ?? undefined,
          hint: isDev ? (e.hint ?? undefined) : undefined,
        },
      },
      { status: e.status, headers: e.retryAfter ? { "Retry-After": String(e.retryAfter) } : undefined },
    );
  }
}

// GET /api/tryon: whether the fitting room can run, without exposing the key.
export async function GET() {
  return Response.json({
    ready: tryOnConfig.mock || Boolean(tryOnConfig.apiKey),
    mock: tryOnConfig.mock,
  });
}
