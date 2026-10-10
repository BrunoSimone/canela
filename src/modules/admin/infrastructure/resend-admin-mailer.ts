import type { adminMailConfig } from "./admin-config";
import { renderAdminLoginEmail } from "@/emails/admin-login";

type MailConfig = NonNullable<ReturnType<typeof adminMailConfig>>;

export async function sendAdminLoginEmail(
  email: string,
  rawToken: string,
  config: MailConfig,
): Promise<void> {
  const link = new URL("/admin/acceso", config.siteUrl);
  link.searchParams.set("token", rawToken);
  const message = await renderAdminLoginEmail({ loginUrl: link.toString() });
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      from: config.from,
      to: [email],
      ...message,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!result.ok) throw new Error(`ADMIN_MAIL_SEND_FAILED_${result.status}`);
}
