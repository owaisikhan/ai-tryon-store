"use client";

import Image from "next/image";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Drawer from "@/app/_components/ui/Drawer";
import { getProduct } from "@/app/_lib/catalog";
import { formatPrice } from "@/app/_lib/format-helpers";
import { removeFromCart, setCartQty, useCart } from "@/app/_lib/stores/cart-store";

const stepper = "grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-3 hover:text-text";

export default function CartDrawer({ open, onClose }) {
  const lines = useCart()
    .map((line) => ({ ...line, product: getProduct(line.id) }))
    .filter((line) => line.product);
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.qty, 0);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Your bag"
      footer={
        lines.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="text-base font-bold tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-subtle">Checkout arrives in a later version. Your bag is kept on this device.</p>
          </div>
        )
      }
    >
      {lines.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <ShoppingBag className="size-8 text-subtle" aria-hidden="true" />
          <p className="mt-3 font-semibold">Your bag is empty</p>
          <p className="mt-1 text-sm text-muted">Tap the bag icon on any piece to add it.</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-hover"
          >
            Keep shopping
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {lines.map(({ id, qty, product }) => (
            <li key={id} className="flex gap-3">
              <div className="relative size-20 shrink-0 rounded-xl bg-surface-2">
                <Image src={product.image} alt="" fill sizes="80px" className="object-contain p-2" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <button
                    type="button"
                    onClick={() => removeFromCart(id)}
                    aria-label={`Remove ${product.name}`}
                    className="-mr-2 -mt-2 grid size-9 shrink-0 place-items-center rounded-lg text-subtle hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center rounded-lg bg-surface-2">
                    <button type="button" onClick={() => setCartQty(id, qty - 1)} aria-label="One fewer" className={stepper}>
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm tabular-nums" aria-label={`Quantity ${qty}`}>
                      {qty}
                    </span>
                    <button type="button" onClick={() => setCartQty(id, qty + 1)} aria-label="One more" className={stepper}>
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-bold tabular-nums">{formatPrice(product.price * qty)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
