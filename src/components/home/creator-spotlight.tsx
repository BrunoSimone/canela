import Link from "next/link";
import { ArrowRight, ArrowUpRight, ImagePlus } from "lucide-react";
import type { DesignTemplate } from "@/modules/customization/application/catalog";
import { MosaicSvg } from "@/modules/customization/presentation/mosaic-svg";
import styles from "./home-discovery.module.css";

export function CreatorSpotlight({ templates }: { templates: DesignTemplate[] }) {
  const featured = templates.find(t => t.id === "atardecer") ?? templates[0];
  const companion = templates.find(t => t.id !== featured?.id);

  return <section className={styles.spotlight} aria-labelledby="creator-spotlight-title">
    <div className={styles.spotlightCopy}>
      <p className={styles.eyebrow}>Un recuerdo, pieza por pieza</p>
      <h2 id="creator-spotlight-title">Tu imagen,<br />hecha mosaico.</h2>
      <p className={styles.intro}>Esa foto que siempre volvés a mirar también puede tener un lugar en tu casa. Mirá cómo queda y hacela tuya, venecita por venecita.</p>
      <ol className={styles.steps}>
        <li><span aria-hidden="true">01</span>Subí tu imagen</li>
        <li><span aria-hidden="true">02</span>Elegí tamaño y encuadre</li>
        <li><span aria-hidden="true">03</span>Ajustá los colores a tu gusto</li>
      </ol>
      <div className={styles.actions}>
        <Link href="/crear-cuadro" className={styles.primary}>Empezar mi cuadro<ArrowRight size={18} aria-hidden="true" /></Link>
        <Link href="/cuadros" className={styles.secondary}>Ver galería de diseños<ArrowUpRight size={17} aria-hidden="true" /></Link>
      </div>
      <p className={styles.previewNote}>Creador en prueba · Medidas, colores y precios orientativos. Sin cobros reales.</p>
    </div>
    <Link href="/crear-cuadro" className={styles.artScene} aria-label="Abrir el creador de cuadros">
      <span className={styles.artEyebrow}>De una idea a tu pared</span>
      {featured ? <>
        <MosaicSvg design={featured.design} label={`Mosaico de ejemplo: ${featured.title}`} className={styles.mainArt} />
        {companion && <MosaicSvg design={companion.design} label={`Mosaico de ejemplo: ${companion.title}`} className={styles.companionArt} />}
        <span className={styles.artCaption}>Diseños de ejemplo <ArrowUpRight size={18} aria-hidden="true" /></span>
      </> : <span className={styles.emptyArt}><ImagePlus size={54} aria-hidden="true" />Tu próxima creación empieza con una foto.</span>}
    </Link>
  </section>;
}
