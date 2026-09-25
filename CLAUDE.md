# AI Try-On Store

A dark-themed clothing store ("STORE") with an AI fitting room: the shopper
picks a preset model or uploads a photo, taps the hanger on a product (or
drags the card onto the model), and Gemini 2.5 Flash Image returns a photo of
the model wearing it. Pieces layer: a jacket goes over a shirt, a new pair of
trousers replaces the old one. Visual reference: a 10 second screen recording
of a "STORE" Next.js template (dark UI, burnt-orange accent, floating
"Fitting room" panel bottom left).

Built with the kodexa-builder skill (v1.3.0). Load it for any new feature or
design work, and log preferences, corrections and reversals to
`.claude/kodexa-learnings.md` as they happen.

Palette exceptions: dark; the brief asks for a dark theme matching the reference recording

## Decisions already made (do not ask again)

- **Branching:** always start from `main`. The first commit went on `main`;
  feature or experiment branches are cut from `main`.
- **Stack:** Next.js 16 App Router, plain JavaScript, Tailwind v4, local JSON
  for data (no database in v1), dnd-kit for drag and drop, Vercel.
- **Images:** placeholders for now. `scripts/make-placeholders.mjs` draws
  every product and model as SVG and rasterises to WebP. Real photos replace
  them file for file (same names), no code change.
- **API key:** server env only (`GEMINI_API_KEY`). The reference's "Your API
  key" button was deliberately left out; there is no visitor-supplied key.
- **Theme:** dark only, from the brief. No light mode or theme toggle in v1.
- **No em or en dashes anywhere** (UI copy, comments, docs, data). Run
  `npm run slop` before committing. `AGENTS.md` holds a block Next writes and
  rewrites on `next dev`; it contains Next's own dashes and the scanner skips it.

## Run it

```bash
npm install
cp .env.example .env.local        # add GEMINI_API_KEY, or set TRYON_MOCK=1
npm run dev                       # http://localhost:3000
npm run dev:mock                  # same, but try-on is composited locally, no Gemini
npm run doctor                    # free check: key, DNS, HTTPS, key + model, photo upload via the SDK
```

Checks (Playwright, against a production build in mock mode):

```bash
npm run build && npm run start:mock    # terminal 1
npm run check                          # terminal 2 (add -- --base http://localhost:3100 for another port)
npm run lint && npm run slop
```

`npm run check` refuses to run the fitting-room check unless the server is in
mock mode, so a check never spends Gemini quota or sends a photo anywhere.

## Structure

```
app/
  layout.js  page.js  error.js  not-found.js  icon.svg
  page.js                    home: hero + storefront (rendered per request so shared filter URLs SSR)
  api/tryon/route.js         POST try-on, GET status. The ONLY place Gemini is reached from.
  _components/
    layout/                  Header, HeaderActions, MobileMenu, HeroBanner, Footer, Providers
    shop/                    Storefront, ProductCard, FiltersPanel and one file per filter, SortMenu
    fitting-room/            FittingRoom (panel), Launcher (pill), ModelStage, ModelPicker,
                             PicksTray, TryOnError, ZoomDialog, DragLayer (dnd-kit context)
    cart/CartDrawer.js       minimal bag (no checkout in v1)
    ui/                      Drawer (<dialog>), Spinner, Toaster, Price, RatingPill, HangerIcon
  _data/products.json        the catalogue (24 pieces: men, women, unisex)
  _lib/
    catalog.js               read products and models, categories, price bounds
    filters.js               URL <-> filter state, apply, sort, gender lift (pure)
    use-filters.js           the URL-backed filter hook (History API, no server round trip)
    garment-slots.js         layering rules shared by client and server
    format-helpers.js  siteConfig.js
    stores/                  cart, wishlist, toast (useSyncExternalStore + localStorage)
    fitting-room/            client: provider, use-try-on hook, fetch wrapper, upload resize
    tryon/                   server-only: config, service, gemini, prompt, cache, images, mock,
                             rate-limit, errors; network-diagnosis.mjs is pure and shared with
                             the doctor script (.mjs so plain Node imports it without warnings)
  _styles/globals.css        @theme tokens (by role), base rules, range slider
public/
  models/models.json         preset models: id, name, gender, bodyType, skinTone, image
  models/*.webp  products/*.webp   placeholder images (see Decisions)
scripts/
  make-placeholders.mjs      regenerates placeholder images (--force to overwrite)
  tryon-doctor.mjs           npm run doctor (reads .env.local via @next/env)
  slop_scan.py               dash and AI-slop scanner (copied from kodexa-builder)
  checks/                    npm run check: catalogue, fitting-room, network-diagnosis, overflow
docs/                        UI_CONVENTIONS.md, CHANGELOG.md
```

## Where the try-on logic lives

```
ProductCard hanger / DragLayer drop
  -> FittingRoomProvider.addPiece        chain = [...chain, productId] (persisted)
  -> useTryOn (app/_lib/fitting-room/use-try-on.js)
       finds the longest prefix of the chain it already has a photo for,
       requests exactly the next garment, repeats until the chain is done
  -> POST /api/tryon { base, garmentIds: [one id] }
       base = { type: "preset", id } for the first piece,
              { type: "image", image: <previous result> } after that
  -> app/_lib/tryon/service.js
       rate limit -> resolve base + garment from disk -> cache lookup
       -> gemini.js (or mock.js when TRYON_MOCK=1) -> WebP data URL back
```

Key ideas:

- **The chain.** `chain` is the ordered list of pieces actually applied to the
  photo, one Gemini edit each. `visiblePicks(chain)` (garment-slots.js) is what
  the shopper is wearing: a later piece hides an earlier one it replaces
  (top replaces top, bottom replaces bottom, a dress replaces both, outer
  replaces outer). Adding costs one edit. Removing rebuilds the chain from what
  is visible, which often equals a cached prefix and shows instantly.
- **Caching, three layers.** Client: `results` in useTryOn, keyed
  `modelKey|id1,id2`. Server memory: keyed by hash of (engine, base image
  bytes, garment id, garment image bytes, note), holding in-flight promises so
  concurrent identical requests share one Gemini call. Server disk: same key,
  in the OS temp dir or `TRYON_CACHE_DIR`. Because the client chains the exact
  bytes the server returned, any combination any visitor made is reused.
- **Errors.** Everything the route refuses is a `TryOnError(status, code,
  message, { retryAfter, hint, advice })`. `message` is shopper-facing; `hint`
  (one line: what failed) and `advice` (how to fix it) are sent only in
  development and shown in the panel as "Dev note" plus a collapsible "How to
  fix". A network failure (Node's bare "fetch failed") is translated by
  `network-diagnosis.mjs` from `error.cause.code` into DNS, blocked
  connection or intercepted certificate, code `unreachable`. Gemini 429 becomes
  a 429 with `retryAfter` from Gemini's `retryDelay`, and the panel counts down
  before Retry comes back. Our own per-IP limit (12/min) returns the same shape.
- **Prompt.** `tryon/prompt.js`: identity and scene locked first, then the
  slot instruction from `garment-slots.js`, then fidelity to the product image.
- **Vercel.** The route reads images from `public/` with `fs`, so
  `next.config.mjs` adds them to the route's file trace. `maxDuration = 60`;
  each request is one edit, so it stays well inside that.

## Conventions

- Tokens by role in `globals.css` (`bg`, `surface`, `surface-2`, `text`,
  `muted`, `subtle`, `accent`, `accent-text`, `on-accent`, `studio`). Icons on
  an accent fill use `text-on-accent` (dark ink); white on the orange is only
  2.96:1. Ratios are in `docs/UI_CONVENTIONS.md`.
- Filter and sort state lives in the URL; discrete choices push history,
  typing and slider drags replace it.
- Client stores use `useSyncExternalStore` with an empty server snapshot (no
  hydration mismatch) and a localStorage mirror.
- Every tap target is at least 44px (the picks tray's small x has an enlarged
  hit area).
- One check per bug in `scripts/checks/`, each proven once by reintroducing
  its bug.

## Not in v1 (candidates for next)

Real product and model photography (or a Gemini generation script), product
detail pages, checkout, light theme and the header's language switch from the
reference, per-visitor saved looks, and a persistent result cache (Vercel Blob
or KV) so results survive across serverless instances.

@AGENTS.md
