import { projectId, apiVersion } from "@/sanity/env";
import { allowedAdminEmails } from "@/modules/admin/infrastructure/admin-config";

export function studioOrigin(request: Request): string | null {
  const origin = request.headers.get("Origin");
  const allowed = ["https://canela-artesanal.sanity.studio"];
  if (process.env.NODE_ENV !== "production") allowed.push("http://localhost:3333");
  return origin && allowed.includes(origin) ? origin : null;
}
export async function studioIdentity(request: Request, fetcher: typeof fetch = fetch): Promise<{ email: string } | null> {
  if (!studioOrigin(request)) return null;
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ") || authorization.length > 8192) return null;
  try {
    const options = { headers: { Authorization: authorization }, cache: "no-store" as const, signal: AbortSignal.timeout(8000) };
    const response = await fetcher(`https://${projectId}.api.sanity.io/v${apiVersion}/users/me`, options);
    if (!response.ok) return null;
    const user = await response.json();
    if (typeof user.email !== "string" || !allowedAdminEmails().has(user.email.toLowerCase()) || !user.id) return null;
    const membership = await fetcher(`https://api.sanity.io/v${apiVersion}/projects/${projectId}`, options);
    if (!membership.ok) return null;
    const project = await membership.json();
    const member = project.members?.find((m: { id: string }) => m.id === user.id);
    if (!member || ![member.role, ...(member.roles ?? []).map((r: { name: string }) => r.name)].includes("administrator")) return null;
    return { email: user.email.toLowerCase() };
  } catch { return null; }
}
