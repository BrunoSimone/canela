const MERCADO_PAGO_AMOUNT = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/;

export function formatArsCents(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new Error("Amount in cents must be a non-negative safe integer");
  }

  const whole = Math.floor(cents / 100);
  const decimal = String(cents % 100).padStart(2, "0");
  return `${whole}.${decimal}`;
}

export function parseArsAmount(amount: string): number {
  const match = MERCADO_PAGO_AMOUNT.exec(amount);
  if (!match) {
    throw new Error("Provider amount must have at most two decimal places");
  }

  const whole = Number(match[1]);
  const decimal = Number((match[2] ?? "").padEnd(2, "0"));
  const cents = whole * 100 + decimal;

  if (!Number.isSafeInteger(cents)) {
    throw new Error("Provider amount exceeds the supported monetary range");
  }

  return cents;
}
