import { demoDesignCatalog } from "../../src/modules/customization/infrastructure/demo-catalog";
import { loadLocalImage } from "../../src/modules/customization/presentation/local-image";
import { additions, candidateSource, compare, renderStudySvg, type Surface } from "./palette-study";

type Input = { theme: string; title: string; image: string; sha256: string; previous: Record<string, string> };
const inputs: Input[] = JSON.parse(document.getElementById("inputs")!.textContent!);
type Result = ReturnType<typeof compare> & { theme: string; title: string; size: number; sourceHash: string; baselineMatches: boolean; elapsedMs: number };
const results: Result[] = [];
let size = 45, surface: Surface = "flat", light: "left" | "right" = "left";
const $ = (selector: string) => document.querySelector(selector)!;
const number = (n: number, digits = 1) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: digits }).format(n);
const dialog = $("dialog") as HTMLDialogElement;
let selected: { theme: string; version: "current" | "proposed" } | null = null;

function geometry(svg: string, selector: string) {
  const xml = new DOMParser().parseFromString(svg, "image/svg+xml");
  return [...xml.querySelectorAll(selector)].map(r => ["x", "y", "width", "height", "fill"].map(a => r.getAttribute(a)).join("|")).join(";");
}
function save(name: string, text: string) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  link.download = name; link.href = url; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function openDetail(theme: string, version: "current" | "proposed") {
  selected = { theme, version };
  const result = results.find(r => r.theme === theme && r.size === size)!;
  $("#detail-title").textContent = `${result.title} · ${version === "current" ? "Murvi actual" : "Paleta ampliada"} · ${size} × ${size}`;
  $("#detail-image").innerHTML = renderStudySvg(result[version], surface, light);
  ($("#zoom") as HTMLSelectElement).value = "1";
  ($("#detail-image") as HTMLElement).style.width = "100%";
  if (!dialog.open) dialog.showModal();
}
function render() {
  document.querySelectorAll<HTMLButtonElement>("[data-size]").forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.size) === size)));
  document.querySelectorAll<HTMLButtonElement>("[data-surface]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.surface === surface)));
  ($("#light") as HTMLSelectElement).disabled = surface === "flat";
  $("#view-note").textContent = surface === "flat"
    ? "Vista plana: permite comparar los colores sin el efecto de la iluminación."
    : "Material simulado: bisel, grano y reflejos genéricos. Misma matriz; no reproduce la transparencia de Vitro ni un acabado medido.";
  $("#cases").innerHTML = inputs.map(input => {
    const r = results.find(r => r.theme === input.theme && r.size === size)!;
    return `<section class="case"><div class="case-heading"><img class="original" src="${input.image}" alt="Foto original de ${input.title.toLowerCase()}"><div><h2>${input.title}</h2><p>${size} × ${size} · ${number(size*size,0)} piezas</p><details><summary>Ver foto original</summary><img class="original-full" src="${input.image}" alt="Foto original ampliada"></details></div></div><div class="pair">${(["current", "proposed"] as const).map(version => `<figure><figcaption><strong>${version === "current" ? "Murvi actual" : "Murvi + 7 tonos de prueba"}</strong><span>${version === "current" ? "62 referencias digitales" : "69 colores · hipótesis, sin confirmar materiales"}</span></figcaption><button class="mosaic" data-theme="${r.theme}" data-version="${version}" aria-label="Ampliar ${r.title.toLowerCase()} con ${version === "current" ? "Murvi actual" : "paleta ampliada"}">${renderStudySvg(r[version], surface, light, `${r.title}, ${version === "current" ? "Murvi" : "ampliada"}`)}</button><p class="metric">Error de color digital: <strong>${number(version === "current" ? r.beforeError : r.afterError,2)}</strong></p></figure>`).join("")}</div><div class="case-result"><p><strong>${number(r.reduction)}% menos error de cuantización</strong> en este ensayo. Cambian ${number(r.changed,0)} piezas.</p><p class="small">Este porcentaje compara distancias OKLab entre colores digitales. No significa ${number(r.reduction)}% más parecido físico.</p></div><details class="usage"><summary>Qué tonos nuevos se usaron</summary><div class="usage-grid">${r.used.map(c => `<div><i style="background:${c.hex}"></i><span>${c.name}</span><strong>${c.count}</strong></div>`).join("")}</div></details></section>`;
  }).join("");
  document.querySelectorAll<HTMLButtonElement>(".mosaic").forEach(b => b.addEventListener("click", () => openDetail(b.dataset.theme!, b.dataset.version as "current" | "proposed")));
  $("#status").textContent = `Comparación lista · ${size} × ${size} · ${surface === "flat" ? "vista plana" : "material simulado"}`;
  if (dialog.open && selected) openDetail(selected.theme, selected.version);
}

async function main() {
  const base = await demoDesignCatalog.configuration();
  for (const input of inputs) {
    const blob = await (await fetch(input.image)).blob();
    const local = await loadLocalImage(new File([blob], `${input.theme}.png`, { type: "image/png" }));
    try {
      for (const n of [15, 30, 45]) {
        const start = performance.now(), result = compare(local.raster, base, n);
        const actual = renderStudySvg(result.current, "flat");
        const baselineMatches = geometry(actual, "[data-cell]") === geometry(input.previous[String(n)], "g rect");
        if (!baselineMatches) throw new Error(`La referencia anterior no coincide: ${input.theme} ${n}. No usar esta comparación.`);
        if (result.afterError > result.beforeError + 1e-10) throw new Error("La ampliación produjo una distancia inconsistente.");
        results.push({ ...result, theme: input.theme, title: input.title, size: n, sourceHash: input.sha256, baselineMatches, elapsedMs: performance.now() - start });
      }
    } finally { URL.revokeObjectURL(local.url); }
  }
  $("#swatches").innerHTML = additions.map(c => `<div class="swatch"><i style="background:${c.hex}"></i><strong>${c.name}</strong><span>${c.hex}</span><small>Candidato a comparar: ${c.candidate}</small></div>`).join("");
  ($("#supplier") as HTMLAnchorElement).href = candidateSource;
  document.querySelectorAll<HTMLButtonElement>("[data-size]").forEach(b => b.addEventListener("click", () => { size = Number(b.dataset.size); render(); }));
  document.querySelectorAll<HTMLButtonElement>("[data-surface]").forEach(b => b.addEventListener("click", () => { surface = b.dataset.surface as Surface; render(); }));
  $("#light").addEventListener("change", e => { light = (e.target as HTMLSelectElement).value as "left" | "right"; render(); });
  $("#close-detail").addEventListener("click", () => dialog.close());
  $("#zoom").addEventListener("change", e => { ($("#detail-image") as HTMLElement).style.width = `${Number((e.target as HTMLSelectElement).value) * 100}%`; });
  $("#save-results").addEventListener("click", () => save("paleta-propuesta-resultados.json", JSON.stringify({ date: "2026-10-27", algorithm: "mosaic-oklab-v1", additions, hypothesis: true, results }, null, 2)));
  $("#evidence").textContent = JSON.stringify(results.map(({theme,size,sourceHash,baselineMatches,beforeError,afterError,reduction,changed,used,elapsedMs}) => ({theme,size,sourceHash,baselineMatches,beforeError,afterError,reduction,changed,used,elapsedMs})), null, 2);
  $("#loading")!.remove();
  render();
}
main().catch(e => { $("#loading").textContent = `No se completó la prueba: ${e.message}`; $("#loading").setAttribute("role", "alert"); console.error(e); });
