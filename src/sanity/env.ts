import { resolveCatalogDataset } from "./catalog-dataset";

// These identifiers are public. Next inlines NEXT_PUBLIC_*; Studio has its own
// SANITY_STUDIO_* setting in sanity.config.ts. Both default to production.
// Project "Canela": sanity.io/manage/project/2puxew6b
export const projectId: string = "2puxew6b";
export const dataset = resolveCatalogDataset(process.env.NEXT_PUBLIC_SANITY_DATASET, process.env.VERCEL_ENV);
export const apiVersion = "2025-01-01";
