import { timingSafeEqual } from "node:crypto";
export async function handleNotificationWorker(request:Request,secret:string|undefined,process:()=>Promise<number | { processed: number; review: number; overdue: number }>):Promise<Response>{
 const headers={"Cache-Control":"no-store"};const provided=request.headers.get("Authorization")??"";
 if(!secret||secret.length<32)return Response.json({code:"WORKER_DISABLED"},{status:503,headers});
 const expected=Buffer.from(`Bearer ${secret}`), actual=Buffer.from(provided);
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return Response.json({code:"UNAUTHORIZED"},{status:401,headers});
 try{const result=await process();const body=typeof result==="number"?{processed:result}:result;return Response.json(body,{headers,status:typeof result!=="number"&&(result.review>0||result.overdue>0)?503:200});}
 catch{return Response.json({code:"WORKER_UNAVAILABLE"},{status:503,headers});}
}
