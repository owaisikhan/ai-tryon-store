// The grid shows the right products for the URL.
// Bug it guards: parseFilters read a missing ?max as Number(null) = 0, clamped
// it to the lowest price, and the home page rendered "0 products" while the
// build passed and the code looked right.

async function count(page) {
  const text = await page.locator("#catalogue-heading + p").innerText();
  return Number(text.match(/\d+/)?.[0] ?? NaN);
}

export default async function catalogue({ base, browser, ok }) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  const all = await count(page);
  ok("home page lists the whole catalogue", all === 24, `${all} products`);

  await page.goto(`${base}/?gender=men`, { waitUntil: "networkidle" });
  const men = await count(page);
  const unisexShown = await page.getByText("Grey Marl Hoodie").count();
  ok("Men includes unisex pieces", men > 0 && men < all && unisexShown > 0, `${men} products`);

  await page.goto(`${base}/?min=100&max=150`, { waitUntil: "networkidle" });
  const prices = await page.$$eval("article p span.font-bold", (els) => els.map((e) => Number(e.textContent.replace(/[^0-9.]/g, ""))));
  ok("price range keeps only prices inside it", prices.length > 0 && prices.every((p) => p >= 100 && p <= 150), prices.join(", "));

  // Choosing a filter writes the URL without a reload, and Back undoes it.
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.locator("aside").getByRole("radio", { name: "Women" }).click();
  await page.waitForURL(/gender=women/);
  const women = await count(page);
  await page.goBack();
  await page.waitForURL((url) => !url.search.includes("gender"));
  ok("filter goes into the URL and Back restores it", women < all && (await count(page)) === all, `${women} then ${await count(page)}`);

  await page.goto(`${base}/?q=zzzz-no-match`, { waitUntil: "networkidle" });
  ok("an empty result explains itself", (await page.getByText("Nothing matches these filters").count()) === 1);

  await context.close();
}
