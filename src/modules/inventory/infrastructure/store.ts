import type { Sql,TransactionSql } from 'postgres';
import { getDatabase } from '@/db/client';
import { databaseCatalog } from '@/modules/catalog/infrastructure/source';
import { inventoryStore as sanityStore } from './sanity-documents';
import { PostgresInventory } from './postgres-inventory';
import type { InventoryStore } from '../domain/inventory-store';
export function inventoryStore(signal?:AbortSignal,sql?:Sql):InventoryStore{return databaseCatalog()?new PostgresInventory(sql??getDatabase()):sanityStore(signal);}
export function transactionalInventory(store:InventoryStore,tx:TransactionSql){return store.withTransaction?.(tx)??store;}
