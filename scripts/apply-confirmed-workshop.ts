import { createDatabaseClient } from "../src/db/client";
import { PostgresWorkshopRepository } from "../src/modules/customization/infrastructure/postgres/workshop-repository";
import { applyConfirmedChoices } from "../src/modules/customization/domain/confirmed-choices";
import { mkdir, writeFile } from "node:fs/promises";

import { storefrontPalette } from "../src/modules/customization/infrastructure/storefront-palette";

async function main() {
  const url = process.env.CATALOG_IMPORT_DATABASE_URL;
  if (!url || process.env.SITE_MAINTENANCE_MODE !== "1")
    throw Error("Explicit database and maintenance required");
  const sql = createDatabaseClient(url);
  try {
    const repository = new PostgresWorkshopRepository(sql, "production");
    const current = await repository.settings();
    const draft = applyConfirmedChoices(current.document, new Set(storefrontPalette.map(color => color.id)));
    if (JSON.stringify(draft) === JSON.stringify(current.document)) {
      console.log("Confirmed choices already applied");
      return;
    }
    await mkdir('output/workshop-backups', { recursive:true, mode:0o700 });
    await writeFile(`output/workshop-backups/before-per155-v${current.version}-${Date.now()}.json`,
      JSON.stringify(current), { flag:'wx', mode:0o600 });
    const saved = await repository.save(
      current.version,
      draft,
      "save",
      "format-per155",
    );
    if (saved.publishedVersion !== current.publishedVersion)
      throw Error("Published workshop changed unexpectedly");
    console.log(
      JSON.stringify({
        version: saved.version,
        publishedVersion: saved.publishedVersion,
        enabledColors: saved.document.colors.filter(color => color.enabled).length,
        geometry: Object.fromEntries(["tileMm","groutMm","frameMm","minCells","maxCells","step"].map(key => [key,saved.document.geometry[key as keyof typeof saved.document.geometry]])),
        geometryConfirmed: false,
        productionDays: null,
        capacity: null,
      }),
    );
  } finally {
    await sql.end();
  }
}
main().catch(() => {
  console.error(
    "Could not update confirmed choices; review the draft version.",
  );
  process.exitCode = 1;
});
