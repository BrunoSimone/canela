import type { DeliverySnapshot } from "@/modules/checkout/domain/delivery";
import type { MosaicDesign } from "./design";
import type { PublicFrameEstimate } from "./public-pricing";

export type DemoOutcome = "approved" | "pending" | "rejected";
export type DemoRecipient = { email: string; delivery: DeliverySnapshot };
export type DesignSelection = Pick<MosaicDesign, "version" | "algorithm" | "size" | "cells"> & { configurationId: string; configurationVersion: string };
export function selectDesign(design: MosaicDesign): DesignSelection {
  return { version: design.version, algorithm: design.algorithm, size: design.size, cells: [...design.cells], configurationId: design.config.id, configurationVersion: design.config.version };
}
export type DemoQuote = {
  mode: "demo"; id: string; expiresAt: string; design: MosaicDesign;
  recipient: DemoRecipient; frame: PublicFrameEstimate;
  shipping: { cents: number; name: string; transitDays: number; package: { weightGrams: number; widthCm: number; heightCm: number; depthCm: number } };
  totalCents: number; productionDays: number;
};
export type DemoOrder = { mode: "demo"; id: string; quoteId: string; status: DemoOutcome; production: "simulated" | "not_started" };
export type DemoPurchaseRequest =
  | { action: "quote"; design: DesignSelection; recipient: DemoRecipient; accepted: true }
  | { action: "pay"; quoteId: string; attemptId: string; outcome: DemoOutcome }
  | { action: "resolve"; quoteId: string; orderId: string; outcome: "approved" | "rejected" };
export class DemoPurchaseError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); this.name = "DemoPurchaseError"; }
}
