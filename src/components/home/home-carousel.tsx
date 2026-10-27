"use client";

import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useReducedMotion } from "motion/react";
import styles from "./home-destinations.module.css";

type Visual = "frames" | "store";

export function HomeCarousel({ creatorEnabled, photo, frame, photoThumbnail, frameThumbnail }: {
  creatorEnabled: boolean;
  photo: ReactNode;
  frame: ReactNode;
  photoThumbnail: ReactNode;
  frameThumbnail: ReactNode;
}) {
  const [selected, setSelected] = useState<Visual>("frames");
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const reduced = useReducedMotion();
  const active = creatorEnabled ? selected : "store";

  useEffect(() => {
    if (!creatorEnabled || reduced || hovered || focused || touching) return;
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
  }, [creatorEnabled, reduced, hovered, focused, touching, active]);

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
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    onTouchStart={startTouch} onTouchEnd={endTouch}
    onTouchCancel={() => { touch.current = null; setTouching(false); }}>
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
    {creatorEnabled && <div className={styles.selectors} role="group" aria-label="Imágenes de los recorridos">
      <button type="button" className={styles.selector} aria-label="Ver cuadros personalizados"
        aria-pressed={active === "frames"} onClick={() => setSelected("frames")}>
        <span className={styles.thumbnail} aria-hidden="true">{frameThumbnail}</span><span>Cuadros</span>
      </button>
      <button type="button" className={styles.selector} aria-label="Ver productos de la tienda"
        aria-pressed={active === "store"} onClick={() => setSelected("store")}>
        <span className={styles.thumbnail} aria-hidden="true">{photoThumbnail}</span><span>Tienda</span>
      </button>
    </div>}
  </section>;
}
