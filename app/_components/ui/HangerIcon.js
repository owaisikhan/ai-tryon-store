// lucide has no hanger; this one follows its grid (24px, 2px round strokes).
export default function HangerIcon({ className, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M9.5 5.5a2.5 2.5 0 1 1 3.4 2.33c-.55.22-.9.75-.9 1.34V10" />
      <path d="M12 10 3.3 16.2a1 1 0 0 0 .58 1.8h16.24a1 1 0 0 0 .58-1.8Z" />
    </svg>
  );
}
