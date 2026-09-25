/*
  How pieces layer in the fitting room.

  Every product has a `slot`:
    outer   jackets, coats, blazers: worn over everything
    top     shirts, tees, knitwear, hoodies: replaces the current top
    bottom  trousers, jeans, skirts: replaces the current bottom
            (over a dress, a top or bottom is layered, not swapped)
    full    dresses: replaces both top and bottom

  The fitting room keeps a `chain`: the ordered list of pieces actually applied
  to the photo, one Gemini edit per piece. Each new piece is applied on top of
  the latest photo, so adding one costs one edit. `visiblePicks` derives what
  the shopper is wearing now: a later piece hides earlier pieces it replaces.
*/

export const MAX_CHAIN = 8;

const REPLACES = {
  outer: ["outer"],
  top: ["top"],
  bottom: ["bottom"],
  full: ["top", "bottom", "full"],
};

export function replaces(newSlot, oldSlot) {
  return (REPLACES[newSlot] ?? []).includes(oldSlot);
}

// chain: array of product ids; lookup: id -> product
export function visiblePicks(chain, lookup) {
  const worn = [];
  for (const id of chain) {
    const product = lookup(id);
    if (!product) continue;
    for (let i = worn.length - 1; i >= 0; i--) {
      if (worn[i].id === id || replaces(product.slot, worn[i].slot)) worn.splice(i, 1);
    }
    worn.push(product);
  }
  return worn;
}

// The piece(s) a new pick will take off, so the UI can say so.
export function displacedBy(product, worn) {
  return worn.filter((p) => p.id !== product.id && replaces(product.slot, p.slot));
}

export const SLOT_INSTRUCTIONS = {
  outer:
    "Put this piece on as the outer layer, over what they are wearing now. Keep everything underneath unchanged and visible where it naturally would be.",
  top: "Replace only the top they are wearing now (shirt, T-shirt or sweater) with this piece. If they wear a jacket or coat, keep it on over the new top.",
  bottom:
    "Replace only the trousers, jeans or skirt they are wearing now with this piece. Keep the top, any outer layer and the shoes unchanged.",
  full: "Replace both their current top and bottom with this dress. If they wear a jacket or coat, keep it on over the dress.",
};
