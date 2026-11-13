import { NeonImageStore } from '../src/modules/media/infrastructure/neon-image-store';
async function main(){const store=new NeonImageStore();try{await store.configureUploads(['https://www.canela-store.com','https://canela-store.com','http://localhost:3000','http://127.0.0.1:3000']);console.log('Private uploads CORS configured for Canela and localhost only.');}finally{store.close();}}
main().catch(()=>{console.error('Could not configure media CORS');process.exitCode=1;});
