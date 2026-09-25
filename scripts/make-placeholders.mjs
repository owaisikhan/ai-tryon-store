// Draws placeholder product cutouts and model photos as SVG and rasterises
// them to WebP with sharp. Raster output matters: Gemini does not accept SVG,
// so the try-on route treats these exactly as it will treat real photos.
//
// Usage: node scripts/make-placeholders.mjs            (writes missing files)
//        node scripts/make-placeholders.mjs --force    (rewrites everything)
//
// To use real photos instead, drop same-named .webp files into
// public/products/ and public/models/ and never run this again.

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const force = process.argv.includes("--force");

const products = JSON.parse(readFileSync(path.join(root, "app/_data/products.json"), "utf8"));
const models = JSON.parse(readFileSync(path.join(root, "public/models/models.json"), "utf8"));

// ---------------------------------------------------------------- colour

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function rgbToHex(rgb) {
  return "#" + rgb.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("");
}
// amount > 0 lightens toward white, < 0 darkens toward black.
function shade(hex, amount) {
  const rgb = hexToRgb(hex);
  const target = amount > 0 ? 255 : 0;
  return rgbToHex(rgb.map((c) => c + (target - c) * Math.abs(amount)));
}

// ---------------------------------------------------------------- garments

function fabricDefs(id, color) {
  return `
    <defs>
      <linearGradient id="f-${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${shade(color, 0.14)}"/>
        <stop offset="0.55" stop-color="${color}"/>
        <stop offset="1" stop-color="${shade(color, -0.22)}"/>
      </linearGradient>
      <filter id="soft-${id}" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="7"/>
      </filter>
    </defs>`;
}

// Outline plus a faint rim so dark garments still separate from a dark card.
function body(id, d, color) {
  return `<path d="${d}" fill="url(#f-${id})" stroke="${shade(color, 0.3)}" stroke-opacity="0.35" stroke-width="1.6" stroke-linejoin="round"/>`;
}
function detail(d, color, { width = 2, opacity = 0.55, dash = "" } = {}) {
  return `<path d="${d}" fill="none" stroke="${shade(color, -0.4)}" stroke-opacity="${opacity}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
}
function fillShape(d, fill, opacity = 1) {
  return `<path d="${d}" fill="${fill}" fill-opacity="${opacity}"/>`;
}
function dots(points, color, r = 3.2) {
  return points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${shade(color, -0.45)}" fill-opacity="0.8"/>`).join("");
}
function shadow(id, y = 378, rx = 120) {
  return `<ellipse cx="200" cy="${y}" rx="${rx}" ry="10" fill="#000" fill-opacity="0.45" filter="url(#soft-${id})"/>`;
}

// Silhouettes on a 400 x 400 canvas, centred on x = 200.
const SHAPES = {
  tee: "M150 92 Q200 112 250 92 L300 108 L338 160 L302 184 L286 166 L288 322 Q200 332 112 322 L114 166 L98 184 L62 160 L100 108 Z",
  longTop: "M150 92 Q200 112 250 92 L300 106 Q326 118 332 150 L350 300 L316 306 L294 184 L290 324 Q200 334 110 324 L106 184 L84 306 L50 300 L68 150 Q74 118 100 106 Z",
  jacket: "M152 84 Q200 100 248 84 L304 100 Q330 112 336 146 L352 318 L316 324 L296 190 L296 338 Q200 346 104 338 L104 190 L84 324 L48 318 L64 146 Q70 112 96 100 Z",
  cropJacket: "M152 96 Q200 112 248 96 L304 112 Q332 124 338 160 L352 306 L316 312 L298 196 L298 290 Q200 300 102 290 L102 196 L84 312 L48 306 L62 160 Q68 124 96 112 Z",
  coat: "M158 46 Q200 60 242 46 L292 60 Q318 72 322 104 L340 300 L306 306 L290 150 L304 372 Q200 382 96 372 L110 150 L94 306 L60 300 L78 104 Q82 72 108 60 Z",
  trousers: "M140 50 L260 50 L268 86 L284 370 L220 370 L202 150 L198 150 L180 370 L116 370 L132 86 Z",
  wideTrousers: "M146 50 L254 50 L262 90 L306 370 L214 370 L201 160 L199 160 L186 370 L94 370 L138 90 Z",
  midiSkirt: "M154 70 L246 70 L250 94 L306 352 Q200 366 94 352 L150 94 Z",
  shortSkirt: "M150 104 L250 104 L254 126 L292 286 Q200 298 108 286 L146 126 Z",
  slipDress: "M168 58 L176 58 L184 120 Q200 128 216 120 L224 58 L232 58 L240 128 Q248 150 244 176 Q256 236 300 372 Q200 386 100 372 Q144 236 156 176 Q152 150 160 128 Z",
  wrapDress: "M156 52 Q200 66 244 52 L290 66 Q312 78 316 108 L334 262 L304 268 L286 140 L270 196 Q300 290 314 374 Q200 388 86 374 Q100 290 130 196 L114 140 L96 268 L66 262 L84 108 Q88 78 110 66 Z",
};

const GARMENTS = {
  "camel-wool-overcoat": { shape: "coat", color: "#b27434", draw: coatDetails({ double: true }) },
  "camel-belted-trench": { shape: "coat", color: "#c08845", draw: coatDetails({ belt: true, double: true }) },
  "army-green-puffer": { shape: "jacket", color: "#4e5838", draw: pufferDetails(100, 336) },
  "oat-cropped-puffer": { shape: "cropJacket", color: "#cbb99a", draw: pufferDetails(112, 290) },
  "indigo-denim-trucker": { shape: "jacket", color: "#3d5d86", draw: truckerDetails },
  "olive-bomber": { shape: "jacket", color: "#5a6040", draw: bomberDetails },
  "dark-brown-biker": { shape: "jacket", color: "#46302a", draw: bikerDetails },
  "stone-linen-blazer": { shape: "jacket", color: "#c7b89c", draw: blazerDetails },
  "black-tailored-blazer": { shape: "jacket", color: "#2a292e", draw: blazerDetails },
  "white-oxford-shirt": { shape: "longTop", color: "#eeeeea", draw: shirtDetails },
  "sky-poplin-shirt": { shape: "longTop", color: "#a9c4e2", draw: shirtDetails },
  "navy-merino-crew": { shape: "longTop", color: "#2d3a58", draw: knitDetails(false) },
  "cream-cable-knit": { shape: "longTop", color: "#e6dcc6", draw: knitDetails(true) },
  "grey-marl-hoodie": { shape: "longTop", color: "#8f8e8c", draw: hoodieDetails(false) },
  "forest-zip-hoodie": { shape: "longTop", color: "#2f5a43", draw: hoodieDetails(true) },
  "black-heavyweight-tee": { shape: "tee", color: "#2b2a2e", draw: teeDetails },
  "white-ribbed-tee": { shape: "tee", color: "#f1f0ec", draw: teeDetails },
  "charcoal-wool-trousers": { shape: "trousers", color: "#4a4a4f", draw: trouserDetails(false) },
  "raw-selvedge-jeans": { shape: "trousers", color: "#27365a", draw: trouserDetails(true) },
  "ivory-wide-leg-trousers": { shape: "wideTrousers", color: "#ebe4d4", draw: trouserDetails(false) },
  "sage-pleated-skirt": { shape: "midiSkirt", color: "#8fa58a", draw: pleatDetails },
  "mid-blue-denim-skirt": { shape: "shortSkirt", color: "#5f86b8", draw: denimSkirtDetails },
  "rust-slip-dress": { shape: "slipDress", color: "#b5542a", draw: slipDetails },
  "black-wrap-dress": { shape: "wrapDress", color: "#262428", draw: wrapDetails },
};

function neckOpening(c) {
  return fillShape("M150 92 Q200 72 250 92 Q200 114 150 92 Z", shade(c, -0.35));
}

function teeDetails(c) {
  return neckOpening(c) + detail("M150 92 Q200 118 250 92", c, { width: 3, opacity: 0.4 }) + detail("M114 166 L112 322 M286 166 L288 322", c, { opacity: 0.25 });
}

function shirtDetails(c) {
  return (
    fillShape("M162 88 Q200 104 238 88 L230 80 Q200 92 170 80 Z", shade(c, -0.25)) +
    fillShape("M170 80 L200 112 L184 126 L156 92 Z", shade(c, 0.05)) +
    fillShape("M230 80 L200 112 L216 126 L244 92 Z", shade(c, 0.05)) +
    detail("M170 80 L200 112 L184 126 L156 92 M230 80 L200 112 L216 126 L244 92", c, { opacity: 0.45 }) +
    detail("M200 112 L200 328", c, { opacity: 0.5 }) +
    dots([[208, 140], [208, 180], [208, 220], [208, 260], [208, 300]], c) +
    detail("M58 282 L88 288 M342 282 L312 288", c, { width: 2.4, opacity: 0.45 }) +
    detail("M150 150 L180 150 L180 176 L150 176 Z", c, { opacity: 0.35 })
  );
}

function knitDetails(cable) {
  return (c) => {
    let out = neckOpening(c) + detail("M146 92 Q200 124 254 92", c, { width: 7, opacity: 0.3 });
    // Ribbed hem and cuffs.
    for (let x = 116; x <= 284; x += 7) out += detail(`M${x} 304 L${x} 326`, c, { width: 1.4, opacity: 0.3 });
    out += detail("M58 280 L86 286 M342 280 L314 286", c, { width: 8, opacity: 0.25 });
    if (cable) {
      for (const x of [150, 200, 250]) {
        let d = `M${x} 130`;
        for (let y = 130; y < 296; y += 24) d += ` q10 12 0 24`;
        out += detail(d, c, { width: 5, opacity: 0.3 });
        let d2 = `M${x} 130`;
        for (let y = 130; y < 296; y += 24) d2 += ` q-10 12 0 24`;
        out += detail(d2, c, { width: 5, opacity: 0.3 });
      }
    }
    return out;
  };
}

function hoodieDetails(zip) {
  return (c) =>
    fillShape("M150 94 Q146 50 200 44 Q254 50 250 94 Q200 120 150 94 Z", shade(c, -0.08)) +
    fillShape("M166 94 Q166 64 200 60 Q234 64 234 94 Q200 110 166 94 Z", shade(c, -0.4)) +
    detail("M150 94 Q146 50 200 44 Q254 50 250 94", c, { opacity: 0.35 }) +
    (zip
      ? detail("M200 106 L200 326", c, { width: 3, opacity: 0.6 }) + detail("M168 232 L180 290 M232 232 L220 290", c, { opacity: 0.4 })
      : detail("M150 240 L250 240 L266 300 L134 300 Z", c, { opacity: 0.4 })) +
    detail("M188 104 L186 150 M212 104 L214 150", c, { width: 2.4, opacity: 0.55 }) +
    detail("M58 282 L86 288 M342 282 L314 288 M112 312 L288 312", c, { width: 6, opacity: 0.22 });
}

function coatDetails({ belt = false, double = false } = {}) {
  return (c) => {
    let out =
      fillShape("M158 46 Q200 60 242 46 L222 150 L200 170 L178 150 Z", shade(c, -0.45)) +
      fillShape("M158 46 L178 150 L200 170 L168 176 L140 92 Z", shade(c, 0.08)) +
      fillShape("M242 46 L222 150 L200 170 L232 176 L260 92 Z", shade(c, 0.02)) +
      detail("M158 46 L140 92 L168 176 L200 170 M242 46 L260 92 L232 176 L200 170", c, { opacity: 0.45 }) +
      detail("M200 170 L204 374", c, { opacity: 0.45 }) +
      detail("M122 262 L150 262 M250 262 L278 262", c, { width: 2.4, opacity: 0.4 }) +
      detail("M62 286 L92 292 M338 286 L308 292", c, { width: 3, opacity: 0.4 });
    if (double) out += dots([[184, 206], [220, 206], [184, 246], [220, 246]], c, 4);
    if (belt) {
      out +=
        fillShape("M110 214 Q200 226 290 214 L292 236 Q200 248 108 236 Z", shade(c, -0.12)) +
        detail("M110 214 Q200 226 290 214 M108 236 Q200 248 292 236", c, { opacity: 0.45 }) +
        `<rect x="186" y="215" width="28" height="26" rx="3" fill="none" stroke="${shade(c, -0.5)}" stroke-width="3" stroke-opacity="0.7"/>` +
        fillShape("M210 238 L232 300 L222 304 L204 240 Z", shade(c, -0.1)) +
        fillShape("M218 236 L252 292 L244 298 L212 240 Z", shade(c, -0.05));
    }
    return out;
  };
}

function pufferDetails(top, bottom) {
  return (c) => {
    let out = fillShape(`M160 ${top - 18} Q200 ${top - 4} 240 ${top - 18} L244 ${top + 8} Q200 ${top + 22} 156 ${top + 8} Z`, shade(c, -0.06));
    out += detail(`M160 ${top - 18} Q200 ${top - 4} 240 ${top - 18} L244 ${top + 8} Q200 ${top + 22} 156 ${top + 8} Z`, c, { opacity: 0.4 });
    for (let y = top + 34; y < bottom - 6; y += 30) out += detail(`M104 ${y} Q200 ${y + 10} 296 ${y}`, c, { width: 2.6, opacity: 0.45 });
    for (let y = top + 50; y < bottom - 20; y += 30) {
      out += detail(`M72 ${y} L98 ${y + 4} M328 ${y} L302 ${y + 4}`, c, { width: 2.2, opacity: 0.4 });
    }
    out += detail(`M200 ${top + 14} L200 ${bottom + 2}`, c, { width: 3, opacity: 0.6 });
    return out;
  };
}

function truckerDetails(c) {
  return (
    fillShape("M152 84 L200 124 L180 138 L136 96 Z", shade(c, 0.06)) +
    fillShape("M248 84 L200 124 L220 138 L264 96 Z", shade(c, 0.02)) +
    detail("M152 84 L136 96 L180 138 L200 124 L220 138 L264 96 L248 84", c, { opacity: 0.5 }) +
    detail("M200 124 L200 342", c, { opacity: 0.5 }) +
    dots([[210, 150], [210, 196], [210, 242], [210, 288]], c, 3.6) +
    detail("M104 176 Q150 164 196 172 M204 172 Q250 164 296 176", c, { width: 2, opacity: 0.4, dash: "5 4" }) +
    detail("M134 186 L176 186 L176 222 L155 230 L134 222 Z M224 186 L266 186 L266 222 L245 230 L224 222 Z", c, { opacity: 0.45 }) +
    detail("M104 306 L296 306", c, { width: 2, opacity: 0.4, dash: "5 4" })
  );
}

function bomberDetails(c) {
  const rib = shade(c, -0.18);
  return (
    fillShape("M156 84 Q200 104 244 84 L240 104 Q200 120 160 104 Z", "#d9722f") +
    fillShape("M152 84 Q200 100 248 84 L250 96 Q200 114 150 96 Z", rib) +
    fillShape("M104 318 L296 318 L296 338 Q200 346 104 338 Z", rib) +
    fillShape("M48 318 L52 298 L88 302 L84 324 Z M352 318 L348 298 L312 302 L316 324 Z", rib) +
    detail("M200 102 L200 340", c, { width: 3, opacity: 0.65 }) +
    detail("M130 250 L150 300 M270 250 L250 300", c, { width: 2.4, opacity: 0.45 })
  );
}

function bikerDetails(c) {
  return (
    fillShape("M152 84 L126 104 L170 190 L204 150 Z", shade(c, 0.12)) +
    fillShape("M248 84 L268 108 L236 150 L214 128 Z", shade(c, 0.1)) +
    detail("M152 84 L126 104 L170 190 L204 150 M248 84 L268 108 L236 150", c, { opacity: 0.6 }) +
    detail("M214 128 Q230 220 222 340", c, { width: 3, opacity: 0.8 }) +
    detail("M118 262 L158 250 M242 250 L282 262", c, { width: 2.4, opacity: 0.6 }) +
    detail("M104 318 L296 318", c, { width: 2.4, opacity: 0.5 }) +
    dots([[128, 318], [272, 318]], c, 4)
  );
}

function blazerDetails(c) {
  return (
    fillShape("M152 84 Q200 98 248 84 L218 214 L200 226 L182 214 Z", "#1c1b1f") +
    fillShape("M152 84 L182 214 L176 226 L128 110 L146 118 L136 94 Z", shade(c, 0.08)) +
    fillShape("M248 84 L218 214 L224 226 L272 110 L254 118 L264 94 Z", shade(c, 0.03)) +
    detail("M152 84 L136 94 L146 118 L128 110 L176 226 L200 226 M248 84 L264 94 L254 118 L272 110 L224 226 L200 226", c, { opacity: 0.55 }) +
    detail("M200 226 L200 342", c, { opacity: 0.45 }) +
    dots([[208, 250], [208, 290]], c, 4) +
    detail("M122 284 L166 284 M234 284 L278 284 M232 168 L266 164", c, { width: 2.4, opacity: 0.45 })
  );
}

function trouserDetails(jeans) {
  return (c) => {
    let out =
      fillShape("M140 50 L260 50 L262 66 L138 66 Z", shade(c, -0.1)) +
      detail("M138 66 L262 66 M200 66 L200 150", c, { opacity: 0.45 }) +
      detail("M166 90 L150 360 M234 90 L250 360", c, { width: 1.6, opacity: 0.35 });
    if (jeans) {
      out +=
        `<path d="M142 72 Q164 102 174 76 M258 72 Q236 102 226 76 M200 70 L200 150" fill="none" stroke="#d98a3d" stroke-width="1.8" stroke-dasharray="4 3" stroke-opacity="0.75"/>` +
        dots([[200, 58]], c, 3.4);
    }
    return out;
  };
}

function pleatDetails(c) {
  let out = fillShape("M154 70 L246 70 L250 94 L150 94 Z", shade(c, -0.1));
  for (let i = -4; i <= 4; i++) {
    const x1 = 200 + i * 11;
    const x2 = 200 + i * 24;
    out += detail(`M${x1} 96 L${x2} 354`, c, { width: 1.8, opacity: 0.35 });
  }
  return out;
}

function denimSkirtDetails(c) {
  return (
    fillShape("M150 104 L250 104 L254 126 L146 126 Z", shade(c, -0.12)) +
    `<path d="M200 126 L200 292 M148 128 L110 284 M252 128 L290 284" fill="none" stroke="#d98a3d" stroke-width="1.8" stroke-dasharray="4 3" stroke-opacity="0.7"/>` +
    dots([[206, 150], [206, 190], [206, 230], [206, 115]], c, 3.4)
  );
}

function slipDetails(c) {
  return (
    detail("M184 120 Q200 132 216 120", c, { width: 2, opacity: 0.4 }) +
    detail("M160 176 Q200 186 240 176", c, { width: 1.6, opacity: 0.3 }) +
    detail("M178 200 Q170 300 150 370 M222 200 Q234 300 256 372", c, { width: 1.6, opacity: 0.25 })
  );
}

function wrapDetails(c) {
  return (
    fillShape("M156 52 Q200 66 244 52 L204 176 L196 176 Z", shade(c, -0.5)) +
    detail("M156 52 L204 176 M244 52 L200 196 Q226 250 244 374", c, { opacity: 0.6 }) +
    fillShape("M130 196 Q200 208 270 196 L272 212 Q200 224 128 212 Z", shade(c, 0.1)) +
    fillShape("M252 208 L286 270 L276 276 L244 214 Z M260 206 L304 252 L296 260 L254 212 Z", shade(c, 0.12))
  );
}

function garmentSvg(product) {
  const spec = GARMENTS[product.id];
  if (!spec) throw new Error(`No placeholder drawing for ${product.id}`);
  const id = product.id.replace(/[^a-z0-9]/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 400 400">
    ${fabricDefs(id, spec.color)}
    ${shadow(id)}
    ${body(id, SHAPES[spec.shape], spec.color)}
    ${spec.draw(spec.color)}
  </svg>`;
}

// ---------------------------------------------------------------- models

const SKIN = {
  deep: "#5b3b2a",
  "medium brown": "#9a6a4b",
  olive: "#b6855f",
  light: "#e4bf9d",
  fair: "#efd1bb",
};

const BUILD = {
  // shoulder, waist, hip half-widths; arm and leg thickness
  women: {
    slim: { s: 31, w: 22, h: 31, arm: 11, leg: 15 },
    petite: { s: 30, w: 22, h: 30, arm: 10.5, leg: 14.5, scale: 0.94 },
    average: { s: 33, w: 25, h: 36, arm: 12, leg: 17 },
    curvy: { s: 35, w: 29, h: 43, arm: 14, leg: 20 },
  },
  men: {
    slim: { s: 38, w: 26, h: 28, arm: 13, leg: 16 },
    average: { s: 41, w: 29, h: 31, arm: 14, leg: 18 },
    athletic: { s: 46, w: 30, h: 32, arm: 16, leg: 19 },
    broad: { s: 50, w: 41, h: 42, arm: 18, leg: 23 },
  },
};

const HAIR = {
  amara: { style: "afro", color: "#1b1411" },
  lena: { style: "long", color: "#caa56b" },
  priya: { style: "long", color: "#221814" },
  mei: { style: "bob", color: "#141212" },
  omar: { style: "short", color: "#261c17" },
  daniel: { style: "short", color: "#6a4830" },
  kwame: { style: "buzz", color: "#151010" },
  hiro: { style: "short", color: "#121010" },
};

function hairBehind(style, color) {
  if (style === "long") return `<path d="M128 60 Q126 30 150 28 Q174 30 172 60 L178 128 Q150 138 122 128 Z" fill="${color}"/>`;
  if (style === "afro") return `<circle cx="150" cy="54" r="30" fill="${color}"/>`;
  if (style === "bob") return `<path d="M128 62 Q126 30 150 28 Q174 30 172 62 L174 92 Q150 98 126 92 Z" fill="${color}"/>`;
  return "";
}
function hairFront(style, color) {
  if (style === "short") return `<path d="M132 58 Q132 34 150 33 Q170 34 168 58 Q162 44 150 45 Q138 46 132 58 Z" fill="${color}"/>`;
  if (style === "buzz") return `<path d="M133 56 Q134 37 150 36 Q166 37 167 56 Q160 44 150 44 Q140 44 133 56 Z" fill="${color}" fill-opacity="0.85"/>`;
  if (style === "long" || style === "bob") return `<path d="M132 60 Q132 32 150 31 Q170 32 168 60 Q160 42 146 46 Q138 50 132 60 Z" fill="${color}"/>`;
  return "";
}

function modelSvg(model) {
  const b = BUILD[model.gender][model.bodyType];
  const skin = SKIN[model.skinTone];
  const hair = HAIR[model.id];
  const tee = "#3b3a40";
  const pants = "#1f1e23";
  const cx = 150;
  const { s, w, h, arm, leg } = b;
  const scale = b.scale ?? 1;

  // Torso: shoulders at y 100, waist y 188, hem tucked at the hip line y 222.
  const torso = `M${cx - s + 6} 98 Q${cx} 106 ${cx + s - 6} 98 Q${cx + s + 4} 102 ${cx + s + 2} 118 L${cx + w + 2} 188 L${cx + h - 2} 224 L${cx - h + 2} 224 L${cx - w - 2} 188 L${cx - s - 2} 118 Q${cx - s - 4} 102 ${cx - s + 6} 98 Z`;
  const sleeveL = `M${cx - s - 2} 104 Q${cx - s - 14} 118 ${cx - s - 14} 140 L${cx - s + 4} 142 Z`;
  const sleeveR = `M${cx + s + 2} 104 Q${cx + s + 14} 118 ${cx + s + 14} 140 L${cx + s - 4} 142 Z`;
  const armL = `M${cx - s - 4} 116 L${cx - s - 10} 190 L${cx - s - 6} 258`;
  const armR = `M${cx + s + 4} 116 L${cx + s + 10} 190 L${cx + s + 6} 258`;
  // Legs from the hip line down to the ankles.
  const legL = `M${cx - h + 2} 222 L${cx - 1} 222 L${cx - 4} 238 L${cx - leg + 5} 362 L${cx - leg * 2 + 3} 362 Z`;
  const legR = `M${cx + h - 2} 222 L${cx + 1} 222 L${cx + 4} 238 L${cx + leg - 5} 362 L${cx + leg * 2 - 3} 362 Z`;
  const shoeL = `<rect x="${cx - leg * 2 - 2}" y="358" width="${leg + 10}" height="12" rx="6" fill="#f3f2ef"/>`;
  const shoeR = `<rect x="${cx + leg - 8}" y="358" width="${leg + 10}" height="12" rx="6" fill="#f3f2ef"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024" viewBox="0 0 300 400">
    <defs>
      <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#eeece8"/>
        <stop offset="0.78" stop-color="#e3e0db"/>
        <stop offset="1" stop-color="#d6d2cc"/>
      </linearGradient>
      <filter id="blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>
    </defs>
    <rect width="300" height="400" fill="url(#wall)"/>
    <ellipse cx="150" cy="372" rx="70" ry="7" fill="#000" fill-opacity="0.22" filter="url(#blur)"/>
    <g transform="translate(${150 - 150 * scale} ${372 - 372 * scale}) scale(${scale})">
      ${hairBehind(hair.style, hair.color)}
      <path d="${armL}" fill="none" stroke="${skin}" stroke-width="${arm}" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${armR}" fill="none" stroke="${skin}" stroke-width="${arm}" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${legL}" fill="${pants}"/>
      <path d="${legR}" fill="${pants}"/>
      ${shoeL}${shoeR}
      <rect x="${cx - 7}" y="78" width="14" height="24" rx="5" fill="${shade(skin, -0.08)}"/>
      <path d="${torso}" fill="${tee}"/>
      <path d="${sleeveL}" fill="${tee}"/>
      <path d="${sleeveR}" fill="${tee}"/>
      <path d="M${cx - 10} 99 Q${cx} 108 ${cx + 10} 99" fill="none" stroke="${shade(tee, -0.3)}" stroke-width="2"/>
      <rect x="${cx - h + 2}" y="218" width="${(h - 2) * 2}" height="9" rx="2" fill="#17161a"/>
      <ellipse cx="${cx}" cy="60" rx="17" ry="21" fill="${skin}"/>
      ${hairFront(hair.style, hair.color)}
    </g>
  </svg>`;
}

// ---------------------------------------------------------------- write

async function write(svg, outPath, options) {
  if (!force && existsSync(outPath)) return false;
  mkdirSync(path.dirname(outPath), { recursive: true });
  await sharp(Buffer.from(svg)).webp(options).toFile(outPath);
  return true;
}

let written = 0;
for (const product of products) {
  const out = path.join(root, "public", product.image);
  if (await write(garmentSvg(product), out, { quality: 90, alphaQuality: 100 })) written++;
}
for (const model of models) {
  const out = path.join(root, "public", model.image);
  if (await write(modelSvg(model), out, { quality: 90 })) written++;
}
console.log(`Placeholders: wrote ${written} file(s)${force ? " (forced)" : ""}.`);
