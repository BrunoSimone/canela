import { cookies } from "next/headers";

import { getDatabase } from "@/db/client";

import { AdminAuthRepository } from "./admin-auth";
import { ADMIN_COOKIE_NAME, adminDemoEnabled } from "./admin-config";

export function isDemoRequest(url: URL): boolean {
  return adminDemoEnabled() && url.searchParams.get("demo") === "1";
}

export async function currentAdminSession(): Promise<{ email: string } | null> {
  if (!process.env.DATABASE_URL) return null;
  const cookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return new AdminAuthRepository(getDatabase()).getSession(cookie);
}

export function privateJson(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}
