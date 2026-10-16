import { createHash } from "node:crypto";
import { sendResendEmail } from "@/modules/notifications/infrastructure/resend-mailer";
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
  await sendResendEmail(config.apiKey, { from: config.from, to: [email], ...message },
    `canela-login/${createHash("sha256").update(rawToken).digest("hex")}`);
}
