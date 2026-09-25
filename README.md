# STORE: an AI virtual try-on storefront

A clothing store with a fitting room. Pick one of eight preset models (men and
women, four body types, a range of skin tones) or upload your own photo, then
tap the hanger on any piece, or drag its card onto the model. Gemini 2.5 Flash
Image returns a photo of the model wearing it. Add a jacket and it goes on
top; add new trousers and they replace the old ones; Start over clears the
look.

Built with Next.js 16 (App Router, JavaScript), Tailwind CSS v4 and dnd-kit.
The catalogue and models are local JSON files; there is no database in v1.

> The product and model images are placeholders drawn by
> `scripts/make-placeholders.mjs`. Swap in real photos with the same file
> names in `public/products/` and `public/models/`; no code changes needed.

## Quick start

```bash
npm install
cp .env.example .env.local
# put your key in .env.local (see below), or set TRYON_MOCK=1 to try the UI without one
npm run dev
```

Open http://localhost:3000.

## Getting a Gemini key (Google AI Studio)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey) and sign in
   with a Google account.
2. Click **Create API key**. Pick an existing Google Cloud project or let
   AI Studio create one.
3. Copy the key into `.env.local`:

   ```
   GEMINI_API_KEY=your-key-here
   ```

4. Restart `npm run dev`.

Creating a key is free. Whether image output is included in the free tier
changes from time to time: at the time of writing, image generation with
Gemini 2.5 Flash Image was billed per image (about 4 US cents each in 2025).
Check the current [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing).
If every try-on fails straight away with a 403 or a rate-limit message, the
key's project most likely needs billing enabled for image output.

The key is only ever read on the server, in `app/api/tryon/route.js`. It is
never sent to the browser. Do not rename it with a `NEXT_PUBLIC_` prefix.

## Environment variables

| Name | Required | What it does |
|---|---|---|
| `GEMINI_API_KEY` | yes, unless mock | Google AI Studio key, server only |
| `GEMINI_IMAGE_MODEL` | no | Defaults to `gemini-2.5-flash-image`. Change it if Google renames the model |
| `TRYON_MOCK` | no | `1` lays the garment over the photo locally instead of calling Gemini |
| `TRYON_RATE_LIMIT_PER_MIN` | no | Try-ons per minute per visitor IP, default 12 |
| `TRYON_CACHE_DIR` | no | Where generated photos are cached on disk, default the OS temp dir |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `npm run dev:mock` | Dev server, with real or mock try-on |
| `npm run build` then `npm run start` / `npm run start:mock` | Production build and server |
| `npm run check` | Playwright regression checks (catalogue, fitting room, overflow). Run against `start:mock` |
| `npm run lint` | ESLint |
| `npm run slop` | Fails on em or en dashes and filler copy anywhere in the repo |
| `npm run placeholders` | Regenerates missing placeholder images (`-- --force` to redraw all) |

## How the try-on works

The browser never calls Gemini. The fitting room sends one garment at a time
to `POST /api/tryon`, along with the base photo (a preset model id for the
first piece, then the previous result). The server loads the garment image
from `public/`, sends both images and a text instruction to Gemini, and
returns the new photo. Every result is cached by the exact base image and
garment, in memory and on disk, so the same combination is never generated
twice while the cache holds it. Rate limits come back as a friendly message
with a countdown before Retry.

`CLAUDE.md` has the full map of the code.

## Deploying to Vercel

1. Push the repo to GitHub and import it in Vercel (framework: Next.js).
2. Add `GEMINI_API_KEY` under Project Settings, Environment Variables.
3. Deploy.

The try-on route reads images from `public/` on disk; `next.config.mjs`
includes them in the function bundle. The disk cache lives in `/tmp` on
Vercel, which is per instance and short-lived, so treat it as a bonus.
