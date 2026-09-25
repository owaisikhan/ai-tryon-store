"use client";

export default function Error({ reset }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">The page did not load properly. Trying again usually fixes it.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-hover"
      >
        Try again
      </button>
    </div>
  );
}
