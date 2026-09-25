import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";
import { tryOnConfig } from "@/app/_lib/tryon/config";
import { TryOnError, parseRetryDelay } from "@/app/_lib/tryon/errors";

let client = null;
function getClient() {
  if (!tryOnConfig.apiKey) {
    throw new TryOnError(503, "not_configured", "The fitting room is offline right now. Please try again later.", {
      hint: "Set GEMINI_API_KEY in .env.local (see README), or TRYON_MOCK=1 to test the flow without Gemini.",
    });
  }
  client ??= new GoogleGenAI({ apiKey: tryOnConfig.apiKey });
  return client;
}

const BLOCKED = new Set(["SAFETY", "IMAGE_SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION", "IMAGE_PROHIBITED_CONTENT"]);

function translateError(error) {
  if (error instanceof TryOnError) return error;
  const status = error instanceof ApiError ? error.status : Number(error?.status) || 0;
  const text = error?.message ?? "";

  if (status === 429) {
    return new TryOnError(429, "rate_limited", "The fitting room is busy right now. Give it a moment and try again.", {
      retryAfter: parseRetryDelay(text) ?? 30,
      hint: "Gemini quota or rate limit reached (HTTP 429).",
    });
  }
  if (status === 400 && /api key/i.test(text)) {
    return new TryOnError(503, "bad_key", "The fitting room is offline right now. Please try again later.", {
      hint: "Gemini rejected GEMINI_API_KEY. Check the key in .env.local.",
    });
  }
  if (status === 403) {
    return new TryOnError(503, "forbidden", "The fitting room is offline right now. Please try again later.", {
      hint: "Gemini returned 403: the key may lack access to this model, or billing may be required for image output.",
    });
  }
  if (status === 404) {
    return new TryOnError(503, "model_missing", "The fitting room is offline right now. Please try again later.", {
      hint: `Model "${tryOnConfig.model}" was not found. Set GEMINI_IMAGE_MODEL to a current image model.`,
    });
  }
  if (error?.name === "AbortError" || /timed? ?out/i.test(text)) {
    return new TryOnError(504, "timeout", "That took too long. Please try again.");
  }
  return new TryOnError(502, "upstream", "Something went wrong while making the photo. Please try again.", {
    hint: `${status || "network"}: ${text.slice(0, 300)}`,
  });
}

async function callOnce({ base, garment, instruction, aspectRatio }) {
  const response = await getClient().models.generateContent({
    model: tryOnConfig.model,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base.toString("base64") } },
          { inlineData: { mimeType: "image/jpeg", data: garment.toString("base64") } },
          { text: instruction },
        ],
      },
    ],
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio },
      httpOptions: { timeout: tryOnConfig.requestTimeoutMs, retryOptions: { attempts: 1 } },
    },
  });

  const candidate = response.candidates?.[0];
  const image = candidate?.content?.parts?.find((part) => part.inlineData?.data);
  if (image) return Buffer.from(image.inlineData.data, "base64");

  const reason = response.promptFeedback?.blockReason || candidate?.finishReason;
  if (reason && BLOCKED.has(String(reason))) {
    throw new TryOnError(422, "blocked", "This photo could not be edited. Try a different photo or piece.", {
      hint: `Gemini declined the request (${reason}).`,
    });
  }
  throw new TryOnError(502, "no_image", "No photo came back this time. Please try again.", {
    hint: `Gemini returned no image (finishReason: ${candidate?.finishReason ?? "none"}).`,
  });
}

// One try-on edit. Retries once on a transient 500 or 503; never on 429,
// which gets reported to the shopper with the wait Gemini asked for.
export async function generateTryOn(input) {
  try {
    return await callOnce(input);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 0;
    if (status === 500 || status === 503) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        return await callOnce(input);
      } catch (retryError) {
        throw translateError(retryError);
      }
    }
    throw translateError(error);
  }
}
