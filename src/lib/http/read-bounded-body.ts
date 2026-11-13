/** Invalid input is deliberately a SyntaxError for HTTP adapters to map safely. */
export class BodyReadError extends SyntaxError {
  constructor(readonly reason: "too_large" | "invalid" | "timeout" | "aborted") {
    super("Invalid request body");
    this.name = "BodyReadError";
  }
}

/** Enforce bytes while reading, never after buffering an unbounded body. */
export async function readBoundedText(request: Request, maxBytes: number, timeoutMs = 10_000): Promise<string> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    throw new RangeError("Invalid body limits");
  }
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || !Number.isSafeInteger(Number(declared)))) {
    void request.body?.cancel().catch(() => {});
    throw new BodyReadError("invalid");
  }
  if (declared !== null && Number(declared) > maxBytes) {
    void request.body?.cancel().catch(() => {});
    throw new BodyReadError("too_large");
  }
  if (request.signal.aborted) {
    void request.body?.cancel().catch(() => {});
    throw new BodyReadError("aborted");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new BodyReadError("invalid");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort = () => {};
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new BodyReadError("timeout")), timeoutMs);
    abort = () => reject(new BodyReadError("aborted"));
    request.signal.addEventListener("abort", abort, { once: true });
  });
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let total = 0;
  let text = "";
  let complete = false;
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) { complete = true; break; }
      total += value.byteLength;
      if (total > maxBytes) throw new BodyReadError("too_large");
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) {
    if (error instanceof BodyReadError) throw error;
    throw new BodyReadError("invalid");
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", abort);
    // A slow upstream cancel must not prevent the HTTP error from being sent.
    if (!complete) void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function readBoundedJson(request: Request, maxBytes: number): Promise<unknown> {
  return JSON.parse(await readBoundedText(request, maxBytes)) as unknown;
}
