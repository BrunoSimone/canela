import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { renderStudySvg, type compare } from "./palette-study";

async function main() {
  const input = process.argv[2];
  if (!input) throw new Error("Indicá el JSON descargado desde Guardar resultados de la prueba.");
  const content = await readFile(input, "utf8");
  const report = JSON.parse(content) as { results: (ReturnType<typeof compare> & { theme: string; size: number; baselineMatches: boolean })[] };
  if (report.results.length !== 9 || report.results.some(r => !r.baselineMatches || !["mascota", "pareja", "familia"].includes(r.theme) || ![15,30,45].includes(r.size))) {
    throw new Error("La evidencia no contiene las nueve comparaciones verificadas.");
  }
  const dir = "output/cuadros-research/paleta-propuesta";
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/resultados.json`, content);
  const hashes: Record<string, string> = {};
  for (const row of report.results) for (const version of ["current", "proposed"] as const) for (const surface of ["flat", "material"] as const) {
    const name = `${row.theme}-${row.size}-${version}-${surface}.svg`;
    const svg = renderStudySvg(row[version], surface, "left", `${row.theme} · ${version} · ${surface}`);
    await writeFile(`${dir}/${name}`, svg);
    hashes[name] = createHash("sha256").update(svg).digest("hex");
  }
  await writeFile(`${dir}/hashes.json`, JSON.stringify(hashes, null, 2));
  console.log("Exportados 36 SVG y evidencia original de las nueve comparaciones.");
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
