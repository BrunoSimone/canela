import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Sql } from "postgres";

import { allowedAdminEmails } from "./admin-config";

const LINK_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function token(): string {
  return randomBytes(32).toString("base64url");
}

export class AdminAuthRepository {
  constructor(private readonly sql: Sql) {}

  async issueLink(email: string): Promise<string | null> {
    const normalized = email.trim().toLowerCase();
    if (!allowedAdminEmails().has(normalized)) return null;
    const emailHash = hash(normalized);
    const [rate] = await this.sql<{ request_count: number }[]>`
      INSERT INTO admin_login_rate_limit (email_hash, window_start, request_count)
      VALUES (${emailHash}, now(), 1)
      ON CONFLICT (email_hash) DO UPDATE SET
        window_start = CASE
          WHEN admin_login_rate_limit.window_start < now() - interval '1 hour' THEN now()
          ELSE admin_login_rate_limit.window_start
        END,
        request_count = CASE
          WHEN admin_login_rate_limit.window_start < now() - interval '1 hour' THEN 1
          ELSE admin_login_rate_limit.request_count + 1
        END
      RETURNING request_count
    `;
    if (!rate || rate.request_count > 5) return null;

    const raw = token();
    await this.sql`
      INSERT INTO admin_login_link (token_hash, email, expires_at)
      VALUES (${hash(raw)}, ${normalized}, ${new Date(Date.now() + LINK_TTL_MS)})
    `;
    return raw;
  }

  async revokeLink(raw: string): Promise<void> {
    await this.sql`DELETE FROM admin_login_link WHERE token_hash = ${hash(raw)}`;
  }

  async consumeLink(raw: string): Promise<{ session: string; email: string } | null> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(raw)) return null;
    return this.sql.begin(async (tx) => {
      const [link] = await tx<{ email: string }[]>`
        UPDATE admin_login_link SET consumed_at = now()
        WHERE token_hash = ${hash(raw)}
          AND consumed_at IS NULL
          AND expires_at > now()
        RETURNING email
      `;
      if (!link || !allowedAdminEmails().has(link.email)) return null;
      const session = token();
      await tx`
        INSERT INTO admin_session (token_hash, email, expires_at)
        VALUES (${hash(session)}, ${link.email}, ${new Date(Date.now() + SESSION_TTL_MS)})
      `;
      await tx`
        INSERT INTO admin_auth_event (id, email, event)
        VALUES (${randomUUID()}, ${link.email}, 'login')
      `;
      return { session, email: link.email };
    });
  }

  async getSession(raw: string | undefined): Promise<{ email: string } | null> {
    if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) return null;
    const [row] = await this.sql<{ email: string }[]>`
      SELECT email FROM admin_session
      WHERE token_hash = ${hash(raw)}
        AND revoked_at IS NULL AND expires_at > now()
    `;
    return row && allowedAdminEmails().has(row.email) ? row : null;
  }

  async revokeSession(raw: string | undefined): Promise<void> {
    if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) return;
    await this.sql.begin(async (tx) => {
      const [row] = await tx<{ email: string }[]>`
        UPDATE admin_session SET revoked_at = now()
        WHERE token_hash = ${hash(raw)} AND revoked_at IS NULL
        RETURNING email
      `;
      if (row) await tx`
        INSERT INTO admin_auth_event (id, email, event)
        VALUES (${randomUUID()}, ${row.email}, 'logout')
      `;
    });
  }
}

export const ADMIN_SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;
