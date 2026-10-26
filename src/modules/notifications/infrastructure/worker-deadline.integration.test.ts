import { describe, expect, it } from "vitest";
import { createDatabaseClient } from "@/db/client";
import { runWithWorkerDeadline } from "../application/worker-deadline";

const url = process.env.TEST_DATABASE_URL;
if (process.env.RUN_DB_INTEGRATION === "1" && !url) throw Error("TEST_DATABASE_URL required");
if (url && !["127.0.0.1", "localhost"].includes(new URL(url).hostname)) throw Error("Disposable local DB only");
(url ? describe : describe.skip)("FIN-03 PostgreSQL cancellation", () => {
  it("cancels slow worker queries within 30s without closing another request's pool", async () => {
    const worker = createDatabaseClient(url!), checkout = createDatabaseClient(url!);
    const started = Date.now();
    try {
      await expect(runWithWorkerDeadline(async () => {
        await worker`SELECT pg_sleep(60)`;
        throw Error("must not reach successful completion");
      }, () => worker.end({ timeout: 0 }))).rejects.toThrow("WORKER_DEADLINE");
      expect(Date.now() - started).toBeLessThan(29000);
      expect(await checkout`SELECT 1 AS alive`).toMatchObject([{ alive: 1 }]);
      await expect(worker`SELECT 1`).rejects.toThrow();
    } finally { await worker.end({ timeout: 0 }); await checkout.end({ timeout: 0 }); }
  }, 35000);
});
