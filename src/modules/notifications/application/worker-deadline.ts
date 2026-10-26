/** Bound manual recovery work and cancel its IO, not just the response. */
export async function runWithWorkerDeadline<T>(
  work: (signal: AbortSignal) => Promise<T>,
  close: () => Promise<void>,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  let closing: Promise<void> | undefined;
  const cleanup = () => closing ??= close();
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error("WORKER_DEADLINE");
      controller.abort(error);
      void cleanup().catch(() => {});
      reject(error);
    }, 25000);
  });
  try {
    return await Promise.race([work(controller.signal), deadline]);
  } finally {
    clearTimeout(timer!);
    await cleanup();
  }
}
