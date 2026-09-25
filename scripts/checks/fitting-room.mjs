// The fitting room end to end, against a server in mock mode:
// hanger, drag and drop, layering, same-slot swap, instant undo from the
// cache, Start over, and the image-tap flight to the model. It refuses to
// run against real Gemini, so a check can never spend quota or send a photo
// anywhere.

const ROOM = 'aside[aria-label="Fitting room"]';

async function waitForPieces(page, n) {
  await page.waitForFunction(
    ({ sel, n }) => {
      const room = document.querySelector(sel);
      if (!room) return false;
      const label = n === 1 ? "1 piece" : `${n} pieces`;
      const img = room.querySelector("img[alt*='wearing']");
      return room.innerText.includes(label) && !room.innerText.includes("Dressing your model") && (n === 0 || img?.src.startsWith("data:"));
    },
    { sel: ROOM, n },
    { timeout: 20000 },
  );
}

// Taps fly first and add the piece as it lands, so wait for that piece.
async function waitForPick(page, name) {
  await page.locator(ROOM).getByRole("button", { name: `Take off ${name}` }).waitFor({ timeout: 5000 });
}

export default async function fittingRoom({ base, browser, ok }) {
  const status = await (await fetch(`${base}/api/tryon`)).json();
  if (!status.mock) {
    ok("server is in mock mode (start it with npm run start:mock)", false, "refusing to call Gemini from a check");
    return;
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  let tryOnCalls = 0;
  page.on("request", (r) => r.url().endsWith("/api/tryon") && r.method() === "POST" && tryOnCalls++);

  await page.goto(`${base}/`, { waitUntil: "networkidle" });

  // 1. Hanger adds a piece and a photo comes back.
  await page.getByRole("button", { name: "Try on White Oxford Shirt" }).click();
  await waitForPick(page, "White Oxford Shirt");
  await waitForPieces(page, 1);
  ok("hanger opens the room and dresses the model", true);
  const afterShirt = await page.locator(`${ROOM} img[alt*='wearing']`).getAttribute("src");

  // 2. Drag a jacket onto the model: it layers on top.
  const card = page.locator("article", { hasText: "Olive Bomber Jacket" }).locator("div[title^='Tap']");
  await card.scrollIntoViewIfNeeded();
  const from = await card.boundingBox();
  const to = await page.locator(`${ROOM} .aspect-\\[3\\/4\\]`).first().boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 15, from.y + from.height / 2 + 15, { steps: 3 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
  await page.mouse.up();
  await waitForPieces(page, 2);
  ok("dragging a card onto the model adds it", true);

  // 3. A second top swaps out the first instead of stacking.
  await page.getByRole("button", { name: "Try on Black Heavyweight Tee" }).click();
  await waitForPick(page, "Black Heavyweight Tee");
  await waitForPieces(page, 2);
  const swapped = (await page.getByText(/Swapped White Oxford Shirt for Black Heavyweight Tee/).count()) > 0;
  const shirtGone = (await page.locator(ROOM).getByRole("button", { name: "Take off White Oxford Shirt" }).count()) === 0;
  ok("a second top replaces the first and says so", swapped && shirtGone);

  // 4. Taking pieces off back to an earlier look is instant: no new request.
  await page.getByRole("button", { name: "Start over" }).click();
  await waitForPieces(page, 0);
  const before = tryOnCalls;
  await page.getByRole("button", { name: "Try on White Oxford Shirt" }).click();
  await waitForPick(page, "White Oxford Shirt");
  await waitForPieces(page, 1);
  const again = await page.locator(`${ROOM} img[alt*='wearing']`).getAttribute("src");
  ok("a look made before is served from the cache", tryOnCalls === before && again === afterShirt, `${tryOnCalls - before} new request(s)`);

  // 5. Start over returns to the bare model.
  await page.getByRole("button", { name: "Start over" }).click();
  await waitForPieces(page, 0);
  const bare = await page.locator(`${ROOM} img`).first().getAttribute("src");
  ok("Start over shows the model without picks", !bare.startsWith("data:"));

  // 6. Tapping a product image flies a copy to the model (as in the reference
  //    recording), adds the piece as it lands, and cleans the copy up.
  await page.getByRole("button", { name: "Close fitting room" }).click();
  await page.locator("article", { hasText: "Sage Pleated Midi Skirt" }).locator("div[title^='Tap']").click();
  const flew = await page
    .waitForSelector("[data-fly-ghost]", { timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  await waitForPick(page, "Sage Pleated Midi Skirt");
  await waitForPieces(page, 1);
  const cleaned = (await page.locator("[data-fly-ghost]").count()) === 0;
  ok("tapping a product image flies it to the model, then puts it on", flew && cleaned, `flew ${flew}, cleaned ${cleaned}`);

  ok("no console errors during the flow", errors.length === 0, errors.slice(0, 2).join(" | "));
  await context.close();

  // 7. With reduced motion, nothing flies but the piece still goes on.
  const calm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const still = await calm.newPage();
  await still.goto(`${base}/`, { waitUntil: "networkidle" });
  let ghostSeen = false;
  await still.exposeFunction("__ghostSeen", () => (ghostSeen = true));
  await still.evaluate(() =>
    new MutationObserver(() => document.querySelector("[data-fly-ghost]") && window.__ghostSeen()).observe(document.body, {
      childList: true,
    }),
  );
  await still.getByRole("button", { name: "Try on Charcoal Wool Trousers" }).click();
  await waitForPick(still, "Charcoal Wool Trousers");
  await waitForPieces(still, 1);
  ok("reduced motion skips the flight and still adds the piece", !ghostSeen);
  await calm.close();
}
