"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, Search, ShoppingBag } from "lucide-react";
import CartDrawer from "@/app/_components/cart/CartDrawer";
import { cartCount, useCart } from "@/app/_lib/stores/cart-store";
import { useWishlist } from "@/app/_lib/stores/wishlist-store";

const iconButton = "relative grid size-11 place-items-center rounded-lg text-muted transition-colors hover:text-text";

function CountBadge({ count }) {
  if (!count) return null;
  return (
    <span className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold leading-[18px] text-on-accent tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function HeaderActions() {
  const [cartOpen, setCartOpen] = useState(false);
  const bagCount = cartCount(useCart());
  const savedCount = useWishlist().length;

  return (
    <div className="flex items-center justify-end gap-0.5">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("store:focus-search"))}
        className={`${iconButton} sm:flex sm:w-auto sm:items-center sm:gap-2 sm:px-3`}
      >
        <Search className="size-[18px]" aria-hidden="true" />
        <span className="sr-only text-sm font-medium sm:not-sr-only">Search</span>
      </button>
      <Link href="/?saved=1" aria-label={`Saved pieces (${savedCount})`} className={`${iconButton} hidden sm:grid`}>
        <Heart className="size-[18px]" />
        <CountBadge count={savedCount} />
      </Link>
      <button type="button" onClick={() => setCartOpen(true)} aria-label={`Bag (${bagCount} items)`} className={iconButton}>
        <ShoppingBag className="size-[18px]" />
        <CountBadge count={bagCount} />
      </button>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
