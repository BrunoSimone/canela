import { NextResponse, type NextRequest } from "next/server";

import { getDatabase } from "@/db/client";
import { AdminAuthRepository } from "@/modules/admin/infrastructure/admin-auth";
import { ADMIN_COOKIE_NAME } from "@/modules/admin/infrastructure/admin-config";

const maintenanceHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Retry-After": "3600",
  "X-Robots-Tag": "noindex, nofollow",
};
const SESSION_FORMAT = /^[A-Za-z0-9_-]{43}$/;
/** Public APIs an authenticated preview may use. Checkout, orders and frames stay closed: no charges. */
const PREVIEW_APIS = new Set(["POST /api/shipping/quotes"]);

export type ProxyDependencies = {
  /** Verifies an admin session against the database; any failure must deny the preview. */
  isAdminSession(token: string): Promise<boolean>;
};

const defaultDependencies: ProxyDependencies = {
  async isAdminSession(token) {
    if (!process.env.DATABASE_URL) return false;
    return (await new AdminAuthRepository(getDatabase()).getSession(token)) !== null;
  },
};

async function adminPreview(request: NextRequest, dependencies: ProxyDependencies): Promise<boolean> {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token || !SESSION_FORMAT.test(token)) return false;
  try {
    return await dependencies.isAdminSession(token);
  } catch {
    return false;
  }
}

function previewResponse(): NextResponse {
  const response = NextResponse.next();
  // Authenticated previews must never be cached or indexed.
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export function createProxy(dependencies: ProxyDependencies = defaultDependencies) {
  return async function proxy(request: NextRequest): Promise<NextResponse> {
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

    const isApi = pathname === "/api" || pathname.startsWith("/api/");
    const isPage = !isApi && ["GET", "HEAD"].includes(request.method) && pathname !== "/mantenimiento";
    const previewable = isPage || PREVIEW_APIS.has(`${request.method} ${pathname}`);
    if (previewable && await adminPreview(request, dependencies)) return previewResponse();

    if (isApi || !["GET", "HEAD"].includes(request.method)) {
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
  };
}

export const proxy = createProxy();

export const config = {
  matcher: ["/((?!_next/static/|_next/image|canela-logo\\.png$|icon\\.png$|favicon\\.ico$).*)"],
};
