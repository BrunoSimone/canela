import { writeFile } from 'node:fs/promises';
import { demoWorkshop } from '../src/modules/customization/infrastructure/demo-workshop';
import { parseWorkshopDocument, type WorkshopDocument } from '../src/modules/customization/domain/workshop-document';
// Exports locally only. It never connects to Sanity or overwrites a published document.
async function main() {
const output=process.argv[2];
if(!output)throw Error('Indicá un archivo nuevo: pnpm cuadros:workshop-draft /tmp/cuadros-taller.ndjson');
const w=await demoWorkshop();
const document={_id:'drafts.frame-workshop',_type:'frameWorkshop',geometry:{...w.config,palette:undefined,id:undefined,version:undefined,provisional:undefined},
 colors:w.config.palette.map((c,i)=>({_key:`color${i}`,publicId:c.id,name:c.name,hex:c.hex,material:w.materials[c.id],enabled:true})),
 pricing:{tilePackArs:w.pricing.tilePackCents/100,tilePackQuantity:w.pricing.tilePackQuantity,roundToArs:w.pricing.roundToCents/100,sizes:w.pricing.sizes.map((s,i)=>({_key:`price${i}`,cells:s.cells,laborArs:s.laborCents/100,suppliesArs:s.suppliesCents/100}))},
 packages:w.packages.map((p,i)=>({_key:`package${i}`,...p})),capacity:w.capacity,productionDays:w.productionDays,termsText:w.terms.text,confirmations:w.confirmations};
parseWorkshopDocument({...document,_rev:'draft-validation'} as unknown as WorkshopDocument);
await writeFile(output,JSON.stringify(document)+'\n',{flag:'wx'});
console.log('Borrador local generado. Los importes y paquetes son de ensayo; todas las confirmaciones siguen pendientes.');

}
void main().catch(error=>{console.error(error instanceof Error?error.message:"QA setup failed");process.exitCode=1;});
