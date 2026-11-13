import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { demoDesignCatalog } from '../../src/modules/customization/infrastructure/demo-catalog';
import { loadLocalImage } from '../../src/modules/customization/presentation/local-image';
import { MosaicSvg } from '../../src/modules/customization/presentation/mosaic-svg';
import { type MosaicDesign } from '../../src/modules/customization/domain/design';
import { generateVariants, VARIANTS, STUDY_VERSION, variantCaption, type StudyResult } from './format-study';

type Input = { theme:string; title:string; image:string; sha256:string; previous:Record<string,string> };
type Result = { theme:string; title:string; sourceHash:string; previousMatches:boolean; variants:StudyResult[] };
const inputs:Input[]=JSON.parse(document.getElementById('inputs')!.textContent!);
const results:Result[]=[];
const $=(id:string)=>document.getElementById(id)!;
const images=new Map<string,string>();
function svg(design:MosaicDesign,label:string) {return renderToStaticMarkup(createElement(MosaicSvg,{design,label}));}
function image(key:string,design:MosaicDesign,label:string) {
  if(!images.has(key)) images.set(key,URL.createObjectURL(new Blob([svg(design,label)],{type:'image/svg+xml'})));
  return images.get(key)!;
}
function render() {
  $('cases').innerHTML=results.map(r=>{
    const input=inputs.find(i=>i.theme===r.theme)!;
    return `<section><header class="case-head"><img class="original-thumb" src="${input.image}" alt="Foto original de ${r.title.toLowerCase()}"><div><h2>${r.title}</h2><details><summary>Ver foto original</summary><img class="original-full" src="${input.image}" alt="Foto original ampliada"></details></div></header><div class="formats">${(['large','small'] as const).map(format=>`<div class="format"><h3>${format==='large'?'Venecitas 2 × 2 cm':'Venecitas 1,1 × 1,1 cm'}</h3><p>${format==='large'?'Formato 2×2 · paleta anterior: 62 colores':'Formato 1×1 · medida real usada: 1,1 cm · Clásica: 36 colores'}</p><div class="pair">${VARIANTS.filter(v=>v.format===format).map(variant=>{
      const v=r.variants.find(v=>v.id===variant.id)!;
      return `<figure><figcaption><strong>Grilla ${v.size} × ${v.size}</strong><span>Venecita ${variant.tileLabel}</span><small>${variantCaption(variant,v.design).split(' · ').at(-1)} · ${(v.size*v.size).toLocaleString('es-AR')} piezas</small></figcaption><button class="preview" data-theme="${r.theme}" data-variant="${v.id}" aria-label="Ampliar ${r.title.toLowerCase()}, venecita ${variant.tileLabel}, grilla ${v.size} por ${v.size}"><img src="${image(r.theme+'-'+v.id,v.design,r.title)}" alt="${r.title}: ${variantCaption(variant,v.design)}"></button></figure>`;
    }).join('')}</div></div>`).join('')}</div></section>`;
  }).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b=>b.addEventListener('click',()=>{
    const r=results.find(r=>r.theme===b.dataset.theme)!,v=r.variants.find(v=>v.id===b.dataset.variant)!,variant=VARIANTS.find(d=>d.id===v.id)!;
    $('detail-title').textContent=`${r.title} · ${variantCaption(variant,v.design)}`;
    ($('detail-image') as HTMLImageElement).src=image(r.theme+'-'+v.id,v.design,r.title);
    ($('detail') as HTMLDialogElement).showModal();
  }));
  $('status').textContent='Las tres fotos están listas con las cuatro combinaciones. Tocá cualquier cuadro para ampliarlo.';
}
async function main() {
  const config=await demoDesignCatalog.configuration();
  for(const input of inputs) {
    const blob=await(await fetch(input.image)).blob();
    const local=await loadLocalImage(new File([blob],`${input.theme}.png`,{type:'image/png'}));
    try {
      const variants=generateVariants(local.raster,config);
      const previousMatches=variants.filter(v=>v.id.startsWith('2cm-')).every(v=>{
        const xml=new DOMParser().parseFromString(input.previous[String(v.size)],'image/svg+xml');
        return xml.querySelectorAll('g rect').length===v.size**2&&[...xml.querySelectorAll('g rect')].every((rect,i)=>rect.getAttribute('fill')===v.design.config.palette.find(c=>c.id===v.design.cells[i])!.hex);
      });
      if(!previousMatches) throw Error('No coincide el ensayo anterior de '+input.theme);
      results.push({theme:input.theme,title:input.title,sourceHash:input.sha256,previousMatches,variants});
    } finally {URL.revokeObjectURL(local.url);}
  }
  $('close-detail').addEventListener('click',()=>($('detail') as HTMLDialogElement).close());
  $('export').addEventListener('click',()=>{
    const href=URL.createObjectURL(new Blob([JSON.stringify({version:STUDY_VERSION,date:'2026-10-30',results})],{type:'application/json'}));
    const a=document.createElement('a');a.href=href;a.download='formato-cuatro-comparaciones.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
  });
  ($('export') as HTMLButtonElement).disabled=false;render();
}
main().catch(e=>{$('status').textContent=e.message;$('status').setAttribute('role','alert');});
