import { describe, expect, it } from "vitest";
import { validateImageFile } from "./local-image";

describe("PER-130: local file boundary", () => {
  it.each([
    ["image/png", [137, 80, 78, 71, 13, 10, 26, 10]],
    ["image/jpeg", [255, 216, 255, 224]],
    ["image/webp", [82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]],
  ])("recognizes supported %s content", async (type, bytes) => {
    await expect(validateImageFile(new File([new Uint8Array(bytes as number[])], "image", { type: type as string }))).resolves.toBeUndefined();
  });
  it("rejects renamed SVG / arbitrary bytes even with an allowed MIME type", async () => {
    await expect(validateImageFile(new File(["<svg onload='alert(1)'/>"], "image.png", { type: "image/png" }))).rejects.toThrow(/formato/);
  });
  it("rejects an empty file", async () => {
    await expect(validateImageFile(new File([], "image.png", { type: "image/png" }))).rejects.toThrow(/vacío/);
  });
  it("rejects large files before reading their content", async () => {
    await expect(validateImageFile({ size: 11 * 1024 * 1024 } as File)).rejects.toThrow(/10 MB/);
  });
  it("does not accept a mismatched file type", async () => {
    await expect(validateImageFile(new File([new Uint8Array([255, 216, 255])], "a", { type: "image/png" }))).rejects.toThrow(/formato/);
  });
});
