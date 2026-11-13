import { readFile, writeFile, rename } from "node:fs/promises";
import { resolve, join } from "node:path";
import { NeonImageStore } from "../src/modules/media/infrastructure/neon-image-store";
import { prepareImportedImage } from "../src/modules/media/infrastructure/prepare-image";
import { storeImage } from "../src/modules/media/application/store-image";
import {
  sha256,
  type StoredImage,
} from "../src/modules/media/domain/image-asset";
const directory = resolve(process.argv[2] ?? "output/catalog-migration");
async function main() {
  const source = JSON.parse(
    await readFile(join(directory, "export.json"), "utf8"),
  );
  const manifest: Record<string, StoredImage> = {};
  try {
    Object.assign(
      manifest,
      JSON.parse(await readFile(join(directory, "media.json"), "utf8")),
    );
  } catch {}
  const store = new NeonImageStore();
  let write = Promise.resolve(),
    stopped = false,
    index = 0,
    completed = Object.keys(manifest).length;
  try {
    const results = await Promise.allSettled(
      Array.from({ length: 2 }, async () => {
        while (!stopped && index < source.files.length) {
          const file = source.files[index++];
          if (manifest[file.sourceId]) continue;
          const path = resolve(directory, file.path);
          if (!path.startsWith(directory + "/originals/"))
            throw Error("Invalid source path");
          const bytes = await readFile(path);
          if (sha256(bytes) !== file.sha256)
            throw Error("Source checksum mismatch");
          let asset: StoredImage;
          try {
            asset = await storeImage(
              store,
              await prepareImportedImage(bytes, file.contentType),
            );
          } catch (error) {
            stopped = true;
            throw new Error(
              `Asset ${file.sourceId}: ${error instanceof Error ? error.message : "conversion failed"}`,
            );
          }
          manifest[file.sourceId] = asset;
          write = write.then(async () => {
            await writeFile(
              join(directory, "media.pending.json"),
              JSON.stringify(manifest, null, 2),
              { mode: 0o600 },
            );
            await rename(
              join(directory, "media.pending.json"),
              join(directory, "media.json"),
            );
          });
          await write;
          completed++;
          if (completed % 10 === 0)
            console.log(`Verified media: ${completed}/${source.files.length}`);
        }
      }),
    );
    await write;
    const failure = results.find((r) => r.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    console.log(
      JSON.stringify({
        assets: Object.keys(manifest).length,
        originalBytes: Object.values(manifest).reduce(
          (n, m) => n + m.original.size,
          0,
        ),
        webBytes: Object.values(manifest).reduce((n, m) => n + m.web.size, 0),
        file: join(directory, "media.json"),
      }),
    );
  } finally {
    store.close();
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Media migration failed");
  process.exitCode = 1;
});
