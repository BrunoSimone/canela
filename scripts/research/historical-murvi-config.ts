import type { WorkshopConfig } from '../../src/modules/customization/domain/design';
import materials from '../../src/modules/customization/infrastructure/murvi-palette.json';
import { storefrontColorId } from '../../src/modules/customization/infrastructure/storefront-palette';

/** Frozen research baseline, not the live storefront's manufacturing selection. */
export function historicalMurviConfig(): WorkshopConfig {
  return {
    id:'canela-demo', version:'historical-murvi-62-20mm', provisional:true,
    tileMm:20, groutMm:1, frameMm:10, minCells:15, maxCells:45, step:1,
    backgroundColorId:storefrontColorId('murvi-b-34'),
    palette:materials.colors.map(c=>({id:storefrontColorId(c.id),name:c.code,hex:c.hex})),
  };
}
