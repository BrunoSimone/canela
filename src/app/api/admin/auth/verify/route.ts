import { NextResponse } from "next/server";

import { getDatabase } from "@/db/client";
import { AdminAuthRepository, ADMIN_SESSION_MAX_AGE_SECONDS } from "@/modules/admin/infrastructure/admin-auth";
import { ADMIN_COOKIE_NAME } from "@/modules/admin/infrastructure/admin-config";
import { adminRequestOrigin, isSameOriginAdminRequest } from "@/modules/admin/infrastructure/admin-origin";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const origin = adminRequestOrigin(request);
  if (!isSameOriginAdminRequest(request)) {
    return new Response(null, { status: 403 });
  }
  const form = await request.formData();
  const token = form.get("token");
  const fallback = new URL("/admin/ingresar?error=link", origin);
  if (!process.env.DATABASE_URL || typeof token !== "string") {
    return NextResponse.redirect(fallback, { status: 303 });
  }

  try {
    const result = await new AdminAuthRepository(getDatabase()).consumeLink(token);
    if (!result) return NextResponse.redirect(fallback, { status: 303 });
    const response = NextResponse.redirect(new URL("/admin", origin), { status: 303 });
    response.cookies.set(ADMIN_COOKIE_NAME, result.session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    console.error(JSON.stringify({ event: "admin_login_verify_failed" }));
    return NextResponse.redirect(fallback, { status: 303 });
  }
}
