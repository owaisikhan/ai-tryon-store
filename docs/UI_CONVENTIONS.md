# UI conventions

The look comes from the reference recording: warm near-black surfaces, one
burnt-orange accent, rounded dark cards with garment cutouts, a pale studio
backdrop behind the model. Everything below is what the code does today; change
it here when the code changes.

## Colour tokens (app/_styles/globals.css)

| Token | Value | Use |
|---|---|---|
| `bg` | #111013 | page |
| `surface` | #19181c | cards, header, panels |
| `surface-2` / `surface-3` | #222126 / #2c2a31 | inputs, chips, hover, pressed |
| `border` / `border-soft` | #2e2c33 / #232127 | 1px card and control borders |
| `text` | #f3f1ee | primary text, 15.7:1 on surface |
| `muted` | #a8a3ab | secondary text, 7.1:1 on surface |
| `subtle` | #8a858e | counts and captions, 4.9:1 on surface |
| `placeholder` | #7d7882 | input placeholders, 3.7:1 on surface-2 (reads as empty) |
| `accent` | #e27a3c | fills: active hanger, primary buttons, slider, hover corner |
| `accent-hover` | #cf6a2e | pressed or hovered fill |
| `accent-text` | #f0955d | orange text on dark (sale price, Reset), 7.7:1 |
| `accent-soft` | #3a2519 | selected rows, Sale tag background |
| `on-accent` | #1a0f08 | icons and labels on an accent fill, 6.35:1 |
| `star` | #f5b73b | rating star |
| `danger` / `danger-soft` | #f28b82 / #3b1f1e | error text and background |
| `studio` | #e7e5e1 | backdrop behind model photos |

White on the accent is 2.96:1, below the 3:1 icons need, so anything on an
orange fill uses `on-accent` ink.

## Type

Plus Jakarta Sans throughout, via `next/font`. The wordmark is 600 weight with
0.42em tracking. Page title 24 to 28px bold; product name 13 to 14px medium in
`muted`, up to two lines with the height reserved so prices align; price 16px
bold `tabular-nums`, orange when on sale with the old price struck through and
a "Sale" tag.

## Components

- **Product card:** heart (save) and hanger (try on) stacked top left in 40px
  circles; rating pill top right; the image is the drag handle; bag button
  bottom right, with an orange quarter circle that grows from the corner on
  hover or keyboard focus. A card in the fitting room gets an accent border
  and an orange hanger.
- **Fitting room:** a 340px floating panel bottom left on desktop, a bottom
  sheet on phones (max 92dvh, scrolls inside). Collapsed, it is a "Try it on"
  pill showing the current look and the number of picks. The stage is 3:4 and
  capped at 46dvh tall so it fits a 768px laptop screen.
- **Loading:** the stage dims the last photo, and a spinner with "Dressing your
  model / The photo is being made for you. It takes a moment." sits over it,
  with "Piece 2 of 3" when several are queued. The pick being made shows a
  spinner on its thumbnail.
- **Errors stay where they happened:** a card at the bottom of the stage with
  the message and Retry. A rate limit disables Retry and counts down. In
  development a "Dev note" line shows the server's hint.
- **Toasts** (one feed, top centre) confirm actions that happen elsewhere:
  added to bag, a piece swapped out, an upload problem.
- **Drawers** (filters on phones, bag) are native `<dialog>` sheets; the page
  behind is locked.

## Motion

- **Send to the fitting room** (`app/_lib/fitting-room/fly-to-room.js`): a tap
  on a product image or its hanger opens the room, then a copy of the image
  lifts out of the card, tilts, arcs to the model's chest while shrinking to
  about half size, and fades as it lands (760ms, Web Animations API). The
  piece is added on landing, so the tray thumbnail pops in (`animate-pop-in`)
  and "Dressing your model" starts right after, as in the reference
  recording. The photo gives a short orange ring pulse. A drag and drop needs
  no flight. With reduced motion, nothing flies; the piece goes on at once.

## Interaction rules

- Every tap target is at least 44px.
- Mouse drags start after 8px of movement; touch drags after a 220ms press,
  so the grid still scrolls.
- Filters live in the URL. Discrete choices add a history entry; search typing
  and price dragging replace the current one.
- Motion respects `prefers-reduced-motion`.
- No em or en dashes in any copy.
