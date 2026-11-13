import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createClient } from "@sanity/client";
const out = process.argv[2] ?? "output/catalog-migration";
async function main() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "2puxew6b",
    dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  const token =
    process.env.SANITY_INVENTORY_TOKEN || process.env.SANITY_FRAME_WRITE_TOKEN;
  if (!token) throw Error("Authenticated source access required");
  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2026-01-01",
    useCdn: false,
    token,
    perspective: "raw",
  });
  const docs = await client.fetch<Array<Record<string, unknown>>>(
    "*[] | order(_id asc)",
    {},
    { perspective: "raw", cache: "no-store" },
  );
  await mkdir(`${out}/originals`, { recursive: true, mode: 0o700 });
  const json = JSON.stringify(docs),
    digest = createHash("sha256").update(json).digest("hex");
  await writeFile(`${out}/source.json`, json, { mode: 0o600 });
  const assets = docs.filter((d) => d._type === "sanity.imageAsset");
  const files = [];
  for (const asset of assets) {
    if (
      typeof asset._id !== "string" ||
      !/^image-[a-f0-9]+-\d+x\d+-[a-z]+$/.test(asset._id) ||
      typeof asset.url !== "string"
    )
      throw Error("Invalid source image");
    const url = new URL(asset.url);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "cdn.sanity.io" ||
      !url.pathname.startsWith(`/images/${projectId}/${dataset}/`) ||
      url.search
    )
      throw Error("Unexpected source image URL");
    const path = `${out}/originals/${asset._id}`;
    let bytes: Buffer;
    try {
      bytes = await readFile(path);
      if (
        bytes.length !== asset.size ||
        createHash("sha1").update(bytes).digest("hex") !==
          String(asset._id).split("-")[1]
      )
        throw Error("refresh");
    } catch {
      url.searchParams.set(
        "dlRaw",
        String(asset.originalFilename ?? "original"),
      );
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        redirect: "error",
        signal: AbortSignal.timeout(60000),
      });
      if (!r.ok) throw Error("Source image download failed");
      if (Number(r.headers.get("content-length")) > 64 * 1024 * 1024)
        throw Error("Source image too large");
      bytes = Buffer.from(await r.arrayBuffer());
      await writeFile(path, bytes, { mode: 0o600 });
    }
    if (
      bytes.length !== asset.size ||
      createHash("sha1").update(bytes).digest("hex") !==
        String(asset._id).split("-")[1]
    )
      throw Error("Source image integrity mismatch");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    files.push({
      sourceId: asset._id,
      path: `originals/${asset._id}`,
      sha256,
      bytes: bytes.length,
      contentType: asset.mimeType,
    });
  }
  const counts = Object.fromEntries(
    [...new Set(docs.map((d) => String(d._type)))].map((t) => [
      t,
      docs.filter((d) => d._type === t).length,
    ]),
  );
  await writeFile(
    `${out}/export.json`,
    JSON.stringify(
      {
        projectId,
        dataset,
        at: new Date().toISOString(),
        digest,
        documents: docs.length,
        counts,
        files,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      documents: docs.length,
      counts,
      assets: files.length,
      bytes: files.reduce((n, f) => n + f.bytes, 0),
      digest,
      output: out,
    }),
  );
}
main().catch(() => {
  console.error("Catalog export failed; source left unchanged.");
  process.exitCode = 1;
});
