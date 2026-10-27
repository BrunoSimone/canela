import { ArrowDownRight } from "lucide-react";
import { CATEGORIES } from "@/content/catalog";
import styles from "./home-discovery.module.css";

export function CatalogDiscovery() {
  return <section id="catalogo" className={`${styles.catalogIntro} anchor-offset`} aria-labelledby="catalog-title">
    <div><p className={styles.eyebrow}>Del taller a tu casa</p><h2 id="catalog-title">Encontrá tu próxima pieza</h2></div>
    <nav aria-label="Categorías de la tienda" className={styles.categoryLinks}>
      {CATEGORIES.map(category => <a key={category.id} href={`#${category.id}`}>{category.title}<ArrowDownRight size={17} aria-hidden="true" /></a>)}
    </nav>
  </section>;
}
