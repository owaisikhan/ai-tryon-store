import Image from "next/image";
import OpenFittingRoomButton from "@/app/_components/fitting-room/OpenFittingRoomButton";

const SHOWCASE = [
  { src: "/products/camel-belted-trench.webp", tilt: "-rotate-6 translate-y-2" },
  { src: "/products/army-green-puffer.webp", tilt: "-translate-y-1" },
  { src: "/products/rust-slip-dress.webp", tilt: "rotate-6 translate-y-3" },
];

export default function HeroBanner() {
  return (
    <section className="mx-auto max-w-[1440px] px-4 pt-5 sm:px-6">
      <div className="grid overflow-hidden rounded-[var(--radius-card)] border border-border-soft bg-[linear-gradient(115deg,#1b191c_0%,#211b18_60%,#2a1f19_100%)] md:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col items-start gap-3 px-6 py-7 sm:px-10 sm:py-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-text">AI fitting room</p>
          <h2 className="max-w-lg text-[26px] font-bold leading-[1.12] tracking-tight sm:text-[34px]">
            See it on before it is in your bag.
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted">
            Pick a model or upload your own photo, tap the hanger on any piece, and get a photo of the look in
            seconds. Layer a jacket over a shirt, swap the trousers, start over.
          </p>
          <OpenFittingRoomButton />
        </div>

        <div aria-hidden="true" className="hidden items-center justify-center gap-1 px-6 py-6 md:flex">
          {SHOWCASE.map(({ src, tilt }) => (
            <div key={src} className={`relative size-36 lg:size-44 ${tilt}`}>
              <Image
                src={src}
                alt=""
                fill
                sizes="176px"
                priority
                className="object-contain drop-shadow-[0_18px_24px_rgb(0_0_0/0.5)]"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
