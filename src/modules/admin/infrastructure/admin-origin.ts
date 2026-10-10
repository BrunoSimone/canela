export function isSameOriginAdminRequest(request: Request): boolean {
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (fetchSite !== null && fetchSite !== "same-origin") return false;

  const origin = request.headers.get("Origin");
  if (origin === new URL(request.url).origin) return true;

  // no-referrer hides Origin on native form posts. Fetch Metadata is set by
  // the browser and still identifies requests originating from this site.
  return (origin === null || origin === "null") && fetchSite === "same-origin";
}
