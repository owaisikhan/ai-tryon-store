import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <p className="text-sm font-semibold text-accent-text">404</p>
      <h1 className="mt-2 text-2xl font-bold">That page is not on the rail</h1>
      <p className="mt-2 text-sm text-muted">The link may be old, or the piece has sold out.</p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-hover"
      >
        Back to the store
      </Link>
    </div>
  );
}
