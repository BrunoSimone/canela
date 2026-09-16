import { createHmac, timingSafeEqual } from "node:crypto";

type MercadoPagoWebhookSignatureInput = {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
};

const HEX_SHA256 = /^[a-f0-9]{64}$/i;

export function verifyMercadoPagoWebhookSignature(
  input: MercadoPagoWebhookSignatureInput,
): boolean {
  if (
    !input.xSignature ||
    !input.xRequestId ||
    !input.dataId ||
    !input.secret
  ) {
    return false;
  }

  const parts = parseSignature(input.xSignature);
  if (!parts || !/^\d+$/.test(parts.timestamp) || !HEX_SHA256.test(parts.hash)) {
    return false;
  }

  const manifest =
    `id:${input.dataId};request-id:${input.xRequestId};` +
    `ts:${parts.timestamp};`;
  const expected = createHmac("sha256", input.secret)
    .update(manifest)
    .digest("hex");
  const expectedBytes = Buffer.from(expected, "ascii");
  const receivedBytes = Buffer.from(parts.hash, "ascii");

  return (
    expectedBytes.byteLength === receivedBytes.byteLength &&
    timingSafeEqual(expectedBytes, receivedBytes)
  );
}

function parseSignature(
  header: string,
): { timestamp: string; hash: string } | null {
  const values = new Map<string, string>();
  for (const part of header.split(",")) {
    const separator = part.indexOf("=");
    if (separator < 1) {
      continue;
    }
    const key = part.slice(0, separator).trim().toLowerCase();
    const value = part.slice(separator + 1).trim();
    if (value) {
      values.set(key, value);
    }
  }

  const timestamp = values.get("ts");
  const hash = values.get("v1");
  return timestamp && hash ? { timestamp, hash } : null;
}
