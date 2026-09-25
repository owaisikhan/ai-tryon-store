import { siteConfig } from "@/app/_lib/siteConfig";

export default function Footer() {
  return (
    <footer className="border-t border-border-soft">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-1 px-4 py-8 pb-28 text-xs text-subtle sm:flex-row sm:justify-between sm:px-6">
        <p>
          <span className="font-semibold tracking-[0.3em] text-muted">{siteConfig.name}</span>
        </p>
        <p>Try-on photos are made by AI and are a guide to fit and colour, not a guarantee.</p>
      </div>
    </footer>
  );
}
