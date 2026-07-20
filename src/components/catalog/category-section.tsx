import { urlFor } from "@/sanity/client";
import type { CategoryMeta } from "@/content/catalog";
import type { Product } from "@/lib/types";
import { CatalogGrid } from "@/components/catalog/catalog-grid";
import type { CardProduct } from "@/components/catalog/product-card";

const PLACEHOLDER_PATTERN: Record<string, string> = {
  vidrio: "repeating-linear-gradient(135deg,#EFE4CE 0 13px,#E8D9BC 13px 26px)",
  ceramica: "repeating-linear-gradient(135deg,#EDE6D2 0 13px,#E3D6BC 13px 26px)",
  espejos: "repeating-linear-gradient(135deg,#EAE1CC 0 13px,#DFD0B2 13px 26px)",
};

export function CategorySection({
  meta,
  products,
}: {
  meta: CategoryMeta;
  products: Product[];
}) {
  const pattern = PLACEHOLDER_PATTERN[meta.key] ?? PLACEHOLDER_PATTERN.vidrio;

  const cards: CardProduct[] = products.map((p) => ({
    id: p._id,
    name: p.name,
    price: p.price,
    sub: p.sub,
    tone: p.tone,
    statusNote: p.statusNote,
    imageUrls: (p.images ?? []).map((img) => urlFor(img).width(1400).url()),
    imgLabel: p.imgLabel,
    placeholderPattern: pattern,
  }));

  return (
    <section id={meta.id} className="anchor-offset mx-auto max-w-[1180px] px-[22px] py-8">
      <div className="mb-6 border-b border-[rgba(184,132,42,.22)] pb-4">
        <h2 className="m-0 font-heading text-[clamp(34px,5vw,50px)] font-normal text-[var(--canela-brown)]">
          {meta.title}
        </h2>
        <p className="mt-1.5 text-[15px] text-[var(--canela-muted-foreground,#6E4E38)] text-[#6E4E38]">
          {meta.description}
        </p>
      </div>
      <CatalogGrid subs={meta.subs} products={cards} />
    </section>
  );
}
