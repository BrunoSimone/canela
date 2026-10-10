import type { AdminOrder } from "../domain/order";

export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatDate(value: string, long = false): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: long ? "long" : "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

export function maskEmail(email: string | null): string {
  if (!email) return "Aún no disponible";
  const [local, domain] = email.split("@");
  if (!domain) return "Aún no disponible";
  return `${local.slice(0, 2)}${"•".repeat(Math.min(Math.max(local.length - 2, 2), 5))}@${domain}`;
}

export function destinationLabel(order: AdminOrder): string {
  return order.destination
    ? `${order.destination.locality}, ${order.destination.province}`
    : "Aún no disponible";
}
