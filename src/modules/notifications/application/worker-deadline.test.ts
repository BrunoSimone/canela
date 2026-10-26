import { afterEach, describe, expect, it, vi } from "vitest";
import { runWithWorkerDeadline } from "./worker-deadline";

afterEach(() => vi.useRealTimers());
describe("FIN-03 worker deadline", () => {
  it("aborts slow IO and closes its dedicated database before the scheduler timeout", async () => {
    vi.useFakeTimers();
    const close = vi.fn(async () => {});
    let signal!: AbortSignal;
    const result = runWithWorkerDeadline(async s => { signal = s; return new Promise(() => {}); }, close);
    const rejected = expect(result).rejects.toThrow("WORKER_DEADLINE");
    await vi.advanceTimersByTimeAsync(25000);
    await rejected;
    expect(signal.aborted).toBe(true);
    expect(close).toHaveBeenCalledTimes(1);
  });
  it("clears the deadline on success without aborting completed work", async () => {
    vi.useFakeTimers();
    const close = vi.fn(async () => {});
    let signal!: AbortSignal;
    expect(await runWithWorkerDeadline(async s => { signal = s; return 2; }, close)).toBe(2);
    await vi.advanceTimersByTimeAsync(30000);
    expect(signal.aborted).toBe(false);
    expect(close).toHaveBeenCalledTimes(1);
  });
  it("closes the isolated connection on failure and preserves the error", async () => {
    const close = vi.fn(async () => {});
    await expect(runWithWorkerDeadline(async () => { throw Error("failed"); }, close)).rejects.toThrow("failed");
    expect(close).toHaveBeenCalledTimes(1);
  });
});
