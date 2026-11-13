import { describe, expect, it, vi } from "vitest";
import { BodyReadError, readBoundedJson, readBoundedText } from "./read-bounded-body";

function streamed(chunks: Uint8Array[], headers: Record<string, string> = {}) {
  const cancel = vi.fn();
  let consumed = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (consumed === chunks.length) controller.close();
      else controller.enqueue(chunks[consumed++]);
    }, cancel,
  }, { highWaterMark: 0 });
  return { request: new Request("https://canela.test", { method: "POST", body, headers, duplex: "half" } as RequestInit), cancel, consumed: () => consumed };
}
const bytes = (s: string) => new TextEncoder().encode(s);

describe("bounded HTTP bodies", () => {
  it("accepts exact byte limit and UTF-8 split between chunks", async () => {
    const utf8 = bytes("aé");
    const { request } = streamed([utf8.slice(0, 2), utf8.slice(2)]);
    expect(await readBoundedText(request, 3)).toBe("aé");
  });
  it.each([{}, { "content-length": "1" }])("cancels oversized streams regardless of length header %j", async headers => {
    const s = streamed([bytes("éé"), bytes("do not read")], headers as Record<string, string>);
    await expect(readBoundedText(s.request, 3)).rejects.toMatchObject({ reason: "too_large" });
    expect(s.cancel).toHaveBeenCalledOnce();
    expect(s.consumed()).toBe(1);
  });
  it("rejects declared oversize before reading", async () => {
    const s = streamed([bytes("secret")], { "content-length": "100" });
    await expect(readBoundedText(s.request, 4)).rejects.toMatchObject({ reason: "too_large" });
    expect(s.consumed()).toBe(0);
    expect(s.cancel).toHaveBeenCalledOnce();
  });
  it.each(["-1", "NaN", "9007199254740992"])("rejects invalid declared size %s", async value => {
    await expect(readBoundedText(streamed([], { "content-length": value }).request, 100)).rejects.toBeInstanceOf(BodyReadError);
  });
  it("rejects malformed UTF-8 instead of silently replacing bytes", async () => {
    await expect(readBoundedText(streamed([new Uint8Array([0xc3])]).request, 10)).rejects.toMatchObject({ reason: "invalid" });
  });
  it("bounds time even if stream cancellation never completes", async () => {
    vi.useFakeTimers();
    try {
      const cancel = vi.fn(() => new Promise<void>(() => {}));
      const body = new ReadableStream({ cancel });
      const request = new Request("https://canela.test", { method: "POST", body, duplex: "half" } as RequestInit);
      const assertion = expect(readBoundedText(request, 100, 20)).rejects.toMatchObject({ reason: "timeout" });
      await vi.advanceTimersByTimeAsync(20);
      await assertion;
      expect(cancel).toHaveBeenCalledOnce();
      expect(body.locked).toBe(false);
    } finally { vi.useRealTimers(); }
  });
  it("stops reading when the requester disconnects", async () => {
    const controller = new AbortController();
    const cancel = vi.fn();
    const body = new ReadableStream({ cancel });
    const request = new Request("https://canela.test", { method: "POST", body, signal: controller.signal, duplex: "half" } as RequestInit);
    const assertion = expect(readBoundedText(request, 100)).rejects.toMatchObject({ reason: "aborted" });
    controller.abort();
    await assertion;
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
  });
  it("hides stream errors and releases the lock", async () => {
    const body = new ReadableStream({ start(c) { c.error(new Error("private details")); } });
    const request = new Request("https://canela.test", { method: "POST", body, duplex: "half" } as RequestInit);
    await expect(readBoundedText(request, 100)).rejects.toThrow("Invalid request body");
    expect(body.locked).toBe(false);
  });
  it("parses bounded JSON and rejects invalid or missing content", async () => {
    expect(await readBoundedJson(streamed([bytes('{"ok":true}')]).request, 20)).toEqual({ ok: true });
    await expect(readBoundedJson(streamed([bytes("not json")]).request, 20)).rejects.toBeInstanceOf(SyntaxError);
    await expect(readBoundedJson(new Request("https://canela.test"), 20)).rejects.toBeInstanceOf(BodyReadError);
  });
});
