import { NextResponse, type NextRequest } from "next/server";

const maintenanceHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Retry-After": "3600",
  "X-Robots-Tag": "noindex, nofollow",
};

export function proxy(request: NextRequest) {
  if (process.env.SITE_MAINTENANCE_MODE !== "1") return NextResponse.next();

  const { pathname } = request.nextUrl;
  // The admin routes still enforce their own authentication. Provider callbacks
  // must remain reachable while the public storefront is paused.
  if (
    pathname === "/admin" || pathname.startsWith("/admin/") ||
    pathname === "/api/admin" || pathname.startsWith("/api/admin/") ||
    pathname === "/api/webhooks/mercado-pago" ||
    pathname === "/api/internal/notifications" ||
    pathname === "/api/studio/inventory" ||
    pathname === "/api/revalidate" ||
    pathname === "/robots.txt"
  ) return NextResponse.next();

  if (pathname === "/api" || pathname.startsWith("/api/") ||
    !["GET", "HEAD"].includes(request.method)) {
    return NextResponse.json({ code: "SITE_MAINTENANCE" }, {
      status: 503,
      headers: maintenanceHeaders,
    });
  }

  const destination = request.nextUrl.clone();
  destination.pathname = "/mantenimiento";
  destination.search = "";
  return NextResponse.rewrite(destination, {
    status: 503,
    headers: maintenanceHeaders,
  });
}

export const config = {
  matcher: ["/((?!_next/static/|_next/image|canela-logo\\.png$|icon\\.png$|favicon\\.ico$).*)"],
};
