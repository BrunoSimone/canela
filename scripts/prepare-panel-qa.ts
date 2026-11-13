import { createHash,randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createDatabaseClient } from '../src/db/client';
import { runMigrations } from '../src/db/migrate';
async function main(){
 const url=process.env.DATABASE_URL;if(!url||!['127.0.0.1','localhost'].includes(new URL(url).hostname)||!new URL(url).pathname.endsWith('_stage'))throw Error('Use a disposable local stage database');
 const sql=createDatabaseClient(url);try{await runMigrations(sql);const token=randomBytes(32).toString('base64url');await sql`INSERT INTO admin_login_link(token_hash,email,expires_at) VALUES(${createHash('sha256').update(token).digest('hex')},'qa@canela.test',now()+interval '1 hour')`;await writeFile('output/catalog-migration/local-qa-login.txt',`http://localhost:3000/admin/acceso?token=${token}`,{mode:0o600});console.log('Local QA login prepared; no email sent.');}finally{await sql.end();}
}
main().catch(()=>{console.error('Could not prepare local QA');process.exitCode=1;});
