import { getDatabase } from '@/db/client';
import { PublicFrameReader } from '@/modules/customization/infrastructure/postgres/public-frame';
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'};
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{publicToken:string}>}) {
 const {publicToken}=await params;
 if(!/^[A-Za-z0-9_-]{43}$/.test(publicToken))return Response.json({code:'NOT_FOUND'},{status:404,headers});
 try {const order=await new PublicFrameReader(getDatabase()).get(publicToken);return Response.json(order??{code:'NOT_FOUND'},{status:order?200:404,headers});}
 catch{return Response.json({code:'UNAVAILABLE'},{status:503,headers});}
}
