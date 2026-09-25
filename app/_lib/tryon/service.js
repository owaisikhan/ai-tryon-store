import "server-only";
import { getModel, getProduct } from "@/app/_lib/catalog";
import { cacheKey, cached, hashBuffer } from "@/app/_lib/tryon/cache";
import { tryOnConfig } from "@/app/_lib/tryon/config";
import { TryOnError } from "@/app/_lib/tryon/errors";
import { generateTryOn } from "@/app/_lib/tryon/gemini";
import {
  decodeDataUrl,
  encodeResult,
  nearestAspectRatio,
  prepareBase,
  prepareGarment,
  readPublicImage,
} from "@/app/_lib/tryon/images";
import { mockTryOn } from "@/app/_lib/tryon/mock";
import { buildInstruction } from "@/app/_lib/tryon/prompt";

/*
  Applies garments to a base photo one at a time, each step one Gemini edit.

  Every step is cached under (engine, base image bytes, garment, note). The
  result of step N is the base of step N + 1, and the browser sends that same
  result back when it chains the next piece, so a combination any visitor has
  already made is never generated twice while the cache holds it.
*/

async function resolveBase(base) {
  if (base?.type === "preset") {
    const model = getModel(base.id);
    if (!model) throw new TryOnError(400, "unknown_model", "That model is not available.");
    return readPublicImage(model.image);
  }
  if (base?.type === "image") return decodeDataUrl(base.image);
  throw new TryOnError(400, "bad_request", "Choose a model or upload a photo first.");
}

function resolveGarments(garmentIds) {
  if (!Array.isArray(garmentIds) || garmentIds.length === 0) {
    throw new TryOnError(400, "bad_request", "Pick at least one piece to try on.");
  }
  if (garmentIds.length > tryOnConfig.maxGarmentsPerRequest) {
    throw new TryOnError(400, "too_many", "That is too many pieces at once. Start over and add fewer.");
  }
  return garmentIds.map((id) => {
    const product = getProduct(String(id));
    if (!product) throw new TryOnError(400, "unknown_product", "One of those pieces is no longer in the store.");
    return product;
  });
}

export async function runTryOn({ base, garmentIds, note = "" }) {
  const products = resolveGarments(garmentIds);
  let current = await resolveBase(base);
  const engine = tryOnConfig.mock ? "mock" : tryOnConfig.model;
  let allCached = true;

  for (const product of products) {
    const garmentRaw = await readPublicImage(product.image);
    const key = cacheKey([engine, hashBuffer(current), product.id, hashBuffer(garmentRaw), note]);
    const stepBase = current;

    const result = await cached(key, async () => {
      const prepared = await prepareBase(stepBase);
      const output = tryOnConfig.mock
        ? await mockTryOn({ base: prepared.buffer, garmentCutout: garmentRaw, slot: product.slot })
        : await generateTryOn({
            base: prepared.buffer,
            garment: await prepareGarment(garmentRaw),
            instruction: buildInstruction(product, note),
            aspectRatio: nearestAspectRatio(prepared.width, prepared.height),
          });
      return encodeResult(output);
    });

    allCached &&= result.cached;
    current = result.buffer;
  }

  return { buffer: current, cached: allCached, steps: products.length, mock: tryOnConfig.mock };
}
