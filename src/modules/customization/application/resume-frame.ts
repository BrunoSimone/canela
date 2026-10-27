import type { DesignTemplate } from './catalog';
import { resizeDesign, type WorkshopConfig, type MosaicDesign } from '../domain/design';

/** Only a definitively unsuccessful purchase may become a new editable design. */
export function resumeFrame(receipt: { status: string; design: MosaicDesign } | null, config: WorkshopConfig): DesignTemplate | null {
  if (receipt?.status !== 'not_completed') return null;
  try {
    return { id: 'previous-purchase', title: 'Tu diseño anterior', description: '', published: false, demonstration: false,
      design: resizeDesign(receipt.design, config, receipt.design.size) };
  } catch { return null; }
}
