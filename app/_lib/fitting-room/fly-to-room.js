"use client";

/*
  The "send to the fitting room" flight from the reference recording: a copy
  of the product image lifts out of its card, tilts, swings in an arc to the
  model's chest while shrinking, and fades as it lands; the photo then gives
  a short orange pulse. Plain Web Animations API, no library.

  Resolves when the piece has landed (or at once when motion is reduced or
  there is nothing to fly), so the caller can add the piece at that moment.
*/

const FLIGHT_MS = 760;
const STAGE = '[data-fly-target="stage"]';

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// The fitting room may have only just been asked to open; wait a few frames
// for the model photo to mount and settle before measuring it.
function waitForStage(frames = 12) {
  return new Promise((resolve) => {
    let left = frames;
    function look() {
      const stage = document.querySelector(STAGE);
      if (stage && stage.getBoundingClientRect().width > 0 && left < frames - 1) return resolve(stage);
      if (--left <= 0) return resolve(stage ?? null);
      requestAnimationFrame(look);
    }
    requestAnimationFrame(look);
  });
}

function pulse(stage) {
  if (!stage || reducedMotion()) return;
  stage.animate(
    [
      { boxShadow: "0 0 0 0 rgb(226 122 60 / 0.75)", transform: "scale(1)" },
      { boxShadow: "0 0 0 10px rgb(226 122 60 / 0)", transform: "scale(1.012)", offset: 0.6 },
      { boxShadow: "0 0 0 0 rgb(226 122 60 / 0)", transform: "scale(1)" },
    ],
    { duration: 520, easing: "ease-out" },
  );
}

export async function flyToRoom(sourceEl, src) {
  if (typeof window === "undefined" || !sourceEl) return;
  const from = sourceEl.getBoundingClientRect();
  const stage = await waitForStage();
  if (!stage) return;
  if (reducedMotion() || from.width === 0) {
    pulse(stage);
    return;
  }

  const to = stage.getBoundingClientRect();
  // Land on the torso: centre of the photo, a little above the middle.
  const landX = to.left + to.width / 2;
  const landY = to.top + to.height * 0.4;
  const size = Math.min(from.width, from.height);
  const dx = landX - (from.left + from.width / 2);
  const dy = landY - (from.top + from.height / 2);
  const endScale = Math.max(0.28, Math.min(0.6, (to.width * 0.55) / size));
  const midScale = (1.08 + endScale) / 2;
  // A gentle arc: rise while travelling, then drop onto the model.
  const lift = Math.min(90, Math.abs(dx) * 0.18 + 30);
  const tilt = dx < 0 ? -1 : 1;

  const ghost = document.createElement("img");
  ghost.src = src;
  ghost.alt = "";
  ghost.setAttribute("aria-hidden", "true");
  ghost.dataset.flyGhost = "";
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${from.left + (from.width - size) / 2}px`,
    top: `${from.top + (from.height - size) / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: "contain",
    padding: `${Math.round(size * 0.1)}px`,
    pointerEvents: "none",
    zIndex: "60",
    willChange: "transform, opacity",
    filter: "drop-shadow(0 18px 22px rgb(0 0 0 / 0.55))",
  });
  document.body.appendChild(ghost);

  const at = (x, y, s, r) => `translate(${x}px, ${y}px) scale(${s}) rotate(${r}deg)`;
  const flight = ghost.animate(
    [
      { transform: at(0, 0, 1, 0), opacity: 1 },
      { transform: at(0, -16, 1.08, -7 * tilt), opacity: 1, offset: 0.16 },
      { transform: at(dx * 0.55, dy * 0.55 - lift, midScale, 9 * tilt), opacity: 1, offset: 0.62 },
      { transform: at(dx, dy, endScale * 1.05, -4 * tilt), opacity: 1, offset: 0.88 },
      { transform: at(dx, dy, endScale * 0.9, 0), opacity: 0 },
    ],
    { duration: FLIGHT_MS, easing: "cubic-bezier(0.45, 0.05, 0.3, 1)" },
  );

  try {
    await flight.finished;
  } catch {
    // Cancelled (the page changed mid-flight): land anyway.
  } finally {
    ghost.remove();
  }
  pulse(stage);
}

// A drag that ends back on its own card still fires a click there; ignore
// that click so a drag never also counts as a tap.
let lastDragEnd = 0;
export function markDragEnd() {
  lastDragEnd = Date.now();
}
export function justDragged() {
  return Date.now() - lastDragEnd < 300;
}
