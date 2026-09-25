# kodexa-builder learnings

This file is how this repo teaches the kodexa-builder skill. Every session
that loads the skill reads it first and appends to it as the user corrects,
reverses or chooses things. Entries promoted into the skill are marked with
the version they landed in. See the skill's `references/self-improvement.md`
for the rules.

- **Project:** ai-tryon-store (AI virtual try-on storefront)
- **Type:** ecommerce (with an AI image-editing feature)
- **Who reads it daily:** shoppers on a phone or laptop, arriving from a link
- **Palette exceptions:** dark; the brief asks for a dark theme matching the reference recording
- **Skill version when started:** 1.3.0

## Summary

| ID | Date | Kind | Lesson (short) | Scope | Status |
|---|---|---|---|---|---|
| L-001 | 2026-09-25 | rule | Start every repo on `main`; branch from it afterwards | all | ready |
| L-002 | 2026-09-25 | gotcha | Treat a missing query param as missing before `Number()`; guard with a full-catalogue check | type: ecommerce | logged |
| L-003 | 2026-09-25 | gap | No playbook for AI image features (try-on): server route, per-step chaining, result cache, mock mode | type: ecommerce | logged |
| L-004 | 2026-09-25 | gotcha | Read `error.cause` on "fetch failed" and ship `npm run doctor` for any external API | all | ready |
| L-005 | 2026-09-25 | gotcha | A 429 is not always "wait": read the quota body; `limit: 0` means billing, not a countdown | all | ready |

## Entries

### L-001 · 2026-09-25 · strong · rule
- **Said / saw:** "always start with main branch" (said twice, while the session was set to a `claude/...` branch in an empty repo)
- **Context:** ai-tryon-store, first scaffold in a brand-new repo with no commits
- **Lesson:** A new repo starts on `main`: the scaffold is the first commit on `main`, and feature or experiment branches are cut from `main` afterwards. This matches "main stays deployable" and gives every later branch a real base to diff and merge against.
- **Scope:** all
- **Target in skill:** SKILL.md section 3, "Working style the user has shown repeatedly"
- **Status:** ready

### L-002 · 2026-09-25 · medium · gotcha
- **Said / saw:** app/_lib/filters.js `clampNumber`: `Number(null)` is 0, so a missing `?max` clamped to the lowest price and the home page rendered "0 products"; build and lint passed. Caught by the first screenshot.
- **Context:** URL-backed filter state (min and max price) in a storefront
- **Lesson:** When parsing query params, treat `null` and `""` as missing before calling `Number()`, because `Number(null)` and `Number("")` are 0, not NaN. Every store ships a check that the unfiltered home page lists the whole catalogue.
- **Scope:** type: ecommerce (any URL-backed filters)
- **Target in skill:** references/types/ecommerce.md, section 2 "Filters"
- **Status:** logged

### L-003 · 2026-09-25 · low · gap
- **Said / saw:** the brief asked for a Gemini image-editing try-on; the ecommerce and chatbot playbooks cover text AI only
- **Context:** app/_lib/tryon/, app/_lib/fitting-room/use-try-on.js, app/api/tryon/route.js
- **Lesson:** For an AI image feature: call the model only from a server route with the key in env; send one edit per request and chain results client-side (progress, short requests, cache hits per step); cache by a hash of the exact input bytes, holding in-flight promises so duplicates share one call; map 429s to a countdown; ship a mock mode so UI work and checks never spend quota.
- **Scope:** type: ecommerce (and any AI image feature)
- **Target in skill:** new references/types/ai-image.md, or a section in ai-chatbot.md
- **Status:** logged

### L-004 · 2026-09-25 · medium · gotcha
- **Said / saw:** user screenshot of the fitting room: "Dev note: network: fetch failed" and a "?"; the route and SDK worked from the cloud session, so the cause was the user's local network, which the message did not name
- **Context:** app/_lib/tryon/gemini.js translateError; fixed with app/_lib/tryon/network-diagnosis.mjs and scripts/tryon-doctor.mjs
- **Lesson:** Node's fetch reports every network failure as "TypeError: fetch failed" and keeps the reason in `error.cause.code` (ENOTFOUND, ECONNREFUSED, a TLS code, or an AggregateError of them). Any server code calling an external API translates that cause into plain advice (DNS, blocked connection, intercepted certificate, proxy ignored without NODE_USE_ENV_PROXY=1), and the repo ships an `npm run doctor` that checks the key, DNS, HTTPS reach and key access without spending quota. The doctor must also send the app's real request shape (same SDK, same method, a payload of realistic size) through a free endpoint such as countTokens: a GET-only doctor reported "All good" on the machine where the try-on had failed, which leaves the user with no answer. Dev hints are split into a one-line cause and a collapsible fix so they never cover the UI they explain.
- **Scope:** all (any app that calls an external API from the server)
- **Target in skill:** references/types/ai-chatbot.md (error handling) and SKILL.md section 5 ("How done is proven")
- **Status:** ready

### L-005 · 2026-09-25 · medium · gotcha
- **Said / saw:** user screenshot, "still the same issue, is the gemini call happening?": the panel showed "busy, Try again in 39s" and "Gemini quota or rate limit reached (HTTP 429)" while no try-on had ever succeeded on that key
- **Context:** app/_lib/tryon/gemini.js mapped every 429 to a countdown; fixed with app/_lib/tryon/quota-diagnosis.mjs
- **Lesson:** Metered AI APIs send HTTP 429 for three different things: a quota of zero (the free tier often has no image output), a used-up daily quota, and a per-minute rate limit. Only the last one is fixed by waiting. Read the error body (Google: QuotaFailure violations, "limit: N", RetryInfo) and show a countdown only for the per-minute case; for a zero quota say plainly that billing is needed. A free "doctor" cannot see generation quota, so it must say so rather than print "All good".
- **Scope:** all (any app that calls a metered AI API)
- **Target in skill:** references/types/ai-chatbot.md (error handling), with L-004
- **Status:** ready
