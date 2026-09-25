// A 429 from Gemini says which quota ran out.
// Bug it guards: every 429 showed "Gemini quota or rate limit reached" with a
// 39 second countdown, but the key had a free-tier limit of 0 for the image
// model, so waiting could never help. The fix reads Google's error body
// (QuotaFailure violations, "limit: N", RetryInfo). No browser or server needed.

import { describeQuota } from "../../app/_lib/tryon/quota-diagnosis.mjs";

// The shape the Gemini SDK puts in ApiError.message: the JSON body, stringified.
function body({ message, quotaId, metric, retryDelay }) {
  return JSON.stringify({
    error: {
      code: 429,
      message,
      status: "RESOURCE_EXHAUSTED",
      details: [
        {
          "@type": "type.googleapis.com/google.rpc.QuotaFailure",
          violations: [{ quotaMetric: metric, quotaId, quotaDimensions: { location: "global", model: "gemini-2.5-flash-image" } }],
        },
        { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay },
      ],
    },
  });
}

export default async function quotaDiagnosis({ ok }) {
  const freeZero = describeQuota(
    body({
      message:
        "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits.\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-2.5-flash-image\nPlease retry in 39.2s.",
      metric: "generativelanguage.googleapis.com/generate_content_free_tier_requests",
      quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
      retryDelay: "39s",
    }),
  );
  ok("a free-tier limit of 0 is recognised as 'no quota', not a wait", freeZero.zero && freeZero.freeTier);
  ok("Google's first sentence is kept for the dev note", freeZero.summary.startsWith("You exceeded your current quota"));

  const daily = describeQuota(
    body({
      message: "* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_paid_tier_requests, limit: 250, model: gemini-2.5-flash-image",
      metric: "generativelanguage.googleapis.com/generate_content_paid_tier_requests",
      quotaId: "GenerateRequestsPerDayPerProjectPerModel",
      retryDelay: "12s",
    }),
  );
  ok("a used-up daily quota is recognised as daily", daily.perDay && !daily.zero);

  const minute = describeQuota(
    body({
      message: "* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_paid_tier_requests, limit: 10, model: gemini-2.5-flash-image",
      metric: "generativelanguage.googleapis.com/generate_content_paid_tier_requests",
      quotaId: "GenerateRequestsPerMinutePerProjectPerModel",
      retryDelay: "12s",
    }),
  );
  ok("a per-minute limit keeps Google's wait", !minute.zero && !minute.perDay && minute.retryAfter === 12, `retryAfter ${minute.retryAfter}`);

  const plain = describeQuota("Too Many Requests");
  ok("a non-JSON 429 does not crash and is treated as a wait", !plain.zero && plain.retryAfter === null);
}
