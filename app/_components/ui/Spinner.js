import clsx from "clsx";

export default function Spinner({ className }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-[spin_2s_linear_infinite]",
        className,
      )}
    />
  );
}
