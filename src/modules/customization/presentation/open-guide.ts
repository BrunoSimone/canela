import { guideHtml } from "../domain/guide";
import type { MosaicDesign } from "../domain/design";

export function openGuide(design: MosaicDesign): void {
  const url = URL.createObjectURL(new Blob([guideHtml(design)], { type: "text/html;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.target = "_blank"; anchor.rel = "noopener noreferrer";
  document.body.append(anchor); anchor.click(); anchor.remove();
  // Keep the local resource alive long enough for the new tab to read it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
