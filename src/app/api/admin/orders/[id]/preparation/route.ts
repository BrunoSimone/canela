import { getDatabase } from "@/db/client";
import { InvalidPreparationError, parseSavePreparationInput } from "@/modules/admin/domain/preparation";
import { currentAdminSession, privateJson } from "@/modules/admin/infrastructure/admin-request";
import { isSameOriginAdminRequest } from "@/modules/admin/infrastructure/admin-origin";
import {
  PostgresOrderPreparationRepository,
  PreparationNotAllowedError,
  PreparationVersionConflictError,
} from "@/modules/admin/infrastructure/postgres-preparation";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const session = await currentAdminSession();
  if (!session) return privateJson({ code: "UNAUTHORIZED" }, 401);
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return privateJson({ code: "ORDER_NOT_FOUND" }, 404);
  }
  if (!isSameOriginAdminRequest(request)) {
    return privateJson({ code: "INVALID_ORIGIN" }, 403);
  }
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) {
    return privateJson({ code: "INVALID_PREPARATION" }, 422);
  }
  try {
    const raw = await request.text();
    if (raw.length > 16_384) throw new InvalidPreparationError();
    const input = parseSavePreparationInput(JSON.parse(raw));
    const saved = await new PostgresOrderPreparationRepository(getDatabase()).save(id, session.email, input);
    return saved ? privateJson(saved) : privateJson({ code: "ORDER_NOT_FOUND" }, 404);
  } catch (error) {
    if (error instanceof InvalidPreparationError || error instanceof SyntaxError) {
      return privateJson({ code: "INVALID_PREPARATION" }, 422);
    }
    if (error instanceof PreparationVersionConflictError) {
      return privateJson({ code: "PREPARATION_CONFLICT" }, 409);
    }
    if (error instanceof PreparationNotAllowedError) {
      return privateJson({ code: "PREPARATION_NOT_ALLOWED" }, 409);
    }
    console.error(JSON.stringify({ event: "admin_preparation_save_failed" }));
    return privateJson({ code: "ADMIN_PREPARATION_UNAVAILABLE" }, 503);
  }
}
