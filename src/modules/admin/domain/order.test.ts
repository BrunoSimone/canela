import { describe, expect, it } from "vitest";

import { describeOrderStatus, makeOrderCursor, parseOrderQuery, readOrderCursor } from "./order";
import { listDemoOrders } from "../infrastructure/demo-orders";

describe("admin order contract", () => {
  it("accepts bounded search, sort and page size", () => {
    expect(parseOrderQuery(new URL("https://canela.test/api/admin/orders?q=%20ceramica%20&sort=created_asc&limit=10")))
      .toMatchObject({ q: "ceramica", sort: "created_asc", limit: 10 });
    expect(() => parseOrderQuery(new URL("https://canela.test/api/admin/orders?limit=1000"))).toThrow("INVALID_ORDER_QUERY");
    expect(() => parseOrderQuery(new URL("https://canela.test/api/admin/orders?sort=price"))).toThrow("INVALID_ORDER_QUERY");
  });

  it("preserves microsecond precision in a pagination cursor", () => {
    const timestamp = "2026-09-27T12:00:00.000123Z";
    const id = "11111111-1111-4111-8111-111111111111";
    expect(readOrderCursor(makeOrderCursor(timestamp, id))).toEqual({ createdAt: timestamp, id });
    expect(() => readOrderCursor("broken")).toThrow("INVALID_ORDER_CURSOR");
  });

  it("uses a safe attention state for unknown database status", () => {
    expect(describeOrderStatus("unknown").status).toBe("attention");
  });

  it("searches and paginates server-side demo data with the same contract", () => {
    const first = listDemoOrders({ q: "", sort: "created_desc", cursor: null, limit: 2 });
    expect(first.orders).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();
    const second = listDemoOrders({ q: "", sort: "created_desc", cursor: first.nextCursor, limit: 2 });
    expect(second.orders[0].id).not.toBe(first.orders[1].id);
    expect(listDemoOrders({ q: "fuente", sort: "created_desc", cursor: null, limit: 25 }).orders).toHaveLength(1);
  });
});
