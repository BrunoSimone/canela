import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp,{type OverlayOptions} from 'sharp';
import {renderToStaticMarkup} from 'react-dom/server';
import {MosaicSvg} from '../../src/modules/customization/presentation/mosaic-svg';
import {validateDesign,dimensions,type MosaicDesign} from '../../src/modules/customization/domain/design';
import {demoDesignCatalog} from '../../src/modules/customization/infrastructure/demo-catalog';
import {AVAILABILITY_VERSION,STUDY_SIZES,availableConfig,type AvailableResult} from './available-palette-study';

import {AVAILABILITY_CASE_SETS,studyCaseSet} from './available-study-cases';

async function main(){
  const path=process.argv[2];if(!path)throw Error('Pass the downloaded availability report');
  if((await stat(path)).size>2_000_000)throw Error('Report too large');
  const bytes=await readFile(path);if(bytes.length>2_000_000)throw Error('Report too large');
  const report=JSON.parse(bytes.toString('utf8'));
  const base=await demoDesignCatalog.configuration(),config=availableConfig(base);
  const caseSet=studyCaseSet(report.caseSet),selected=AVAILABILITY_CASE_SETS[caseSet];
  const titles:Record<string,string>=Object.fromEntries(selected.cases.map(c=>[c.theme,c.title]));
  if(report.version!==AVAILABILITY_VERSION||!Array.isArray(report.results)||report.results.length!==3||new Set(report.results.map((r:{theme:string})=>r.theme)).size!==3||JSON.stringify(report.config)!==JSON.stringify(config))throw Error('Invalid report');
  // Validate every case before writing any images; no report field becomes a path unchecked.
  for(const r of report.results){
    if(!Object.hasOwn(titles,r.theme)||r.previousMatches!==(caseSet==='original'?true:null)||!Array.isArray(r.variants)||r.variants.length!==4||r.variants.map((v:AvailableResult)=>v.size).join()!==STUDY_SIZES.join())throw Error('Invalid case');
    const original=await readFile(`${selected.sourceDirectory}/${selected.cases.find(c=>c.theme===r.theme)!.file}`);
    if(createHash('sha256').update(original).digest('hex')!==r.sourceHash)throw Error('Source hash changed');
    if(JSON.stringify(r.framing??null)!==JSON.stringify(selected.cases.find(c=>c.theme===r.theme)!.framing??null))throw Error('Source framing changed');
    for(const v of r.variants as AvailableResult[]){
      validateDesign(v.before);validateDesign(v.after);
      if(v.before.size!==v.size||v.after.size!==v.size||JSON.stringify(v.before.config)!==JSON.stringify(base)||JSON.stringify(v.after.config)!==JSON.stringify(config))throw Error('Unexpected design configuration');
    }
  }
  const out=selected.directory;await mkdir(out,{recursive:true});
  const svg=(design:MosaicDesign,label:string)=>Buffer.from(renderToStaticMarkup(<MosaicSvg design={design} label={label}/>));
  for(const r of report.results){
    const title=titles[r.theme],composites:OverlayOptions[]=[];
    for(const [i,v] of (r.variants as AvailableResult[]).entries()){
      const image=svg(v.after,title),left=24+(i%2)*720,top=130+Math.floor(i/2)*800;
      await writeFile(`${out}/${r.theme}-${v.size}.svg`,image);
      await sharp(image,{density:120}).resize(1500,1500).png().toFile(`${out}/${r.theme}-${v.size}.png`);
      const cm=new Intl.NumberFormat('es-AR',{maximumFractionDigits:1}).format(dimensions(config,v.size).framedMm/10);
      const caption=Buffer.from(`<svg width="690" height="90" xmlns="http://www.w3.org/2000/svg"><g font-family="Arial,sans-serif" fill="#382d25"><text x="0" y="30" font-size="26" font-weight="bold">${v.size} × ${v.size} venecitas · ${cm} cm con marco</text><text x="0" y="65" font-size="20">Venecita de 1,1 cm · 29 colores disponibles</text></g></svg>`);
      composites.push({input:caption,left,top},{input:await sharp(image).resize(690,690).png().toBuffer(),left,top:top+90});
    }
    const heading=Buffer.from(`<svg width="1460" height="105" xmlns="http://www.w3.org/2000/svg"><g font-family="Arial,sans-serif" fill="#382d25"><text x="24" y="43" font-size="32" font-weight="bold">Canela · ${title} · Paleta disponible para 1×1</text><text x="24" y="80" font-size="19">Incluye DI100 y DI97. Mantiene fuera M24 y C50. Colores y acabado aproximados.</text></g></svg>`);
    await sharp({create:{width:1460,height:1740,channels:3,background:'#f6f1e8'}}).composite([{input:heading,left:0,top:0},...composites]).png().toFile(`${out}/${r.theme}-tamanos.png`);
    const ninety=(r.variants as AvailableResult[]).find(v=>v.size===90)!;
    const compareHeading=Buffer.from(`<svg width="1460" height="125" xmlns="http://www.w3.org/2000/svg"><g font-family="Arial,sans-serif" fill="#382d25"><text x="24" y="40" font-size="28" font-weight="bold">${title} · Misma grilla 90 × 90, distinta paleta</text><text x="24" y="88" font-size="23">Disponible ahora · 29 colores</text><text x="744" y="88" font-size="23">Paleta anterior · 36 colores</text></g></svg>`);
    await sharp({create:{width:1460,height:850,channels:3,background:'#f6f1e8'}}).composite([{input:compareHeading,left:0,top:0},...await Promise.all([ninety.after,ninety.before].map(async(design,i)=>({input:await sharp(svg(design,title)).resize(690,690).png().toBuffer(),left:24+i*720,top:130}))) ]).png().toFile(`${out}/${r.theme}-paletas-90.png`);
  }
  await writeFile(`${out}/resultados.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({cases:report.results.length,colors:config.palette.length,sizes:STUDY_SIZES,usedAt90:report.results.map((r:{theme:string;variants:AvailableResult[]})=>({theme:r.theme,colors:new Set(r.variants.find(v=>v.size===90)!.after.cells).size}))}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
