"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { getModels, getProduct } from "@/app/_lib/catalog";
import { MAX_CHAIN, displacedBy, visiblePicks } from "@/app/_lib/garment-slots";
import { roomStore } from "@/app/_lib/fitting-room/fitting-room-store";
import { flyToRoom } from "@/app/_lib/fitting-room/fly-to-room";
import { useTryOn } from "@/app/_lib/fitting-room/use-try-on";
import { toast } from "@/app/_lib/stores/toast-store";

const FittingRoomContext = createContext(null);
const MODELS = getModels();
const UPLOAD_ID = "upload";

export function FittingRoomProvider({ children }) {
  const room = roomStore.useStore();
  const [open, setOpen] = useState(false);
  const [upload, setUpload] = useState(null);
  const [dragging, setDragging] = useState(null);

  // Resolve the active model: an uploaded photo, a stored preset, or the first.
  const usingUpload = room.modelId === UPLOAD_ID && upload;
  const preset = usingUpload ? null : (MODELS.find((m) => m.id === room.modelId) ?? MODELS[0]);
  const modelKey = usingUpload ? `upload:${upload.hash}` : `preset:${preset.id}`;
  const baseImage = usingUpload ? upload.dataUrl : preset.image;
  const activeModel = usingUpload
    ? { id: UPLOAD_ID, name: "Your photo", gender: null, image: upload.dataUrl }
    : preset;

  const presetId = preset?.id ?? null;
  const uploadUrl = usingUpload ? upload.dataUrl : null;
  const base = useMemo(
    () => (uploadUrl ? { type: "image", image: uploadUrl } : { type: "preset", id: presetId }),
    [uploadUrl, presetId],
  );

  const chain = room.chain;
  const picks = useMemo(() => visiblePicks(chain, getProduct), [chain]);
  const tryOn = useTryOn({ modelKey, base, baseImage, chain, enabled: open });

  const addPiece = useCallback((product) => {
    const current = roomStore.getSnapshot();
    const worn = visiblePicks(current.chain, getProduct);
    setOpen(true);
    if (worn.some((p) => p.id === product.id)) {
      toast(`${product.name} is already on.`);
      return;
    }
    const swapped = displacedBy(product, worn);
    if (swapped.length) toast(`Swapped ${swapped.map((p) => p.name).join(" and ")} for ${product.name}.`);

    // The chain only grows; past MAX_CHAIN it restarts from what is visible.
    let next = [...current.chain, product.id];
    if (next.length > MAX_CHAIN) next = [...worn.filter((p) => !swapped.includes(p)).map((p) => p.id), product.id];
    roomStore.setState({ ...current, chain: next });
  }, []);

  // A tap on a card (hanger or image): open the room, fly the product image
  // to the model like the reference, and add the piece as it lands. A piece
  // already on skips the flight and just says so.
  const sendToRoom = useCallback(
    async (product, fromEl) => {
      const worn = visiblePicks(roomStore.getSnapshot().chain, getProduct);
      if (worn.some((p) => p.id === product.id)) return addPiece(product);
      setOpen(true);
      await flyToRoom(fromEl, product.image);
      addPiece(product);
    },
    [addPiece],
  );

  // Removing rebuilds the chain from the pieces still worn, in order. When
  // that equals an earlier prefix, its photo is already cached.
  const removePiece = useCallback((id) => {
    const current = roomStore.getSnapshot();
    const worn = visiblePicks(current.chain, getProduct);
    roomStore.setState({ ...current, chain: worn.filter((p) => p.id !== id).map((p) => p.id) });
  }, []);

  const startOver = useCallback(() => {
    roomStore.setState((current) => ({ ...current, chain: [] }));
  }, []);

  // Switching model keeps what is worn and dresses the new model in it.
  const selectModel = useCallback((id) => {
    roomStore.setState((current) => ({
      ...current,
      modelId: id,
      chosen: id !== UPLOAD_ID,
      preferDismissed: false,
      chain: visiblePicks(current.chain, getProduct).map((p) => p.id),
    }));
  }, []);

  const setUploadedPhoto = useCallback(
    (photo) => {
      setUpload(photo);
      selectModel(UPLOAD_ID);
    },
    [selectModel],
  );

  const dismissPreference = useCallback(() => {
    roomStore.setState((current) => ({ ...current, preferDismissed: true }));
  }, []);

  const preferGender =
    room.chosen && !room.preferDismissed && activeModel.gender ? activeModel.gender : null;

  const value = {
    open,
    setOpen,
    models: MODELS,
    activeModel,
    upload,
    selectModel,
    setUploadedPhoto,
    chain,
    picks,
    isPicked: (id) => picks.some((p) => p.id === id),
    addPiece,
    sendToRoom,
    removePiece,
    startOver,
    tryOn,
    preferGender,
    dismissPreference,
    dragging,
    setDragging,
  };

  return <FittingRoomContext.Provider value={value}>{children}</FittingRoomContext.Provider>;
}

export function useFittingRoom() {
  const ctx = useContext(FittingRoomContext);
  if (!ctx) throw new Error("useFittingRoom must be used inside <FittingRoomProvider>");
  return ctx;
}
