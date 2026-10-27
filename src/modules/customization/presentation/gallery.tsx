import Link from "next/link";
import { ArrowUpRight, ImagePlus } from "lucide-react";
import type { DesignTemplate } from "../application/catalog";
import { cm, dimensions } from "../domain/design";
import { MosaicSvg } from "./mosaic-svg";
import styles from "./customization.module.css";

export function DemoNotice() {
  return <p className={styles.notice}><span className={styles.noticeDot} aria-hidden="true" />Versión de prueba · Medidas y precios de ejemplo. Colores orientativos. Sin cobros reales.</p>;
}

export function GalleryCards({ templates }: { templates: DesignTemplate[] }) {
  if (!templates.length) return <div className={styles.emptyGallery}><h2>No hay diseños disponibles</h2><p>Podés crear un cuadro subiendo tu imagen.</p><Link className={styles.primaryButton} href="/crear-cuadro">Crear mi cuadro</Link></div>;
  return <div className={styles.galleryGrid}>{templates.map((t, i) => {
    const { framedMm } = dimensions(t.design.config, t.design.size);
    return <article key={t.id} className={styles.galleryCard}>
      <Link href={`/crear-cuadro?diseno=${encodeURIComponent(t.id)}`} aria-label={`Crear uno similar a ${t.title}`} className={`${styles.artWall} ${styles[`wall${i % 3}`]}`}>
        <MosaicSvg design={t.design} label={`Mosaico ${t.title}`} className={styles.galleryArt} />
        {t.demonstration && <span className={styles.exampleTag}>Diseño de ejemplo</span>}
      </Link>
      <div className={styles.cardBody}><h2>{t.title}</h2><p>{t.description}</p>
        <p className={styles.cardMeasure}>{cm(framedMm)} × {cm(framedMm)} cm con marco · medida de prueba</p>
        <Link className={styles.textLink} href={`/crear-cuadro?diseno=${encodeURIComponent(t.id)}`}>Crear uno similar <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </div>
    </article>;
  })}</div>;
}

export function Gallery({ templates }: { templates: DesignTemplate[] }) {
  return <div className={styles.page}>
    <div className={styles.pageHeading}><div><Link href="/" className={styles.backLink}>Volver a la tienda</Link><h1>Galería de cuadros</h1><p>Seleccioná un diseño para editar su tamaño y sus colores en el creador.</p></div>
      <Link className={styles.primaryButton} href="/crear-cuadro"><ImagePlus size={19} aria-hidden="true" /> Usar mi imagen</Link></div>
    <DemoNotice /><GalleryCards templates={templates} />
    <div className={styles.galleryFooter}><h2>Crear un cuadro desde una imagen</h2><p>Podés subir una foto o una ilustración en formato JPG, PNG o WebP.</p><Link href="/crear-cuadro" className={styles.textLink}>Abrir el creador <ArrowUpRight size={18} aria-hidden="true" /></Link></div>
  </div>;
}
