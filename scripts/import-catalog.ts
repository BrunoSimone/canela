import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import {
  sha256,
  type StoredImage,
} from "../src/modules/media/domain/image-asset";
import { createDatabaseClient } from "../src/db/client";
import { runMigrations } from "../src/db/migrate";
import {
  importCatalog,
  planCatalogImport,
} from "../src/modules/catalog/migration/import-catalog";
import { MediaRepository } from "../src/modules/media/infrastructure/media-repository";
import { NeonImageStore } from "../src/modules/media/infrastructure/neon-image-store";
async function main() {
  const dir = resolve(process.argv[2] ?? "output/catalog-migration"),
    url = process.env.CATALOG_IMPORT_DATABASE_URL;
  if (!url)
    throw Error(
      "CATALOG_IMPORT_DATABASE_URL required; never default to the application database",
    );
  const local = ["localhost", "127.0.0.1"].includes(new URL(url).hostname);
  if (
    !local &&
    (process.env.SITE_MAINTENANCE_MODE !== "1" ||
      process.env.CHECKOUT_MODE !== "disabled" ||
      process.env.CATALOG_SOURCE === "database")
  )
    throw Error(
      "Import requires maintenance, disabled checkout and previous source",
    );
  const sourceFile = await readFile(join(dir, "source.json")),
    exp = JSON.parse(await readFile(join(dir, "export.json"), "utf8"));
  if (sha256(sourceFile) !== exp.digest)
    throw Error("Source export checksum mismatch");
  const source = JSON.parse(sourceFile.toString()),
    media = JSON.parse(
      await readFile(join(dir, "media.json"), "utf8"),
    ) as Record<string, StoredImage>;
  if (Object.keys(media).length !== exp.files.length)
    throw Error("Media migration is incomplete");
  const sql = createDatabaseClient(url),
    store = new NeonImageStore();
  try {
    await runMigrations(sql);
    const report = await importCatalog(sql, source, media, "migration-cat154");
    const repository = new MediaRepository(sql),
      plan = planCatalogImport(source, media);
    for (const entry of plan.entries) {
      await repository.prepare(entry.draft, store);
      if (entry.published) await repository.prepare(entry.published, store);
    }
    const [counts] =
      await sql`SELECT count(*)::int AS entries,count(*) FILTER(WHERE published IS NOT NULL)::int AS published FROM catalog_entry WHERE id IN ${sql(plan.entries.map((e) => e.id))}`;
    if (
      counts.entries !== plan.entries.length ||
      counts.published !== plan.entries.filter((e) => e.published).length
    )
      throw Error("Catalogue count mismatch");
    await writeFile(
      join(dir, local ? "stage-import.json" : "production-import.json"),
      JSON.stringify(
        {
          ...report,
          target: local ? "local-stage" : "production",
          at: new Date().toISOString(),
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    console.log(
      JSON.stringify({
        entries: report.entries,
        published: report.published,
        assets: report.assets,
        stockUnits: report.stockUnits,
        pending: report.pending.length,
        reused: report.reused,
        target: local ? "local-stage" : "production",
      }),
    );
  } finally {
    store.close();
    await sql.end();
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Import failed");
  process.exitCode = 1;
});
