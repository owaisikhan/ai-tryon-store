import "server-only";
import { SLOT_INSTRUCTIONS } from "@/app/_lib/garment-slots";

// The text instruction sent with the two images. Identity and scene are
// locked down first, because the most common failure of image editing models
// is quietly changing the person's face or body.
export function buildInstruction(product, note = "") {
  const lines = [
    "You are a fashion photo editor doing a virtual try-on.",
    "The first image is a full-body photo of a person. The second image is a product photo of one garment.",
    `The garment is ${product.description} (${product.name}, colour: ${product.color}).`,
    SLOT_INSTRUCTIONS[product.slot] ?? SLOT_INSTRUCTIONS.outer,
    "Keep the same person: face, hair, skin tone, body shape and proportions, pose and expression must not change.",
    "Keep the same background, lighting, camera angle and full-body framing. Do not crop the head or feet.",
    "Reproduce the garment's colour, fabric, pattern, length and details from the product image faithfully, sized and draped naturally for this person's body, with realistic folds and shadows.",
    "Return a single photorealistic photo and nothing else.",
  ];
  if (note) lines.push(`Styling note from the shopper: ${note}`);
  return lines.join("\n");
}
