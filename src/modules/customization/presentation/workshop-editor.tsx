'use client';
import { useEffect,useRef,useState } from 'react';
import type { WorkshopSettings } from '../infrastructure/postgres/workshop-repository';
import type { WorkshopDocument } from '../domain/workshop-document';
import { parseWorkshopDocument } from '../domain/workshop-document';
import { workshopPending,type WorkshopCheck } from '../domain/workshop';
import { dimensions,cm } from '../domain/design';
import styles from './workshop-editor.module.css';
const checks:Record<WorkshopCheck,string>={geometry:'Medidas y tamaños',palette:'Colores y materiales',pricing:'Precios finales',packaging:'Paquetes completos',production:'Plazo y capacidad',terms:'Condiciones de compra'};
type NumericProps={label:string;value:number;onChange:(v:number)=>void;step?:number};
function NumberField({label,value,onChange,step=1}:NumericProps){return <label>{label}<input type="number" min="0" step={step} value={Number.isFinite(value)?value:''} onChange={e=>onChange(e.target.value===''?Number.NaN:Number(e.target.value))}/></label>;}
export function WorkshopEditor({initial}:{initial:WorkshopSettings}){
 const [saved,setSaved]=useState(initial),[doc,setDoc]=useState<WorkshopDocument>(initial.document),[dirty,setDirty]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[confirmed,setConfirmed]=useState(false);
 const pending=useRef(false);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>e.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function change(group:WorkshopCheck,edit:(next:WorkshopDocument)=>void){setDoc(current=>{const next=structuredClone(current);edit(next);next.confirmations[group]=false;return next;});setDirty(true);setConfirmed(false);setMessage('');}
 let valid=false,summary='Revisá los campos de cada sección.';
 try{const w=parseWorkshopDocument({...doc,_rev:'preview'});valid=workshopPending(w).length===0;summary=`Con marco: de ${cm(dimensions(w.config,w.config.minCells).framedMm)} a ${cm(dimensions(w.config,w.config.maxCells).framedMm)} cm por lado.`;}catch{/* Incomplete drafts remain editable. */}
 async function save(action:'save'|'publish'|'pause'){
  if(pending.current)return;pending.current=true;setBusy(true);setError('');setMessage('');
  try{const response=await fetch('/api/admin/taller',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:saved.version,document:doc,action})});const data=await response.json();if(!response.ok)throw Error(data.error??'No pudimos guardar.');setSaved(data);setDoc(data.document);setDirty(false);setConfirmed(false);setMessage(action==='publish'?'Configuración publicada. Se usará para nuevas compras cuando la tienda esté abierta.':action==='pause'?'Nuevas compras de cuadros pausadas. Los pedidos existentes siguen disponibles.':'Borrador guardado. La configuración publicada sigue igual.');}
  catch(e){setError(e instanceof Error?e.message:'No pudimos guardar.');}finally{pending.current=false;setBusy(false);}
 }
 return <main className={styles.page}>
  <header><p className={styles.eyebrow}>Taller · Cuadros personalizados</p><h1>Configuración del taller</h1><p>Los productos y el stock se cargan en Sanity. Acá definís cómo se hacen, se cotizan y se embalan los cuadros a pedido.</p></header>
  <aside className={styles.status}><strong>{saved.publishedVersion?'Hay una configuración publicada':'Todavía no hay una configuración publicada'}</strong><p>Guardá por partes y publicá cuando hayas revisado todo. Publicar no quita el mantenimiento de la tienda ni cambia pedidos anteriores.</p>{!saved.publishedVersion&&<p>Revisá los valores del borrador y confirmá cada sección antes de publicarlos.</p>}{saved.environment==='test'&&<p>Ambiente de pruebas: estos cambios no afectan la tienda real.</p>}</aside>
  {error&&<p role="alert" className={styles.error}>{error}</p>}{message&&<p role="status" className={styles.success}>{message}</p>}
  <fieldset disabled={busy} className={styles.sections}>
   <section><h2>1. Medidas del cuadro</h2><p>Medí la venecita, la junta y el marco. Estos datos determinan el tamaño que ve el comprador.</p><div className={styles.grid}>
    {([['tileMm','Lado de la venecita (mm)'],['groutMm','Separación entre piezas (mm)'],['frameMm','Marco por lado (mm)'],['minCells','Mínimo de piezas por lado'],['maxCells','Máximo de piezas por lado'],['step','Incremento de piezas']] as const).map(([key,label])=><NumberField key={key} label={label} value={doc.geometry[key]} step={key.endsWith('Mm')?0.1:1} onChange={v=>change('geometry',d=>{d.geometry[key]=v;})}/>)}
   </div><p className={styles.note}>{summary}</p></section>
   <section><h2>2. Colores disponibles</h2><p>El nombre y el color digital se muestran al comprador. La referencia del material es privada y aparece en la guía de fabricación.</p>
    <label>Color de fondo<select value={doc.geometry.backgroundColorId} onChange={e=>change('palette',d=>{d.geometry.backgroundColorId=e.target.value;})}>{doc.colors.filter(c=>c.enabled).map(c=><option value={c.publicId} key={c.publicId}>{c.name}</option>)}</select></label>
    <details><summary>Revisar los {doc.colors.length} colores</summary><div className={styles.colors}>{doc.colors.map((c,i)=><div className={styles.color} key={c.publicId}>
      <span className={styles.swatch} style={{backgroundColor:/^#[a-f0-9]{6}$/i.test(c.hex)?c.hex:'#ddd'}} aria-hidden="true"/>
      <label>Nombre del color {i+1}<input value={c.name} maxLength={80} onChange={e=>change('palette',d=>{d.colors[i].name=e.target.value;})}/></label>
      <label>Color digital {i+1}<input value={c.hex} maxLength={7} onChange={e=>change('palette',d=>{d.colors[i].hex=e.target.value;})}/></label>
      <label>Material {i+1}<input value={c.material} maxLength={100} onChange={e=>change('palette',d=>{d.colors[i].material=e.target.value;})}/></label>
      <label className={styles.check}><input type="checkbox" checked={c.enabled} onChange={e=>change('palette',d=>{d.colors[i].enabled=e.target.checked;})}/>Disponible</label>
    </div>)}</div><button type="button" onClick={()=>change('palette',d=>{d.colors.push({publicId:`color-${crypto.randomUUID()}`,name:'Nuevo color',hex:'#ffffff',material:'',enabled:false});})}>Agregar color</button></details>
   </section>
   <section><h2>3. Precio del cuadro</h2><p>Importes en pesos argentinos. Incluí el margen que quieras cobrar. El comprador ve un único precio por el cuadro con marco; estos costos no se muestran.</p><div className={styles.grid}>
    <NumberField label="Precio del paquete de venecitas (ARS)" step={0.01} value={doc.pricing.tilePackArs} onChange={v=>change('pricing',d=>{d.pricing.tilePackArs=v;})}/>
    <NumberField label="Venecitas por paquete" value={doc.pricing.tilePackQuantity} onChange={v=>change('pricing',d=>{d.pricing.tilePackQuantity=v;})}/>
    <NumberField label="Redondear precio hacia arriba a múltiplos de (ARS)" value={doc.pricing.roundToArs} onChange={v=>change('pricing',d=>{d.pricing.roundToArs=v;})}/>
    </div><p>Referencias de menor a mayor, cubriendo todo el rango. Los tamaños intermedios se calculan proporcionalmente.</p>{doc.pricing.sizes.map((s,i)=><div className={styles.row} key={i}>
     <NumberField label={`Precio ${i+1}: piezas por lado`} value={s.cells} onChange={v=>change('pricing',d=>{d.pricing.sizes[i].cells=v;})}/>
     <NumberField label={`Precio ${i+1}: trabajo y margen (ARS)`} step={0.01} value={s.laborArs} onChange={v=>change('pricing',d=>{d.pricing.sizes[i].laborArs=v;})}/>
     <NumberField label={`Precio ${i+1}: marco e insumos (ARS)`} step={0.01} value={s.suppliesArs} onChange={v=>change('pricing',d=>{d.pricing.sizes[i].suppliesArs=v;})}/>
     <button type="button" aria-label={`Quitar precio ${i+1}`} onClick={()=>change('pricing',d=>{d.pricing.sizes.splice(i,1);})}>Quitar</button>
    </div>)}<button type="button" onClick={()=>change('pricing',d=>{d.pricing.sizes.push({cells:d.geometry.maxCells,laborArs:0,suppliesArs:0});})}>Agregar referencia de precio</button>
   </section>
   <section><h2>4. Paquetes para el envío</h2><p>Pesá y medí el cuadro con marco, protección y caja. Cada rango debe contener todos los cuadros hasta ese tamaño. El margen de seguridad del envío se agrega automáticamente.</p>
    {doc.packages.map((p,i)=><fieldset className={styles.package} key={i}><legend>Paquete {i+1}</legend><div className={styles.grid}>{([['maxCells','Hasta piezas por lado'],['weightGrams','Peso total embalado (g)'],['widthCm','Ancho exterior (cm)'],['lengthCm','Largo exterior (cm)'],['heightCm','Espesor exterior (cm)']] as const).map(([key,label])=><NumberField key={key} label={`Paquete ${i+1}: ${label}`} value={p[key]} onChange={v=>change('packaging',d=>{d.packages[i][key]=v;})}/>)}
      <label>Contenido del paquete {i+1}<select value={p.classificationId} onChange={e=>change('packaging',d=>{d.packages[i].classificationId=e.target.value;})}><option value="6">Vidrio / cuadro con vidrio</option><option value="1">Cuadro sin vidrio</option></select></label>
    </div><button type="button" onClick={()=>change('packaging',d=>{d.packages.splice(i,1);})}>Quitar paquete {i+1}</button></fieldset>)}<button type="button" onClick={()=>change('packaging',d=>{d.packages.push({maxCells:d.geometry.maxCells,weightGrams:0,widthCm:0,lengthCm:0,heightCm:0,classificationId:'6'});})}>Agregar paquete</button>
   </section>
   <section><h2>5. Fabricación</h2><div className={styles.grid}><NumberField label="Días de fabricación desde el pago" value={doc.productionDays} onChange={v=>change('production',d=>{d.productionDays=v;})}/><NumberField label="Cuadros en fabricación a la vez" value={doc.capacity} onChange={v=>change('production',d=>{d.capacity=v;})}/></div><p>Al completar los lugares se pausa la compra de nuevos cuadros. Los pagos pendientes conservan su lugar hasta que se resuelvan.</p></section>
   <section><h2>6. Condiciones de personalización</h2><label>Texto que acepta el comprador<textarea rows={5} maxLength={6000} value={doc.termsText} onChange={e=>change('terms',d=>{d.termsText=e.target.value;})}/></label><p>Explicá las variaciones del acabado y las condiciones de cambios o cancelaciones que definiste para estos pedidos.</p></section>
   <section><h2>7. Revisión antes de publicar</h2><p>Marcá cada sección cuando sus datos sean definitivos. Si editás una sección, vuelve a quedar pendiente de revisión.</p><div className={styles.checks}>{Object.entries(checks).map(([key,label])=><label className={styles.check} key={key}><input type="checkbox" checked={doc.confirmations[key as WorkshopCheck]} onChange={e=>{setDoc({...doc,confirmations:{...doc.confirmations,[key]:e.target.checked}});setDirty(true);setConfirmed(false);}}/>{label} {key==='terms'?'confirmadas':'confirmados'}</label>)}</div></section>
  </fieldset>
  <footer className={styles.actions}>
   <p>{dirty?'Tenés cambios sin guardar.':'El borrador está guardado.'}</p><div><button disabled={busy} onClick={()=>void save('save')}>{busy?'Guardando…':'Guardar borrador'}</button>
   {saved.publishedVersion&&<button disabled={busy} onClick={()=>void save('pause')}>Pausar nuevas compras de cuadros</button>}</div>
   <label className={styles.check}><input type="checkbox" checked={confirmed} disabled={!valid||busy} onChange={e=>setConfirmed(e.target.checked)}/>Quiero usar estos datos para las nuevas compras de cuadros.</label>
   <button className={styles.primary} disabled={!valid||!confirmed||busy} onClick={()=>void save('publish')}>Publicar configuración</button>
   {!valid&&<p>Para publicar, completá los campos y confirmá las seis secciones.</p>}
  </footer>
 </main>;
}
