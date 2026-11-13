'use client';
import {useRef,useState,type RefObject} from 'react';
import type {AdminOrder} from '../domain/order';
import {TileEditor} from '@/modules/customization/presentation/tile-editor';
import {applyRetouches,emptyRetouches,paintTile,restoreTile,undoRetouch,redoRetouch} from '@/modules/customization/domain/retouches';
export function FrameRetouch({order,onSaved,onCancel,returnFocus}:{order:AdminOrder;onSaved:(o:AdminOrder)=>void;onCancel:()=>void;returnFocus:RefObject<HTMLButtonElement|null>}){
 const base=order.frame!.productionDesign??order.frame!.design!;
 const [history,setHistory]=useState(emptyRetouches),[saving,setSaving]=useState(false),[error,setError]=useState('');const pending=useRef(false);
 async function save(){
  if(pending.current)return;pending.current=true;setSaving(true);setError('');
  try{
   const response=await fetch(`/api/admin/orders/${order.id}/frame`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'retouch',version:order.frame!.version,cells:applyRetouches(base,history.present).cells})});
   const data=await response.json();if(!response.ok)throw Error(data.error??'No pudimos guardar. Los retoques siguen abiertos.');
   onSaved(data);
  }catch(e){setError(e instanceof Error?e.message:'No pudimos guardar los retoques.');}finally{pending.current=false;setSaving(false);}
 }
 return <TileEditor design={applyRetouches(base,history.present)} history={history} returnFocus={returnFocus} saving={saving} error={error} onSave={()=>void save()} onClose={()=>{if(!pending.current)onCancel();}} onPaint={(i,c)=>{if(!pending.current)setHistory(h=>paintTile(h,base,i,c));}} onRestore={i=>{if(!pending.current)setHistory(h=>restoreTile(h,base,i));}} onUndo={()=>{if(!pending.current)setHistory(undoRetouch);}} onRedo={()=>{if(!pending.current)setHistory(redoRetouch);}}/>;
}
