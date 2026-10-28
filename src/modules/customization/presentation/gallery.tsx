import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Hero, type HeroSlideView } from "@/components/home/hero";
import type { DesignTemplate } from "../application/catalog";
import { cm, dimensions } from "../domain/design";
import { MosaicSvg } from "./mosaic-svg";
import styles from "./customization.module.css";

export function GalleryCards({ templates }: { templates: DesignTemplate[] }) {
  if (!templates.length) return <div className={styles.emptyGallery}><h2>No hay diseños disponibles</h2><p>Podés crear un cuadro subiendo tu imagen.</p><Link className={styles.primaryButton} href="/crear-cuadro">Crear mi cuadro</Link></div>;
  return <div className={styles.galleryGrid}>{templates.map((t, i) => {
    const { framedMm } = dimensions(t.design.config, t.design.size);
    return <article key={t.id} className={styles.galleryCard}>
      <Link href={`/crear-cuadro?diseno=${encodeURIComponent(t.id)}`} aria-label={`Crear uno similar a ${t.title}`} className={`${styles.artWall} ${styles[`wall${i % 3}`]}`}>
        <MosaicSvg design={t.design} label={`Mosaico ${t.title}`} className={styles.galleryArt} />
      </Link>
      <div className={styles.cardBody}><h2>{t.title}</h2><p>{t.description}</p>
        <p className={styles.cardMeasure}>{cm(framedMm)} × {cm(framedMm)} cm con marco{t.design.config.provisional?" · medidas orientativas":""}</p>
        <Link className={styles.textLink} href={`/crear-cuadro?diseno=${encodeURIComponent(t.id)}`}>Crear uno similar <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </div>
    </article>;
  })}</div>;
}

export function Gallery({ templates }: { templates: DesignTemplate[] }) {
  const slides: HeroSlideView[] = templates.map((template, index) => ({
    name: template.title,
    caption: "Cuadro en venecitas",
    href: `/crear-cuadro?diseno=${encodeURIComponent(template.id)}`,
    imageUrl: null,
    artwork: <MosaicSvg design={template.design} label={`Cuadro ${template.title}`} />,
    tint: ["#e4e7dc", "#eaded5", "#dfe6e3"][index % 3],
  }));
  return <>
    <Hero slides={slides} title="Galería de cuadros"
      description="Elegí el diseño que más te guste y probá distintos tamaños y colores."
      action={{ href: "#disenos", label: "Ver diseños" }}
      secondaryAction={{ href: "/crear-cuadro", label: "Crear mi diseño" }} slideNoun="cuadro" />
    <div className={styles.page}>
      <section id="disenos" className="anchor-offset" aria-label="Diseños de cuadros">
        <GalleryCards templates={templates} />
      </section>
      <div className={styles.galleryFooter}><h2>También podés usar tu propia foto</h2><p>Subila al creador y probá cómo quedaría en venecitas.</p><Link href="/crear-cuadro" className={styles.textLink}>Crear con mi foto <ArrowUpRight size={18} aria-hidden="true" /></Link></div>
    </div>
  </>;
}
