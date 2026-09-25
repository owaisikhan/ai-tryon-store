import Link from "next/link";
import { siteConfig } from "@/app/_lib/siteConfig";
import HeaderActions from "@/app/_components/layout/HeaderActions";
import MobileMenu from "@/app/_components/layout/MobileMenu";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center rounded-2xl border border-border-soft bg-surface/95 px-3 shadow-[0_2px_10px_rgb(0_0_0/0.35)] sm:px-5">
        <nav aria-label="Main" className="flex items-center gap-1">
          <MobileMenu />
          <ul className="hidden items-center gap-1 md:flex">
            {siteConfig.nav.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="inline-flex h-11 items-center rounded-lg px-3 text-[13px] font-medium uppercase tracking-wide text-muted transition-colors hover:text-text"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Link
          href="/"
          className="justify-self-center px-2 text-xl font-semibold tracking-[0.42em] text-text sm:text-2xl"
          aria-label={`${siteConfig.name} home`}
        >
          {siteConfig.name}
        </Link>

        <HeaderActions />
      </div>
    </header>
  );
}
