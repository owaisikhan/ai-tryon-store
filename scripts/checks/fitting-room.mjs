// The fitting room end to end, against a server in mock mode:
// hanger, drag and drop, layering, same-slot swap, instant undo from the
// cache, and Start over. It refuses to run against real Gemini, so a check
// can never spend quota or send a photo anywhere.

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
  await waitForPieces(page, 1);
  ok("hanger opens the room and dresses the model", true);
  const afterShirt = await page.locator(`${ROOM} img[alt*='wearing']`).getAttribute("src");

  // 2. Drag a jacket onto the model: it layers on top.
  const card = page.locator("article", { hasText: "Olive Bomber Jacket" }).locator("div[title^='Drag']");
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
  await waitForPieces(page, 2);
  const swapped = (await page.getByText(/Swapped White Oxford Shirt for Black Heavyweight Tee/).count()) > 0;
  const shirtGone = (await page.locator(ROOM).getByRole("button", { name: "Take off White Oxford Shirt" }).count()) === 0;
  ok("a second top replaces the first and says so", swapped && shirtGone);

  // 4. Taking pieces off back to an earlier look is instant: no new request.
  await page.getByRole("button", { name: "Start over" }).click();
  await waitForPieces(page, 0);
  const before = tryOnCalls;
  await page.getByRole("button", { name: "Try on White Oxford Shirt" }).click();
  await waitForPieces(page, 1);
  const again = await page.locator(`${ROOM} img[alt*='wearing']`).getAttribute("src");
  ok("a look made before is served from the cache", tryOnCalls === before && again === afterShirt, `${tryOnCalls - before} new request(s)`);

  // 5. Start over returns to the bare model.
  await page.getByRole("button", { name: "Start over" }).click();
  await waitForPieces(page, 0);
  const bare = await page.locator(`${ROOM} img`).first().getAttribute("src");
  ok("Start over shows the model without picks", !bare.startsWith("data:"));

  ok("no console errors during the flow", errors.length === 0, errors.slice(0, 2).join(" | "));
  await context.close();
}
