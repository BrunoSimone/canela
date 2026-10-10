import { after } from "next/server";

import { getDatabase } from "@/db/client";
import { AdminAuthRepository } from "@/modules/admin/infrastructure/admin-auth";
import { adminMailConfig } from "@/modules/admin/infrastructure/admin-config";
import { privateJson } from "@/modules/admin/infrastructure/admin-request";
import { sendAdminLoginEmail } from "@/modules/admin/infrastructure/resend-admin-mailer";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const config = adminMailConfig();
  if (!config || !process.env.DATABASE_URL) return privateJson({ code: "ADMIN_ACCESS_UNAVAILABLE" }, 503);
  let email: string;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("email" in body) || typeof body.email !== "string") {
      return privateJson({ code: "INVALID_EMAIL" }, 400);
    }
    email = body.email.trim().toLowerCase();
    if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return privateJson({ code: "INVALID_EMAIL" }, 400);
    }
  } catch {
    return privateJson({ code: "INVALID_EMAIL" }, 400);
  }

  const auth = new AdminAuthRepository(getDatabase());
  const respondAfter = Date.now() + 250;
  try {
    const linkToken = await auth.issueLink(email);
    if (linkToken) {
      after(async () => {
        try {
          await sendAdminLoginEmail(email, linkToken, config);
        } catch {
          try { await auth.revokeLink(linkToken); } catch { /* Link expires shortly. */ }
          console.error(JSON.stringify({ event: "admin_login_email_failed" }));
        }
      });
    }
  } catch {
    console.error(JSON.stringify({ event: "admin_login_request_failed" }));
    return privateJson({ code: "ADMIN_ACCESS_UNAVAILABLE" }, 503);
  }

  // The response must not reveal whether the address is authorized or rate-limited.
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, respondAfter - Date.now())));
  return privateJson({ ok: true }, 202);
}
