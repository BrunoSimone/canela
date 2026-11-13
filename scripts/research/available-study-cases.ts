export type StudyFraming = {zoom:number;x:number;y:number};
type StudyCase = { theme:string; title:string; file:string; photographer?:string; sourcePage?:string;sourceLabel?:string;licenseUrl?:string;framing?:StudyFraming };
type CaseSet = {directory:string;sourceDirectory:string;cases:StudyCase[]};
const root='output/cuadros-research';
export const AVAILABILITY_CASE_SETS:Record<'original'|'paisajes'|'simples',CaseSet>={
  original:{directory:`${root}/paleta-disponible-2026-11-02`,sourceDirectory:root,cases:[
    {theme:'mascota',title:'Mascota',file:'mascota.png'},
    {theme:'pareja',title:'Pareja',file:'pareja.png'},
    {theme:'familia',title:'Familia',file:'familia.png'},
  ]},
  paisajes:{directory:`${root}/paisajes-retrato-29-colores-2026-11-02`,sourceDirectory:`${root}/paisajes-retrato-29-colores-2026-11-02`,cases:[
    {theme:'lago-montana',title:'Lago y montaña',file:'fuentes/lago-montana.jpg',photographer:'Bell C.',sourcePage:'https://unsplash.com/photos/a-blue-lake-surrounded-by-trees-and-mountains-vzScMVa5H0A'},
    {theme:'rio-bosque',title:'Río y bosque',file:'fuentes/rio-bosque.jpg',photographer:'Steven Cordes',sourcePage:'https://unsplash.com/photos/a-river-running-through-a-lush-green-forest-BZu6drs_kDg'},
    {theme:'retrato-individual',title:'Retrato individual',file:'fuentes/retrato-individual.jpg',photographer:'Unsplash',sourcePage:'https://images.unsplash.com/photo-1438761681033-6461ffad8d80'},
  ]},
  simples:{directory:`${root}/imagenes-simples-29-colores-2026-11-02`,sourceDirectory:`${root}/imagenes-simples-29-colores-2026-11-02`,cases:[
    {theme:'faro-mar',title:'Faro frente al mar',file:'fuentes/faro-mar.jpg',photographer:'Jeffrey Czum',sourcePage:'https://www.pexels.com/photo/photo-of-lighthouse-near-sea-3330175/',sourceLabel:'Pexels',licenseUrl:'https://www.pexels.com/license/',framing:{zoom:2.5,x:0.5,y:1}},
    {theme:'montana-nevada',title:'Montaña nevada',file:'fuentes/montana-nevada.jpg',photographer:'Lorenzo Alessio Messina',sourcePage:'https://www.pexels.com/photo/snowy-mountain-landscape-under-clear-blue-sky-29498264/',sourceLabel:'Pexels',licenseUrl:'https://www.pexels.com/license/'},
    {theme:'flor-primer-plano',title:'Girasol en primer plano',file:'fuentes/flor-primer-plano.jpg',photographer:'Ben Vaughn',sourcePage:'https://unsplash.com/photos/yellow-sunflower-in-black-background-49TxPKd3Eus',sourceLabel:'Unsplash',licenseUrl:'https://unsplash.com/license'},
  ]},
};
export function studyCaseSet(value:unknown):keyof typeof AVAILABILITY_CASE_SETS {
  if(value===undefined||value==='original')return 'original';
  if(value==='paisajes'||value==='simples')return value;
  throw Error('Unknown study case set');
}
