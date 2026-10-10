import { NextResponse } from "next/server";

import { getDatabase } from "@/db/client";
import { AdminAuthRepository } from "@/modules/admin/infrastructure/admin-auth";
import { ADMIN_COOKIE_NAME } from "@/modules/admin/infrastructure/admin-config";
import { isSameOriginAdminRequest } from "@/modules/admin/infrastructure/admin-origin";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;
  if (!isSameOriginAdminRequest(request)) {
    return new Response(null, { status: 403 });
  }
  const raw = request.headers.get("cookie")?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE_NAME}=`))
    ?.slice(ADMIN_COOKIE_NAME.length + 1);
  if (raw && process.env.DATABASE_URL) {
    await new AdminAuthRepository(getDatabase()).revokeSession(raw);
  }
  const response = NextResponse.redirect(new URL("/admin/ingresar", origin), { status: 303 });
  response.cookies.set(ADMIN_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
