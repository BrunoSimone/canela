export function adminRequestOrigin(
  request: Request,
  configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL,
): string {
  const internal = new URL(request.url);
  const internalOrigin = internal.origin;
  try {
    const configured = new URL(configuredSiteUrl ?? "");
    if (!["http:", "https:"].includes(configured.protocol) || configured.username || configured.password) return internalOrigin;
    // A proxy may expose the internal server URL to Next. Only the exact host
    // configured by the operator can select a different public origin.
    if (request.headers.get("Host") === configured.host ||
        request.headers.get("X-Forwarded-Host") === configured.host) {
      return configured.origin;
    }
  } catch { /* Invalid configuration cannot supply a redirect destination. */ }
  // Next's local server can normalize 127.0.0.1 to localhost. Keep the
  // browser's loopback host so a redirect does not lose its host-only cookie.
  // Never trust arbitrary hosts, forwarded headers, or a different port here.
  if (process.env.NODE_ENV === "development" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(internal.hostname)) {
    const host = request.headers.get("Host");
    const port = internal.port ? `:${internal.port}` : "";
    if (host && ["localhost", "127.0.0.1", "[::1]"].some(name => host === `${name}${port}`)) {
      return `${internal.protocol}//${host}`;
    }
  }
  return internalOrigin;
}

export function isSameOriginAdminRequest(request: Request, configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL): boolean {
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (fetchSite !== null && fetchSite !== "same-origin") return false;

  const origin = request.headers.get("Origin");
  if (origin === adminRequestOrigin(request, configuredSiteUrl)) return true;

  // no-referrer hides Origin on native form posts. Fetch Metadata is set by
  // the browser and still identifies requests originating from this site.
  return (origin === null || origin === "null") && fetchSite === "same-origin";
}
