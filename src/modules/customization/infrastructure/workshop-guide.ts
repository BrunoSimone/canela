import { cm, dimensions, validateDesign } from '../domain/design';
import type { FrameSnapshot } from '../domain/frame-order';
const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function renderWorkshopGuide(orderId:string,snapshot:FrameSnapshot,test:boolean):string {
  const {design,materials}=snapshot;validateDesign(design);
  const used=design.config.palette.filter(c=>design.cells.includes(c.id));
  const numbers=new Map(used.map((c,i)=>[c.id,i+1]));
  const legend=used.map(c=>`<tr><td>${numbers.get(c.id)}</td><td><span style="background:${c.hex}"></span>${escape(c.name)}</td><td>${escape(materials[c.id])}</td><td>${design.cells.filter(id=>id===c.id).length}</td></tr>`).join('');
  const sections:string[]=[];
  for(let y=0;y<design.size;y+=15)for(let x=0;x<design.size;x+=15){
    let grid='<tr><th>Fila / Col.</th>';
    for(let c=x;c<Math.min(x+15,design.size);c++)grid+=`<th>${c+1}</th>`;
    grid+='</tr>';
    for(let r=y;r<Math.min(y+15,design.size);r++){
      grid+=`<tr><th>${r+1}</th>`;
      for(let c=x;c<Math.min(x+15,design.size);c++){
        const id=design.cells[r*design.size+c],color=used.find(p=>p.id===id)!;
        grid+=`<td data-cell="${r},${c}" style="background:${color.hex}"><b>${numbers.get(id)}</b></td>`;
      }
      grid+='</tr>';
    }
    sections.push(`<section class="sheet"><h2>${escape(orderId.slice(0,8).toUpperCase())} · ${test?'PRUEBA · ':''}Filas ${y+1}–${Math.min(y+15,design.size)}, columnas ${x+1}–${Math.min(x+15,design.size)}</h2><p>Vista de frente. Arriba del cuadro ↑. Cada número corresponde a la leyenda de materiales.</p><table class="grid">${grid}</table></section>`);
  }
  const svg=design.cells.map((id,i)=>`<rect x="${i%design.size}" y="${Math.floor(i/design.size)}" width="1" height="1" fill="${used.find(c=>c.id===id)!.hex}"/>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Guía de armado · ${escape(orderId.slice(0,8))}</title><style>body{font:15px Arial,sans-serif;color:#352b23;margin:32px auto;max-width:960px;padding:0 18px}h1{font-size:28px}h2{font-size:19px}.preview{width:260px;max-width:100%;border:8px solid #543d2b}table{border-collapse:collapse;width:100%;margin:20px 0}th,td{border:1px solid #ccc;padding:8px;text-align:left}.legend span{display:inline-block;width:16px;height:16px;margin-right:8px;border:1px solid #888}.grid{table-layout:fixed}.grid td{text-align:center;padding:8px 0}.grid b{background:white;color:black;font-size:11px;border-radius:3px;padding:1px 3px}.grid th{font-size:10px;padding:4px}.sheet{margin-top:40px}.test{padding:14px;background:#f6e4bd;font-weight:bold}@page{size:A4;margin:12mm}@media print{body{margin:0;padding:0;font-size:11pt}.screen{display:none}.sheet{break-before:page;margin:0}.grid{print-color-adjust:exact;-webkit-print-color-adjust:exact}.grid td{height:7mm}.legend tr{break-inside:avoid}}</style></head><body><h1>Guía de armado · ${escape(orderId.slice(0,8).toUpperCase())}</h1>${test?'<p class="test">PRUEBA — No fabricar ni despachar.</p>':''}<p class="screen">Guía exclusiva del taller. Para guardar un PDF o imprimir usá Imprimir en tu navegador.</p><svg class="preview" viewBox="0 0 ${design.size} ${design.size}" role="img" aria-label="Diseño aceptado">${svg}</svg><p>${design.size} × ${design.size} venecitas enteras · ${design.cells.length} piezas<br>Exterior con marco: ${cm(dimensions(design.config,design.size).framedMm)} cm por lado.<br>Venecita ${design.config.tileMm} mm · junta ${design.config.groutMm} mm · marco ${design.config.frameMm} mm por lado.</p><p>Configuración ${escape(design.config.version)} · Algoritmo ${escape(design.algorithm)}.<br>Diseño aceptado el ${escape(snapshot.acceptance.at)}. Los números y materiales corresponden al pedido guardado, sin sustituir colores.</p><h2>Leyenda de materiales</h2><table class="legend"><tr><th>Número</th><th>Color</th><th>Referencia del taller</th><th>Cantidad</th></tr>${legend}</table>${sections.join('')}</body></html>`;
}
