// Sanity projectId/dataset are public (public-read dataset, and the id ships in
// every browser request), so they live here as constants rather than env vars:
// the Studio bundle only inlines SANITY_STUDIO_* variables, so a NEXT_PUBLIC_*
// would be undefined inside the Studio and it wouldn't boot.
// Project "Canela": sanity.io/manage/project/2puxew6b
export const projectId: string = "2puxew6b";
export const dataset = "production";
export const apiVersion = "2025-01-01";
