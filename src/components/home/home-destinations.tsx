import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ImagePlus } from "lucide-react";
import type { DesignTemplate } from "@/modules/customization/application/catalog";
import { MosaicSvg } from "@/modules/customization/presentation/mosaic-svg";
import styles from "./home-destinations.module.css";

export function HomeDestinations({ image, templates }: {
  image: { src: string; alt: string } | null;
  /** null means the creator is unavailable; an empty list still permits photo upload. */
  templates: DesignTemplate[] | null;
}) {
  const featured = templates?.find(t => t.id === "atardecer") ?? templates?.[0];
  return <section className={styles.home} aria-labelledby="home-title">
    <div className={styles.destinations}>
      <Link href="/tienda" className={`${styles.banner} ${styles.store}`} aria-label="Explorar la tienda">
        <div className={styles.photo}>
          {/* Tall cover crops need a wider source than the visible mobile viewport. */}
          {image ? <Image src={image.src} alt={image.alt} fill priority sizes="(max-width: 767px) 1200px, (max-aspect-ratio: 3/2) 150vh, 100vw" quality={90} className={styles.productImage} />
            : <div className={styles.photoFallback}><span>Canela</span><p>Vidrio · Cerámica · Mosaico</p></div>}
        </div>
        <div className={styles.intro}>
          <h1 id="home-title">{templates === null ? "Explorá nuestro catálogo." : <>Creá tu cuadro personalizado <span>o explorá nuestro catálogo.</span></>}</h1>
        </div>
        <div className={styles.copy}>
          <h2>Tienda</h2>
          <p>Vidrio, cerámica, espejos y cuadros para tu casa.</p>
          <span className={styles.action}>Explorar la tienda <ArrowUpRight size={20} aria-hidden="true" /></span>
        </div>
      </Link>
      {templates !== null && <Link href="/crear-cuadro" className={`${styles.banner} ${styles.creator}`} aria-label="Crear mi cuadro">
        <div className={styles.scene}>
          {featured ? <MosaicSvg design={featured.design} label={`Cuadro de ejemplo: ${featured.title}`} className={styles.art} />
            : <span className={styles.emptyArt}><ImagePlus size={64} aria-hidden="true" />Tu foto, en venecitas</span>}
        </div>
        <div className={styles.copy}>
          <span className={styles.imageLabel}>{featured ? "Diseño de ejemplo" : "Probá con tu foto"}</span>
          <h2>Cuadros personalizados</h2>
          <p>Elegí una foto que te guste y probá cómo quedaría en venecitas.</p>
          <span className={styles.action}>Crear mi cuadro <ArrowUpRight size={20} aria-hidden="true" /></span>
        </div>
      </Link>}
    </div>
  </section>;
}
