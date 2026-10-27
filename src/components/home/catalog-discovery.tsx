import { ArrowDownRight } from "lucide-react";
import { CATEGORIES } from "@/content/catalog";
import styles from "./home-discovery.module.css";

export function CatalogDiscovery() {
  return <section id="catalogo" className={`${styles.catalogIntro} anchor-offset`} aria-labelledby="catalog-title">
    <h2 id="catalog-title">Catálogo</h2>
    <nav aria-label="Categorías de la tienda" className={styles.categoryLinks}>
      {CATEGORIES.map(category => <a key={category.id} href={`#${category.id}`}>{category.title}<ArrowDownRight size={17} aria-hidden="true" /></a>)}
    </nav>
  </section>;
}
