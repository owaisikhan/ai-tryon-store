import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";
import { tryOnConfig } from "@/app/_lib/tryon/config";
import { TryOnError } from "@/app/_lib/tryon/errors";
import { TRANSIENT, diagnoseNetworkError } from "@/app/_lib/tryon/network-diagnosis.mjs";
import { describeQuota } from "@/app/_lib/tryon/quota-diagnosis.mjs";

let client = null;
function getClient() {
  if (!tryOnConfig.apiKey) {
    throw new TryOnError(503, "not_configured", "The fitting room is offline right now. Please try again later.", {
      hint: "Set GEMINI_API_KEY in .env.local (see README), or TRYON_MOCK=1 to test the flow without Gemini.",
    });
  }
  client ??= new GoogleGenAI({
    apiKey: tryOnConfig.apiKey,
    ...(tryOnConfig.baseUrl ? { httpOptions: { baseUrl: tryOnConfig.baseUrl } } : {}),
  });
  return client;
}

const BLOCKED = new Set(["SAFETY", "IMAGE_SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION", "IMAGE_PROHIBITED_CONTENT"]);

function translateError(error) {
  if (error instanceof TryOnError) return error;

  // No HTTP answer at all: DNS, a blocked connection, an intercepted
  // certificate. Say which, instead of Node's bare "fetch failed".
  const network = diagnoseNetworkError(error, process.env);
  if (network) {
    return new TryOnError(503, "unreachable", "The fitting room cannot reach the try-on service right now. Please try again in a moment.", {
      hint: `This server could not connect to Google's Gemini API (${network.code}: ${network.detail}).`,
      advice: `${network.advice} Run "npm run doctor" for a step-by-step check.`,
    });
  }

  const status = error instanceof ApiError ? error.status : Number(error?.status) || 0;
  const text = error?.message ?? "";

  if (status === 429) return translateQuota(text);
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

// Google answered 429. Which kind decides whether waiting can ever help.
function translateQuota(text) {
  const q = describeQuota(text);
  const model = tryOnConfig.model;
  const which = q.quotas.length ? ` Quota hit: ${q.quotas.join(", ")}.` : "";
  const said = q.summary ? ` Google said: "${q.summary}"` : "";

  if (q.zero) {
    return new TryOnError(503, "no_quota", "The fitting room is offline right now. Please try again later.", {
      hint: `Google allows this key 0 requests for ${model}${q.freeTier ? " on the free tier" : ""} (HTTP 429, limit: 0). Waiting will not help.`,
      advice: `Image generation needs billing on the Google Cloud project behind this key. In Google AI Studio (https://aistudio.google.com/apikey), open the key's project and set up billing, then try again: no code change is needed. Until then, TRYON_MOCK=1 keeps the fitting room usable for UI work.${which}${said}`,
    });
  }
  if (q.perDay) {
    return new TryOnError(429, "daily_quota", "The fitting room has reached today's limit. Please try again tomorrow.", {
      hint: `Today's quota for ${model} is used up (HTTP 429).`,
      advice: `Daily Gemini limits reset at midnight Pacific time. A paid tier raises them.${which}${said}`,
    });
  }
  return new TryOnError(429, "rate_limited", "The fitting room is busy right now. Give it a moment and try again.", {
    retryAfter: q.retryAfter ?? 30,
    hint: `Gemini per-minute rate limit reached (HTTP 429); Google asked to wait ${q.retryAfter ?? 30}s.`,
    advice: `Too many requests in a short time for this key. It clears on its own; a paid tier raises the limit.${which}${said}`,
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

function isTransient(error) {
  const status = error instanceof ApiError ? error.status : 0;
  if (status === 500 || status === 503) return true;
  const network = diagnoseNetworkError(error);
  return Boolean(network && TRANSIENT.has(network.code));
}

// One try-on edit. Retries once on a transient 500 or 503, or a connection
// that opened and then dropped; never on 429, which gets reported to the
// shopper with the wait Gemini asked for.
export async function generateTryOn(input) {
  try {
    return await callOnce(input);
  } catch (error) {
    if (isTransient(error)) {
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
