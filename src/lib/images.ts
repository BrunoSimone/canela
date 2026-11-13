import { createImageUrlBuilder } from '@sanity/image-url';
import { dataset,projectId } from '@/sanity/env';
import type { StoreImageSource } from './types';
const builder=createImageUrlBuilder({projectId,dataset});
function isManaged(source:StoreImageSource):source is Extract<StoreImageSource,{assetId:string}>{return !!source&&typeof source==='object'&&'assetId' in source&&'url' in source;}
/** Migration compatibility. Next Image resizes our immutable WebP derivatives. */
export function urlFor(source:StoreImageSource){
 if(!isManaged(source))return builder.image(source);
 const url=source.url;
 const self={width:(value:number)=>{void value;return self;},height:(value:number)=>{void value;return self;},fit:(value:string)=>{void value;return self;},quality:(value:number)=>{void value;return self;},url:()=>url};
 return self;
}
export function hasAsset(source:StoreImageSource|null|undefined):source is StoreImageSource{
 return !!source&&typeof source==='object'&&(isManaged(source)?typeof source.url==='string'&&source.url.startsWith('https://'):('asset'in source&&!!source.asset));
}

/** Keep the focal point when CSS crops an image inside its display container. */
export function imagePosition(source:StoreImageSource|null|undefined):string|undefined {
 if(!source||typeof source!=='object'||!('hotspot'in source))return undefined;
 const hotspot=source.hotspot as {x?:number;y?:number}|undefined;
 return typeof hotspot?.x==='number'&&typeof hotspot.y==='number'?`${hotspot.x*100}% ${hotspot.y*100}%`:undefined;
}
