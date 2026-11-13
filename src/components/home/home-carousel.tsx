"use client";

import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useReducedMotion } from "motion/react";
import styles from "./home-destinations.module.css";

type Visual = "frames" | "store";

/** When the creator is unavailable, its journey stays visible as a non-interactive "coming soon" sign. */
export function HomeCarousel({ creatorEnabled, catalogBackdrop, storePiece, frame, frameBackdrop }: {
  creatorEnabled: boolean;
  catalogBackdrop: ReactNode;
  storePiece: ReactNode;
  frame: ReactNode;
  frameBackdrop: ReactNode;
}) {
  // The sellable catalog leads while the creator is only announced.
  const [selected, setSelected] = useState<Visual>(creatorEnabled ? "frames" : "store");
  const [touching, setTouching] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const reduced = useReducedMotion();
  const active = selected;

  useEffect(() => {
    if (reduced || touching) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (document.visibilityState !== "hidden") {
        timer = setTimeout(() => setSelected(current => current === "frames" ? "store" : "frames"), 6000);
      }
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", schedule); };
  }, [reduced, touching, active]);

  const startTouch = (event: TouchEvent<HTMLElement>) => {
    if ((event.target as Element).closest("a, button")) return;
    setTouching(true);
    const first = event.touches[0];
    touch.current = event.touches.length === 1 ? { x: first.clientX, y: first.clientY } : null;
  };
  const endTouch = (event: TouchEvent<HTMLElement>) => {
    const start = touch.current;
    const end = event.changedTouches[0];
    touch.current = null;
    setTouching(false);
    if (!start || !end) return;
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      setSelected(current => current === "frames" ? "store" : "frames");
    }
  };

  return <section className={styles.home} data-visual={active} aria-labelledby="home-title"
    aria-roledescription="carrusel"
    onTouchStart={startTouch} onTouchEnd={endTouch}
    onTouchCancel={() => { touch.current = null; setTouching(false); }}>
    <div className={styles.frameBackdrop} aria-hidden="true">{frameBackdrop}</div>
    <div className={styles.catalogBackdrop} aria-hidden="true">{catalogBackdrop}</div>
    <div className={styles.intro}>
      <h1 id="home-title">{creatorEnabled ? <>Creá tu cuadro personalizado <span>o explorá nuestro catálogo.</span></> : "Explorá nuestro catálogo."}</h1>
      <nav className={styles.journeys} aria-label="Elegí tu recorrido">
        {creatorEnabled && <Link href="/crear-cuadro" className={styles.action}>
          Crear mi cuadro <ArrowUpRight size={20} aria-hidden="true" />
        </Link>}
        <Link href="/tienda" className={`${styles.action} ${creatorEnabled ? styles.secondaryAction : ""}`}>
          Explorar el catálogo <ArrowUpRight size={20} aria-hidden="true" />
        </Link>
        {!creatorEnabled && <p className={styles.comingSoon}>
          Crear mi cuadro <span className={styles.soonTag}>Próximamente</span>
        </p>}
      </nav>
    </div>
    <div className={styles.stage}>
      <div className={styles.productPresentation} aria-hidden={active !== "store"}>
        <div className={styles.floatingVisual}>{storePiece}</div>
      </div>
      <div className={styles.framePresentation} aria-hidden={active !== "frames"}>
        <div className={styles.floatingVisual}>{frame}</div>
      </div>
    </div>
  </section>;
}
