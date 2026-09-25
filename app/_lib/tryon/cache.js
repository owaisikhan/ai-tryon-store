import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/*
  Result cache keyed by (base image, garment). Two layers:

  1. Memory: holds the in-flight promise too, so two requests for the same
     combination share one Gemini call instead of paying twice.
  2. Disk: a folder in the OS temp dir (or TRYON_CACHE_DIR). It survives dev
     server restarts, which saves quota while iterating. On Vercel /tmp is
     per instance and short-lived, so treat it as a bonus, not storage.
*/

const MAX_ENTRIES = 150;
const memory = new Map();
const CACHE_DIR = process.env.TRYON_CACHE_DIR || path.join(os.tmpdir(), "ai-tryon-cache");

export function hashBuffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function cacheKey(parts) {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 40);
}

function remember(key, value) {
  memory.delete(key);
  memory.set(key, value);
  while (memory.size > MAX_ENTRIES) memory.delete(memory.keys().next().value);
}

async function readDisk(key) {
  try {
    return await readFile(path.join(CACHE_DIR, `${key}.webp`));
  } catch {
    return null;
  }
}

async function writeDisk(key, buffer) {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(path.join(CACHE_DIR, `${key}.webp`), buffer);
  } catch {
    // A read-only or full disk only costs us the disk layer.
  }
}

// Returns { buffer, cached }. `produce` runs only on a miss in both layers.
export async function cached(key, produce) {
  const hit = memory.get(key);
  if (hit) {
    remember(key, hit);
    return { buffer: await hit, cached: true };
  }

  const fromDisk = await readDisk(key);
  if (fromDisk) {
    remember(key, Promise.resolve(fromDisk));
    return { buffer: fromDisk, cached: true };
  }

  const pending = produce();
  remember(key, pending);
  try {
    const buffer = await pending;
    writeDisk(key, buffer);
    return { buffer, cached: false };
  } catch (error) {
    memory.delete(key);
    throw error;
  }
}
