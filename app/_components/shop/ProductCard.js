"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import clsx from "clsx";
import { useDraggable } from "@dnd-kit/core";
import { Heart, ShoppingBag } from "lucide-react";
import HangerIcon from "@/app/_components/ui/HangerIcon";
import Price from "@/app/_components/ui/Price";
import RatingPill from "@/app/_components/ui/RatingPill";
import { useFittingRoom } from "@/app/_lib/fitting-room/FittingRoomProvider";
import { justDragged } from "@/app/_lib/fitting-room/fly-to-room";
import { addToCart } from "@/app/_lib/stores/cart-store";
import { toast } from "@/app/_lib/stores/toast-store";
import { toggleWishlist } from "@/app/_lib/stores/wishlist-store";

const circle =
  "grid size-10 place-items-center rounded-full transition-colors focus-visible:outline-offset-1";

export default function ProductCard({ product, saved, priority = false }) {
  const { isPicked, sendToRoom, removePiece } = useFittingRoom();
  const picked = isPicked(product.id);
  const [flying, setFlying] = useState(false);
  const mediaRef = useRef(null);

  // The image is the drag handle; a short move threshold keeps clicks clicks.
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: `product:${product.id}`,
    data: { product },
  });

  // Hanger or image tap: the product image flies to the model, then goes on.
  async function tryOn() {
    if (flying) return;
    setFlying(true);
    try {
      await sendToRoom(product, mediaRef.current);
    } finally {
      setFlying(false);
    }
  }

  function handleAddToCart() {
    addToCart(product.id);
    toast(`${product.name} added to your bag.`);
  }

  return (
    <article
      className={clsx(
        "group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-border-soft bg-surface transition-colors hover:border-border",
        picked && "border-accent/40",
      )}
    >
      <div
        ref={(node) => {
          setNodeRef(node);
          mediaRef.current = node;
        }}
        {...listeners}
        onClick={() => !justDragged() && tryOn()}
        className={clsx(
          "relative aspect-square touch-manipulation select-none",
          "cursor-pointer active:cursor-grabbing",
          isDragging && "opacity-40",
        )}
        title="Tap to try it on, or drag it onto the model"
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          priority={priority}
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
          draggable={false}
          className="object-contain p-6 transition-transform duration-300 group-hover:scale-[1.03] sm:p-8"
        />
      </div>

      <div className="absolute left-3 top-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${product.name} from saved` : `Save ${product.name}`}
          className={clsx(circle, "bg-surface-2/90 text-muted hover:text-text", saved && "text-accent-text")}
        >
          <Heart className={clsx("size-[18px]", saved && "fill-current")} />
        </button>
        <button
          type="button"
          onClick={() => (picked ? removePiece(product.id) : tryOn())}
          aria-pressed={picked || flying}
          aria-label={picked ? `Take off ${product.name}` : `Try on ${product.name}`}
          title={picked ? "Remove from the fitting room" : "Try it on"}
          className={clsx(
            circle,
            picked || flying
              ? "bg-accent text-on-accent hover:bg-accent-hover"
              : "bg-surface-2/90 text-muted hover:bg-accent hover:text-on-accent",
          )}
        >
          <HangerIcon className="size-[19px]" />
        </button>
      </div>

      <div className="absolute right-3 top-3">
        <RatingPill rating={product.rating} reviews={product.reviews} />
      </div>

      <div className="relative flex flex-1 items-end justify-between gap-3 px-4 pb-4 pt-1 sm:px-5 sm:pb-5">
        <div className="min-w-0">
          <h3 className="line-clamp-2 min-h-[2.6em] text-[13px] font-medium leading-[1.3] text-muted sm:text-sm">{product.name}</h3>
          <Price price={product.price} compareAt={product.compareAt} />
        </div>

        {/* The orange quarter circle from the reference, grown on hover. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-2 -right-2 size-24 origin-bottom-right scale-0 rounded-tl-full bg-accent transition-transform duration-300 ease-out group-hover:scale-100 group-focus-within:scale-100 motion-reduce:transition-none"
        />
        <button
          type="button"
          onClick={handleAddToCart}
          aria-label={`Add ${product.name} to bag`}
          className="relative grid size-11 shrink-0 place-items-center rounded-full text-text transition-colors group-hover:text-on-accent group-focus-within:text-on-accent"
        >
          <ShoppingBag className="size-5" />
        </button>
      </div>
    </article>
  );
}
