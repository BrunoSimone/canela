import type { FrameWorkshop } from '../domain/workshop';
import { dimensions } from '../domain/design';
import { demoDesignCatalog } from './demo-catalog';
import { workshopMaterials } from './storefront-palette';
import { demoPurchasePolicy } from './demo-purchase-config';
export async function demoWorkshop(): Promise<FrameWorkshop> {
  const config=await demoDesignCatalog.configuration();
  return {config,pricing:await demoDesignCatalog.pricing(),materials:workshopMaterials,
    packages:demoPurchasePolicy.packages.map(p=>({maxCells:p.maxCells,weightGrams:p.weightGrams,
      widthCm:Math.ceil(dimensions(config,p.maxCells).framedMm/10)+4,
      lengthCm:Math.ceil(dimensions(config,p.maxCells).framedMm/10)+4,heightCm:8,classificationId:'6'})),
    capacity:5,productionDays:7,terms:{version:'preview-1',text:'Acepto el diseño mostrado. Los colores y el acabado pueden variar en el cuadro artesanal. Esta compra sandbox no encarga una pieza real.'},
    confirmations:{geometry:false,palette:false,pricing:false,packaging:false,production:false,terms:false}};
}
