# Changelog

## 0.1.1 (2026-09-25)

- Fixed: a try-on that could not reach Google showed only "Dev note:
  network: fetch failed". Node's fetch hides the reason in `error.cause`; the
  route now reads it (`app/_lib/tryon/network-diagnosis.mjs`) and says whether
  DNS, a blocked connection or an intercepted certificate is to blame, with a
  collapsible "How to fix". Shopper message: "The fitting room cannot reach
  the try-on service right now."
- Fixed: a long dev note pushed the error card past the top of the photo and
  clipped the message. The card now fits the photo and scrolls inside.
- Added `npm run doctor`: checks key, DNS, HTTPS to Google and key plus model
  access without generating an image.
- Added optional `GEMINI_BASE_URL` for a gateway; one quiet retry when a
  connection drops mid-request; Next's dev button moved to the bottom right,
  away from the fitting room.
- Check added: `network-diagnosis`, proven by reintroducing the bug.

## 0.1.0 (2026-09-25)

First build, on `main`.

- Storefront: dark "STORE" layout matching the reference recording; hero; 24
  products (men, women, unisex) across 9 categories; cards with save, try on,
  rating, sale price and add to bag; filters for gender, category, price
  range, rating, on sale and saved; search; sort. Filter state lives in the URL.
- Fitting room: 8 preset models (both genders, four body types, a range of
  skin tones) plus upload your own photo; hanger or drag and drop to try on;
  layering with one-per-slot swaps; picks tray; zoom; Start over.
- Try-on: `POST /api/tryon` calls Gemini 2.5 Flash Image server-side, one
  garment per request, with a memory and disk cache keyed by the exact base
  image and garment, a per-IP rate limit, and a mock mode for building without
  a key.
- Placeholder product and model images drawn by `scripts/make-placeholders.mjs`.
- Checks: `npm run check` (catalogue, fitting room, overflow), `npm run slop`.

### Decisions and reversals

- The reference's "Your API key" button was left out: the key is server-side
  only, by choice.
- Images are placeholders for now, by choice; real photos drop in by file name.
- Fixed before commit: a missing `?max` param parsed as `Number(null) = 0`
  and emptied the grid. The catalogue check now guards it.
