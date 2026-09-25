"use client";

import { createPersistentStore } from "@/app/_lib/stores/create-persistent-store";

// What survives a reload: the chosen preset model and the pieces tried on.
// An uploaded photo is deliberately kept in memory only.
export const DEFAULT_ROOM = {
  modelId: null,
  chain: [],
  chosen: false,
  preferDismissed: false,
};

export const roomStore = createPersistentStore("store.fitting-room.v1", DEFAULT_ROOM);
