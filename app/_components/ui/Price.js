import { formatPrice } from "@/app/_lib/format-helpers";

export default function Price({ price, compareAt, size = "base" }) {
  const onSale = compareAt && compareAt > price;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span
        className={`font-bold tabular-nums ${size === "lg" ? "text-lg" : "text-base"} ${onSale ? "text-accent-text" : "text-text"}`}
      >
        {formatPrice(price)}
      </span>
      {onSale && (
        <>
          <span className="text-xs tabular-nums text-subtle line-through">
            <span className="sr-only">was </span>
            {formatPrice(compareAt)}
          </span>
          <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent-text">Sale</span>
        </>
      )}
    </p>
  );
}
