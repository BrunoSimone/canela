"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "motion/react";

import { CanelaBadge } from "@/components/brand/canela-badge";
import { siteConfig } from "@/lib/config";

export interface HeroSlideView {
  name: string;
  caption: string;
  href: string;
  imageUrl: string | null;
  label?: string;
  tint?: string;
}

function SpinningRing({ reduce }: { reduce: boolean }) {
  const nodes: number[][] = [];
  const clusters = [
    [100, 30],
    [149.5, 50.5],
    [170, 100],
    [149.5, 149.5],
    [100, 170],
    [50.5, 149.5],
    [30, 100],
    [50.5, 50.5],
  ];
  for (const [cx, cy] of clusters) {
    for (const r of [14.7, 11, 7.3, 3.7]) nodes.push([cx, cy, r]);
  }
  return (
    <svg
      viewBox="0 0 200 200"
      className="canela-spin pointer-events-none absolute left-[-48%] top-[-48%] h-[196%] w-[196%]"
      style={{
        transformOrigin: "50% 50%",
        animation: reduce ? undefined : "canela-spin 46s linear infinite",
        overflow: "visible",
      }}
      aria-hidden
    >
      <g fill="none" stroke="#8a5525" strokeWidth="1" opacity="0.32">
        <circle cx="100" cy="100" r="99" />
        <circle cx="100" cy="100" r="96" />
        {nodes.map(([cx, cy, r], idx) => (
          <circle key={idx} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    </svg>
  );
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export function Hero({ slides }: { slides: HeroSlideView[] }) {
  const [slide, setSlide] = useState(0);
  const reduce = useReducedMotion() ?? false;
  const count = slides.length;

  useEffect(() => {
    if (reduce || count <= 1) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % count), 4200);
    return () => clearInterval(id);
  }, [reduce, count]);

  const active = slides[slide] ?? slides[0];

  const motionProps = reduce
    ? {}
    : { variants: container, initial: "hidden" as const, animate: "show" as const };
  const itemProps = reduce ? {} : { variants: item };

  return (
    <section
      id="top"
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(158deg,#F1E2C6 0%, #E6CDA0 60%, #DCBD8A 100%)" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(78% 78% at 74% 48%, rgba(251,247,238,.62), rgba(251,247,238,0) 66%)",
        }}
      />

      <div className="relative z-[2] mx-auto grid max-w-[1180px] items-center gap-11 px-[22px] pb-12 pt-14 md:grid-cols-[1.05fr_0.95fr]">
        <motion.div className="flex flex-col items-start gap-5" {...motionProps}>
          <motion.span {...itemProps}>
            <CanelaBadge size={190} priority />
          </motion.span>
          <motion.div
            className="text-[12.5px] font-bold uppercase tracking-[0.22em] text-[var(--canela-ochre)]"
            {...itemProps}
          >
            {siteConfig.tagline}
          </motion.div>
          <motion.h1
            className="m-0 font-heading text-[clamp(42px,6vw,66px)] font-normal leading-[1.02] text-[var(--canela-brown)] text-balance"
            {...itemProps}
          >
            Piezas hechas a mano, con alma
          </motion.h1>
          <motion.p
            className="m-0 max-w-[440px] text-base leading-relaxed text-[#5a4130]"
            {...itemProps}
          >
            Vidrio reciclado, cerámica y espejos elaborados de forma artesanal y
            profesional. Cada pieza es única, hecha con tiempo y con oficio.
          </motion.p>
          <motion.a
            href="#catalogo"
            className="mt-1 inline-flex items-center gap-2.5 rounded-full bg-[var(--canela-ochre)] px-7 py-3.5 text-[15px] font-bold text-[var(--canela-cream-card)] transition-transform hover:scale-[1.03]"
            {...itemProps}
          >
            Ver catálogo →
          </motion.a>
        </motion.div>

        {active && (
          <motion.div
            className="flex flex-col items-center gap-4"
            initial={reduce ? undefined : { opacity: 0, scale: 0.9 }}
            animate={reduce ? undefined : { opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
          >
            <div className="flex min-h-[58px] flex-col justify-end gap-1 text-center">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a5525]">
                {active.caption}
              </div>
              <div className="font-heading text-[34px] leading-none text-[var(--canela-brown)]">
                {active.name}
              </div>
            </div>

            <div
              className="canela-float relative flex aspect-square w-[min(340px,82%)] items-center justify-center"
              style={reduce ? undefined : { animation: "canela-float 6s ease-in-out infinite" }}
            >
              <SpinningRing reduce={reduce} />
              <a
                href={active.href}
                className="relative z-[1] flex aspect-square w-full items-center justify-center overflow-hidden rounded-full border-[6px] border-[var(--canela-cream-card)] shadow-[0_16px_42px_rgba(74,53,39,.24)]"
              >
                {slides.map((s, i) => (
                  <div
                    key={i}
                    className="absolute inset-0 flex items-end justify-center p-4 transition-all duration-[900ms]"
                    style={{
                      background: s.imageUrl ? undefined : s.tint,
                      opacity: i === slide ? 1 : 0,
                      transform: i === slide ? "scale(1)" : "scale(1.06)",
                    }}
                  >
                    {s.imageUrl ? (
                      <Image
                        src={s.imageUrl}
                        alt={s.name}
                        fill
                        sizes="(max-width: 860px) 82vw, 340px"
                        className="object-cover"
                        priority={i === 0}
                      />
                    ) : (
                      <span className="rounded-lg bg-[rgba(251,247,238,.85)] px-2.5 py-1.5 font-mono text-[12.5px] text-[#9a8158]">
                        {s.label}
                      </span>
                    )}
                  </div>
                ))}
              </a>
            </div>

            {count > 1 && (
              <div className="flex items-center gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlide(i)}
                    aria-label={`Ver pieza ${i + 1}`}
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: i === slide ? 22 : 8,
                      background: i === slide ? "var(--canela-ochre)" : "rgba(184,132,42,.4)",
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}
