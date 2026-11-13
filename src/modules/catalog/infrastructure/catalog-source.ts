import { getDatabase } from '@/db/client';
import { databaseCatalog } from './source';
import { DatabaseProductCatalog,DatabaseShippingProfiles,DatabaseShippingBoxes } from './postgres/readers';
import { SanityProductCatalog } from './sanity/sanity-product-catalog';
import { SanityShippingProfileCatalog } from '@/modules/shipping/infrastructure/sanity/sanity-shipping-profile-catalog';
import { SanityShippingBoxes } from '@/modules/shipping/infrastructure/sanity/sanity-shipping-boxes';
export const productCatalog=()=>databaseCatalog()?new DatabaseProductCatalog(getDatabase()):new SanityProductCatalog();
export const shippingProfileCatalog=()=>databaseCatalog()?new DatabaseShippingProfiles(getDatabase()):new SanityShippingProfileCatalog();
export const shippingBoxes=()=>databaseCatalog()?new DatabaseShippingBoxes(getDatabase()):new SanityShippingBoxes();
