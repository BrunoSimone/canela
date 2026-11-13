import { readFile, writeFile } from "node:fs/promises";
import { createDatabaseClient } from "../src/db/client";
import {
  databaseProducts,
  databaseSlides,
} from "../src/modules/catalog/infrastructure/postgres/readers";
import { planCatalogImport } from "../src/modules/catalog/migration/import-catalog";
import { CatalogRepository } from "../src/modules/catalog/infrastructure/postgres/catalog-repository";
async function main() {
  const url = process.env.CATALOG_IMPORT_DATABASE_URL;
  if (!url) throw Error("Explicit database required");
  const local = ["localhost", "127.0.0.1"].includes(new URL(url).hostname);
  if (!local && process.env.SITE_MAINTENANCE_MODE !== "1")
    throw Error("Maintenance required for production verification");
  const sql = createDatabaseClient(url);
  try {
    const source = JSON.parse(
        await readFile("output/catalog-migration/source.json", "utf8"),
      ),
      media = JSON.parse(
        await readFile("output/catalog-migration/media.json", "utf8"),
      );
    const plan = planCatalogImport(source, media),
      repo = new CatalogRepository(sql),
      products = await databaseProducts(sql),
      slides = await databaseSlides(sql);
    for (const entry of plan.entries) {
      const actual = await repo.get(entry.id);
      if (JSON.stringify(actual?.draft) !== JSON.stringify(entry.draft)) {
        if (
          JSON.stringify(sort(actual?.draft)) !==
          JSON.stringify(sort(entry.draft))
        )
          throw Error(`Draft mismatch ${entry.id}`);
      }
      if (
        JSON.stringify(sort(actual?.published)) !==
        JSON.stringify(sort(entry.published))
      )
        throw Error(`Published mismatch ${entry.id}`);
    }
    const expectedProducts = plan.entries.filter(
        (e) => e.kind === "product" && e.published,
      ),
      expectedSlides = plan.entries.filter(
        (e) => e.kind === "slide" && e.published,
      );
    if (
      products.length !== expectedProducts.length ||
      slides.length !== expectedSlides.length
    )
      throw Error("Published totals mismatch");
    const photographs = products.flatMap((p) => p.images ?? []),
      all = [
        ...photographs,
        ...slides.flatMap((s) => (s.image ? [s.image] : [])),
      ];
    if (
      all.some(
        (i) =>
          !i ||
          typeof i !== "object" ||
          !("url" in i) ||
          typeof i.url !== "string" ||
          !i.url.includes("/web/images/"),
      )
    )
      throw Error("Unmigrated public image");
    const expectedPhotos = plan.entries.flatMap((e) =>
      e.published
        ? [
            ...(e.published.images ?? []),
            ...(e.published.image ? [e.published.image] : []),
          ]
        : [],
    ).length;
    if (all.length !== expectedPhotos)
      throw Error(`Photo count mismatch: ${all.length}/${expectedPhotos}`);
    if (
      JSON.stringify({ products, slides }).includes("/original.") ||
      JSON.stringify({ products, slides }).includes("originalBucket")
    )
      throw Error("Private metadata leaked");
    const report = {
      entries: plan.entries.length,
      products: products.length,
      slides: slides.length,
      publicImages: all.length,
      draftsAndSnapshotsEqual: true,
      allImagesUsePublicDerivatives: true,
      checkedAt: new Date().toISOString(),
    };
    await writeFile(
      `output/catalog-migration/${local ? "stage" : "production"}-verification.json`,
      JSON.stringify(report, null, 2),
    );
    console.log(report);
  } finally {
    await sql.end();
  }
}
function sort(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sort);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sort(v)]),
    );
  return value;
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
