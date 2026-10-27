import Image from "next/image";
import { ImagePlus } from "lucide-react";
import type { DesignTemplate } from "@/modules/customization/application/catalog";
import { MosaicSvg } from "@/modules/customization/presentation/mosaic-svg";
import { HomeCarousel } from "./home-carousel";
import type { CatalogPreview } from "./catalog-preview";
import styles from "./home-destinations.module.css";

// Existing transparent product photograph in Sanity, used as the store's visual identity.
const chessPieceImage = "https://cdn.sanity.io/images/2puxew6b/production/aca61f0c0b27615757104c53f3b53fcde12cc083-3456x4608.png";

export function HomeDestinations({ products, templates }: {
  products: CatalogPreview[];
  /** null means the creator is unavailable; an empty list still permits photo upload. */
  templates: DesignTemplate[] | null;
}) {
  const featured = templates?.find(t => t.id === "atardecer") ?? templates?.[0];
  return <HomeCarousel creatorEnabled={templates !== null}
    storePiece={<Image src={chessPieceImage} alt="Pieza de ajedrez de cerámica de Canela"
      width={1200} height={1600} loading="eager" quality={90} className={styles.productArt}
      sizes="(max-width: 767px) 51vw, 355px" />}
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
