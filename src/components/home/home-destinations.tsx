import Image from "next/image";
import { ImagePlus } from "lucide-react";
import type { DesignTemplate } from "@/modules/customization/application/catalog";
import { MosaicSvg } from "@/modules/customization/presentation/mosaic-svg";
import { HomeCarousel } from "./home-carousel";
import styles from "./home-destinations.module.css";

export function HomeDestinations({ image, templates }: {
  image: { src: string; alt: string } | null;
  /** null means the creator is unavailable; an empty list still permits photo upload. */
  templates: DesignTemplate[] | null;
}) {
  const featured = templates?.find(t => t.id === "atardecer") ?? templates?.[0];
  return <HomeCarousel creatorEnabled={templates !== null}
    photo={image ? <Image src={image.src} alt={image.alt} fill priority
      sizes="(max-width: 767px) 1200px, (max-aspect-ratio: 3/2) 150vh, 100vw" quality={90} className={styles.productImage} />
      : <div className={styles.photoFallback}><span>Canela</span><p>Vidrio · Cerámica · Mosaico</p></div>}
    photoThumbnail={image ? <Image src={image.src} alt="" fill sizes="36px" className={styles.productImage} /> : <span className={styles.fallbackMark}>C</span>}
    frame={featured ? <>
      <MosaicSvg design={featured.design} label={`Cuadro de ejemplo: ${featured.title}`} className={styles.art} />
      <p className={styles.imageLabel}>Diseño de ejemplo</p>
    </> : <div className={styles.emptyArt}><ImagePlus size={48} aria-hidden="true" /><span>Tu foto, en venecitas</span></div>}
    frameThumbnail={featured ? <MosaicSvg design={featured.design} label="" /> : <ImagePlus size={24} />}
  />;
}
