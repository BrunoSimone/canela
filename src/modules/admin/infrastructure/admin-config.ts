export const ADMIN_COOKIE_NAME = "canela_admin_session";

export function adminDemoEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.ADMIN_DEMO_MODE === "1";
}

export function allowedAdminEmails(): Set<string> {
  return new Set((process.env.ADMIN_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean));
}

export function adminMailConfig(): {
  apiKey: string;
  from: string;
  siteUrl: string;
} | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ADMIN_EMAIL_FROM?.trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!apiKey || !from || !siteUrl || allowedAdminEmails().size === 0) return null;
  try {
    const url = new URL(siteUrl);
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.hostname === "localhost")) {
      return null;
    }
    return { apiKey, from, siteUrl: url.origin };
  } catch {
    return null;
  }
}
