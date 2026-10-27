"use client";

import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useReducedMotion } from "motion/react";
import styles from "./home-destinations.module.css";

type Visual = "frames" | "store";

export function HomeCarousel({ creatorEnabled, photo, frame, frameBackdrop }: {
  creatorEnabled: boolean;
  photo: ReactNode;
  frame: ReactNode;
  frameBackdrop: ReactNode;
}) {
  const [selected, setSelected] = useState<Visual>("frames");
  const [touching, setTouching] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const reduced = useReducedMotion();
  const active = creatorEnabled ? selected : "store";

  useEffect(() => {
    if (!creatorEnabled || reduced || touching) return;
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
  }, [creatorEnabled, reduced, touching, active]);

  const startTouch = (event: TouchEvent<HTMLElement>) => {
    if (!creatorEnabled || (event.target as Element).closest("a, button")) return;
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
    aria-roledescription={creatorEnabled ? "carrusel" : undefined}
    onTouchStart={startTouch} onTouchEnd={endTouch}
    onTouchCancel={() => { touch.current = null; setTouching(false); }}>
    {creatorEnabled && <div className={styles.frameBackdrop} aria-hidden="true">{frameBackdrop}</div>}
    <div className={styles.photo} aria-hidden={active !== "store"}>{photo}</div>
    <div className={styles.intro}>
      <h1 id="home-title">{creatorEnabled ? <>Creá tu cuadro personalizado <span>o explorá nuestro catálogo.</span></> : "Explorá nuestro catálogo."}</h1>
      <nav className={styles.journeys} aria-label="Elegí tu recorrido">
        {creatorEnabled && <Link href="/crear-cuadro" className={styles.action}>
          Crear mi cuadro <ArrowUpRight size={20} aria-hidden="true" />
        </Link>}
        <Link href="/tienda" className={`${styles.action} ${creatorEnabled ? styles.secondaryAction : ""}`}>
          Explorar la tienda <ArrowUpRight size={20} aria-hidden="true" />
        </Link>
      </nav>
    </div>
    <div className={styles.stage}>
      {creatorEnabled && <div className={styles.framePresentation} aria-hidden={active !== "frames"}>
        <div className={styles.floatingFrame}>{frame}</div>
      </div>}
    </div>
  </section>;
}
