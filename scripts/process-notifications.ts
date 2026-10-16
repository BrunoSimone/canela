import { getDatabase } from "../src/db/client";
import { processOrderNotifications } from "../src/modules/notifications/infrastructure/notification-service";
async function main(){try{console.log(JSON.stringify({processed:await processOrderNotifications(undefined,5)}));}finally{if(process.env.DATABASE_URL)await getDatabase().end();}}
main().catch(()=>{console.error("Notification processing failed; inspect configuration and queue state.");process.exitCode=1;});
