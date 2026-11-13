import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp, { type OverlayOptions } from 'sharp';
import { renderToStaticMarkup } from 'react-dom/server';
import { MosaicSvg } from '../../src/modules/customization/presentation/mosaic-svg';
import { validateDesign,dimensions } from '../../src/modules/customization/domain/design';
import { demoDesignCatalog } from '../../src/modules/customization/infrastructure/demo-catalog';
import { VARIANTS,STUDY_VERSION,studyConfig,type StudyResult } from './format-study';

async function main() {
  if(!process.argv[2]) throw Error('Pass the report downloaded from the browser');
  const out='output/cuadros-research/formato-11mm';await mkdir(out,{recursive:true});
  const bytes=await readFile(process.argv[2]);
  if(bytes.byteLength>2_000_000)throw Error('Report too large');
  const report=JSON.parse(bytes.toString('utf8'));
  const config=await demoDesignCatalog.configuration();
  const titles:Record<string,string>={mascota:'Mascota',pareja:'Pareja',familia:'Familia'};
  if(report.version!==STUDY_VERSION||report.results.length!==3||new Set(report.results.map((r:{theme:string})=>r.theme)).size!==3) throw Error('Invalid report');
  for(const r of report.results) {
    if(!Object.hasOwn(titles,r.theme)||!r.previousMatches||r.variants.length!==4) throw Error('Invalid case');
    const title=titles[r.theme],original=await readFile(`output/cuadros-research/${r.theme}.png`);
    if(createHash('sha256').update(original).digest('hex')!==r.sourceHash) throw Error('Source hash changed');
    if(r.variants.map((v:StudyResult)=>v.id).join()!==VARIANTS.map(v=>v.id).join())throw Error('Unexpected comparisons');
    const composites:OverlayOptions[]=[];
    for(const [i,v] of (r.variants as StudyResult[]).entries()) {
      validateDesign(v.design);
      const variant=VARIANTS[i],expected=studyConfig(variant,config);
      if(v.size!==variant.size||v.design.size!==variant.size||JSON.stringify(v.design.config)!==JSON.stringify(expected))throw Error('Unexpected palette or format');
      const svg=renderToStaticMarkup(<MosaicSvg design={v.design} label={`${title} · Venecita ${variant.tileLabel} · Grilla ${v.size} × ${v.size}`} />);
      await writeFile(`${out}/${r.theme}-${v.id}.svg`,svg);
      await sharp(Buffer.from(svg),{density:120}).resize(1500,1500).png().toFile(`${out}/${r.theme}-${v.id}.png`);
      const left=24+(i%2)*720,top=100+Math.floor(i/2)*800;
      const cm=new Intl.NumberFormat('es-AR',{maximumFractionDigits:1}).format(dimensions(v.design.config,v.size).framedMm/10);
      const caption=Buffer.from(`<svg width="690" height="90" xmlns="http://www.w3.org/2000/svg"><g font-family="Arial,sans-serif" fill="#382d25"><text x="0" y="30" font-size="26" font-weight="bold">Venecita ${variant.tileLabel} · Grilla ${v.size} × ${v.size}</text><text x="0" y="65" font-size="20">${cm} cm con marco · ${v.design.config.palette.length} colores</text></g></svg>`);
      composites.push({input:caption,left,top},{input:await sharp(Buffer.from(svg)).resize(690,690).png().toBuffer(),left,top:top+90});
    }
    const heading=Buffer.from(`<svg width="1460" height="75" xmlns="http://www.w3.org/2000/svg"><text x="24" y="48" font-family="Arial,sans-serif" fill="#382d25" font-size="32" font-weight="bold">Canela · ${title} · Cuatro grillas y dos tamaños de venecita</text></svg>`);
    await sharp({create:{width:1460,height:1700,channels:3,background:'#f6f1e8'}}).composite([{input:heading,left:0,top:0},...composites]).png().toFile(`${out}/${r.theme}-cuatro-comparaciones.png`);
  }
  await writeFile(`${out}/resultados-cuatro-comparaciones.json`,JSON.stringify(report,null,2));
  console.log('Three cases exported; four labeled variants each, source hashes verified.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
