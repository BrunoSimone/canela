export function databaseCatalog(env:Record<string,string|undefined>=process.env){
 const source=env.CATALOG_SOURCE??'sanity';
 if(!['sanity','database'].includes(source))throw Error('Invalid catalog source');
 return source==='database';
}
