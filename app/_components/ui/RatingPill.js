import { Star } from "lucide-react";

export default function RatingPill({ rating, reviews }) {
  return (
    <span
      className="inline-flex h-7 items-center gap-1 rounded-full bg-surface-2/90 px-2.5 text-xs font-semibold tabular-nums text-text"
      title={`Rated ${rating} out of 5 from ${reviews} reviews`}
    >
      <Star className="size-3.5 fill-star text-star" aria-hidden="true" />
      {rating.toFixed(1)}
      <span className="sr-only"> out of 5, {reviews} reviews</span>
    </span>
  );
}
