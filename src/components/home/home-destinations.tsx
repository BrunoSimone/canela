import Image from "next/image";
import { ImagePlus } from "lucide-react";
import type { DesignTemplate } from "@/modules/customization/application/catalog";
import { MosaicSvg } from "@/modules/customization/presentation/mosaic-svg";
import { HomeCarousel } from "./home-carousel";
import type { CatalogPreview } from "./catalog-preview";
import styles from "./home-destinations.module.css";

export function HomeDestinations({ products, templates }: {
  products: CatalogPreview[];
  /** null means the creator is unavailable; an empty list still permits photo upload. */
  templates: DesignTemplate[] | null;
}) {
  const featured = templates?.find(t => t.id === "atardecer") ?? templates?.[0];
  return <HomeCarousel creatorEnabled={templates !== null}
    catalogBackdrop={products.length > 0 ? <div className={styles.catalogGrid}>
      {/* This is a decorative texture; repeat real photos only to fill the background. */}
      {Array.from({ length: 25 }, (_, index) => {
        const product = products[index % products.length];
        return <div className={styles.catalogTile} key={index}>
          <Image src={product.src} alt="" fill loading="eager"
            sizes="(max-width: 767px) 34vw, (max-width: 1100px) 25vw, 20vw" quality={60} />
        </div>;
      })}
    </div> : null}
    frame={featured ? <>
      <MosaicSvg design={featured.design} label={`Cuadro de ejemplo: ${featured.title}`} className={styles.art} />
      <p className={styles.imageLabel}>Diseño de ejemplo</p>
    </> : <div className={styles.emptyArt}><ImagePlus size={48} aria-hidden="true" /><span>Tu foto, en venecitas</span></div>}
    frameBackdrop={featured ? <MosaicSvg design={featured.design} label="" /> : null}
  />;
}
