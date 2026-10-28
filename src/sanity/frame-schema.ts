import { defineType,defineField,type NumberRule } from 'sanity';
const required=<T extends {required():T}>(r:T)=>r.required();
const number=(name:string,title:string,validation:(r:NumberRule)=>NumberRule)=>defineField({name,title,type:'number',validation});
export const frameDesignSchema=defineType({name:'frameDesign',title:'Cuadros · Galería',type:'document',fields:[
 defineField({name:'title',title:'Nombre del diseño (obligatorio)',type:'string',validation:r=>r.required().max(100)}),
 defineField({name:'description',title:'Descripción breve (obligatorio)',type:'text',validation:r=>r.required().max(500)}),
 number('order','Orden en la galería',r=>r.integer().min(0)),
 defineField({name:'designJson',title:'Diseño aprobado',description:'Se prepara desde un pedido pagado y autorizado. No contiene datos personales ni la foto original.',type:'text',readOnly:true,validation:required}),
 ],preview:{select:{title:'title',subtitle:'description'}}});
