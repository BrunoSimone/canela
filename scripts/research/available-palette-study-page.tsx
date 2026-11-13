import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { demoDesignCatalog } from '../../src/modules/customization/infrastructure/demo-catalog';
import { loadLocalImage } from '../../src/modules/customization/presentation/local-image';
import { MosaicSvg } from '../../src/modules/customization/presentation/mosaic-svg';
import type { MosaicDesign } from '../../src/modules/customization/domain/design';
import { availableMaterials,availableConfig,availableCaption,generateAvailability,studyCrop,AVAILABILITY_VERSION,type AvailableResult } from './available-palette-study';
import type { StudyFraming } from './available-study-cases';

type Input={theme:string;title:string;image:string;sha256:string;previous:Record<string,string[]>|null;caseSet?:string;mime:string;fileName:string;photographer?:string;sourcePage?:string;sourceLabel?:string;licenseUrl?:string;framing?:StudyFraming};
type Result={theme:string;title:string;sourceHash:string;previousMatches:boolean|null;framing:StudyFraming|null;variants:AvailableResult[]};
const inputs:Input[]=JSON.parse(document.getElementById('inputs')!.textContent!);
const results:Result[]=[],urls=new Map<string,string>();
const $=(id:string)=>document.getElementById(id)!;
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function image(key:string,design:MosaicDesign,label:string){
  if(!urls.has(key))urls.set(key,URL.createObjectURL(new Blob([renderToStaticMarkup(createElement(MosaicSvg,{design,label}))],{type:'image/svg+xml'})));
  return urls.get(key)!;
}
function render(){
  $('cases').innerHTML=results.map(r=>{
    const input=inputs.find(i=>i.theme===r.theme)!;
    return `<section><header class="case-head"><img class="thumb" src="${input.image}" alt="Foto original de ${escape(r.title.toLowerCase())}"><div><h2>${escape(r.title)}</h2>${input.sourcePage?`<small>Foto: ${escape(input.photographer!)} · <a href="${escape(input.sourcePage)}" target="_blank" rel="noopener noreferrer">${escape(input.sourceLabel??'Unsplash')}</a>${input.licenseUrl?` · <a href="${escape(input.licenseUrl)}" target="_blank" rel="noopener noreferrer">Licencia</a>`:''}</small>${input.framing?`<small>Encuadre: acercamiento ${input.framing.zoom.toLocaleString('es-AR')}× y recorte hacia abajo.</small>`:''}`:""}<details><summary>Ver foto original</summary><img class="original" src="${input.image}" alt="Foto original ampliada"></details></div></header><div class="grid">${r.variants.map(v=>`<figure><figcaption><strong>${v.size} × ${v.size} venecitas</strong><span>${availableCaption(v.after).split(' · ').at(-1)}</span><small>${(v.size*v.size).toLocaleString('es-AR')} piezas · ${new Set(v.after.cells).size} colores usados</small></figcaption><button class="preview" data-theme="${r.theme}" data-size="${v.size}" aria-label="Ampliar ${r.title.toLowerCase()}, grilla ${v.size} por ${v.size}"><img src="${image(r.theme+'-'+v.size,v.after,r.title)}" alt="${r.title}: ${availableCaption(v.after)}, paleta disponible de 29 colores"></button></figure>`).join('')}</div></section>`;
  }).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b=>b.addEventListener('click',()=>{
    const r=results.find(r=>r.theme===b.dataset.theme)!,v=r.variants.find(v=>v.size===Number(b.dataset.size))!;
    $('detail-title').textContent=`${r.title} · ${availableCaption(v.after)}`;
    $('detail-content').innerHTML=`<div class="detail-grid"><figure><figcaption><strong>Disponible ahora · 29 colores</strong><small>Con DI100 y DI97</small></figcaption><img src="${image(r.theme+'-'+v.size,v.after,r.title)}" alt="Resultado con los 29 colores disponibles"></figure><figure><figcaption><strong>Paleta anterior · 36 colores</strong><small>La misma grilla y el mismo encuadre</small></figcaption><img src="${image(r.theme+'-before-'+v.size,v.before,r.title)}" alt="Resultado anterior con 36 colores"></figure></div>`;
    ($('detail') as HTMLDialogElement).showModal();
  }));
  $('status').textContent='Las tres fotos están listas. Tocá un cuadro para ampliarlo y comparar las dos paletas a igual tamaño.';
}
async function main(){
  const base=await demoDesignCatalog.configuration();
  for(const input of inputs){
    const blob=await(await fetch(input.image)).blob(),local=await loadLocalImage(new File([blob],input.fileName,{type:input.mime}));
    try{
      const variants=generateAvailability(local.raster,base,undefined,studyCrop(local.raster,input.framing));
      const previousMatches=input.previous?[45,90].every(size=>{
        const current=variants.find(v=>v.size===size)!.before.cells,previous=input.previous![String(size)];
        return current.length===previous.length&&current.every((id,i)=>id===previous[i]);
      }):null;
      if(previousMatches===false)throw Error('No coincide el ensayo anterior de '+input.theme);
      results.push({theme:input.theme,title:input.title,sourceHash:input.sha256,previousMatches,framing:input.framing??null,variants});
    }finally{URL.revokeObjectURL(local.url);}
  }
  $('swatches').innerHTML=availableMaterials.map(c=>`<div class="swatch"><i style="background:${c.hex}"></i><strong>${escape(c.code)}</strong><small>${c.hex}${c.id==='murvi-di100'||c.id==='murvi-di97'?' · agregado':''}</small></div>`).join('');
  $('close-detail').addEventListener('click',()=>($('detail') as HTMLDialogElement).close());
  const report=JSON.stringify({version:AVAILABILITY_VERSION,caseSet:inputs[0].caseSet??'original',date:'2026-11-02',config:availableConfig(base),results});
  ($('report-data') as HTMLTextAreaElement).value=report;
  $('export').addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([report],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=inputs[0].caseSet==='original'?'paleta-disponible-2026-11-02.json':`${inputs[0].caseSet}-29-colores.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  ($('export') as HTMLButtonElement).disabled=false;render();
}
main().catch(e=>{$('status').textContent=e.message;$('status').setAttribute('role','alert');});
