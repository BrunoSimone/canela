import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import type { Sql } from "postgres";
import { createDatabaseClient } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { createReservedOrder } from "@/db/create-reserved-order";
import { testDelivery } from "@/modules/checkout/domain/delivery.test-fixture";
import { PostgresInventory } from "@/modules/inventory/infrastructure/postgres-inventory";
import { PostgresPaymentConfirmationRepository } from "@/modules/payments/infrastructure/postgres/payment-confirmation-repository";
import { importCatalog } from "../../migration/import-catalog";
import { CatalogRepository } from "./catalog-repository";
const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
const photo = "a".repeat(64);
const product = {
  name: "Florero",
  category: "vidrio",
  sub: "Reciclado",
  price: 100,
  images: [{ assetId: photo }],
  shippingProfile: {
    version: 1,
    weightGrams: 100,
    heightCm: 10,
    widthCm: 10,
    lengthCm: 10,
    classificationId: "6",
  },
};
suite("CAT-154 PostgreSQL catalogue and transactional inventory", () => {
  let sql: Sql, repo: CatalogRepository, inventory: PostgresInventory;
  beforeAll(async () => {
    if (!/localhost|127\.0\.0\.1/.test(new URL(url!).hostname))
      throw Error("Local disposable DB required");
    sql = createDatabaseClient(url!);
    await sql`SET client_min_messages TO warning`;
    await runMigrations(sql);
    repo = new CatalogRepository(sql);
    inventory = new PostgresInventory(sql);
  });
  beforeEach(async () => {
    await sql`TRUNCATE catalog_entry,media_asset,orders,catalog_import RESTART IDENTITY CASCADE`;
    await sql`INSERT INTO media_asset(id,manifest,created_by) VALUES(${photo},'{}','test')`;
  });
  afterAll(async () => {
    await sql?.end();
  });
  async function seed(stock = 1) {
    const row = await repo.create("product", product, "owner", "piece");
    await repo.change(row.id, row.version, "publish", row.draft, "owner");
    await sql`UPDATE catalog_stock SET stock_on_hand=${stock} WHERE product_id='piece'`;
    return row.id;
  }
  function checkout(
    items = [
      {
        productId: "piece",
        name: "Florero",
        unitPriceCents: 10000,
        quantity: 1,
      },
    ],
  ) {
    const orderId = randomUUID();
    return {
      orderId,
      publicTokenHash: orderId.replaceAll("-", "").repeat(2),
      idempotencyKey: randomUUID(),
      currency: "ARS" as const,
      shippingCents: 0,
      buyerEmail: "qa@example.com",
      delivery: testDelivery,
      items,
    };
  }
  function confirmation(
    id: string,
    state: "approved" | "processing" | "rejected" = "approved",
  ) {
    return {
      webhookDeliveryId: randomUUID(),
      orderId: id,
      providerOrderId: `mp-${id}`,
      providerStatus: state,
      providerStatusDetail: null,
      state,
    };
  }
  async function preparePayment(id: string) {
    await sql`UPDATE payment_attempt SET provider_order_id=${`mp-${id}`},status='payment_pending',checkout_url='https://www.mercadopago.com.ar/checkout/redirect' WHERE order_id=${id}`;
    await sql`UPDATE orders SET status='payment_pending' WHERE id=${id}`;
  }
  it("import is idempotent and refuses to overwrite a later edit", async () => {
    const source = [
      {
        _id: "imported",
        _type: "producto",
        _rev: "one",
        name: "Pieza importada",
        price: 200,
      },
    ];
    const first = await importCatalog(sql, source, {}, "migration");
    expect(first.inserted).toBe(1);
    await repo.change(
      "imported",
      1,
      "save",
      { name: "Editado por Mariela" },
      "owner",
    );
    expect((await importCatalog(sql, source, {}, "migration")).reused).toBe(
      true,
    );
    await expect(
      importCatalog(sql, [{ ...source[0], _rev: "two" }], {}, "migration"),
    ).rejects.toThrow("overwrite");
    expect((await repo.get("imported"))?.draft.name).toBe(
      "Editado por Mariela",
    );
  });
  it("drafts stay private; publishing validates shipping/photos; concurrent edits are rejected", async () => {
    const row = await repo.create("product", { name: "En proceso" }, "owner");
    expect(await repo.publicEntries("product")).toEqual([]);
    await expect(
      repo.change(row.id, 1, "publish", row.draft, "owner"),
    ).rejects.toThrow("Completá");
    await repo.change(row.id, 1, "save", product, "owner");
    await expect(repo.change(row.id, 1, "save", {}, "owner")).rejects.toThrow(
      "otra ventana",
    );
    await expect(
      repo.change(
        row.id,
        2,
        "publish",
        { ...product, images: [{ assetId: "b".repeat(64) }] },
        "owner",
      ),
    ).rejects.toThrow("foto");
    expect((await repo.get(row.id))?.version).toBe(2);
    await repo.change(row.id, 2, "publish", product, "owner");
    expect(await repo.publicEntries("product")).toHaveLength(1);
    await repo.change(
      row.id,
      3,
      "save",
      { ...product, name: "Todavía privado" },
      "owner",
    );
    expect((await repo.publicEntries("product"))[0].published?.name).toBe(
      "Florero",
    );
  });
  it("duplicate starts with zero stock; archive preserves data and references; restore recovers publication", async () => {
    await seed(3);
    const copy = await repo.duplicate("piece", "owner");
    expect(copy.published).toBeNull();
    expect(
      (await inventory.list([{ id: copy.id, name: "copy", price: 100 }]))[0]
        .stockOnHand,
    ).toBe(0);
    await repo.change("piece", 2, "archive", null, "owner");
    expect(await repo.publicEntries("product")).toHaveLength(0);
    expect(
      await sql`SELECT * FROM catalog_asset_reference WHERE entry_id='piece'`,
    ).toHaveLength(1);
    await repo.change("piece", 3, "restore", null, "owner");
    expect(await repo.publicEntries("product")).toHaveLength(1);
  });
  it("only one concurrent buyer reserves the last unit; losing order rolls back completely", async () => {
    await seed();
    const results = await Promise.allSettled([
      createReservedOrder(sql, checkout(), inventory),
      createReservedOrder(sql, checkout(), inventory),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await sql`SELECT * FROM orders`).toHaveLength(1);
    expect((await sql`SELECT * FROM catalog_stock`)[0]).toMatchObject({
      stock_on_hand: 1,
      reserved: 1,
    });
  });
  it("a short cart or changed price rolls back every reservation and order", async () => {
    await seed();
    await expect(
      createReservedOrder(
        sql,
        checkout([
          {
            productId: "piece",
            name: "Florero",
            unitPriceCents: 9000,
            quantity: 1,
          },
        ]),
        inventory,
      ),
    ).rejects.toThrow("Inventory unavailable");
    await expect(
      createReservedOrder(
        sql,
        checkout([
          {
            productId: "piece",
            name: "Florero",
            unitPriceCents: 10000,
            quantity: 1,
          },
          {
            productId: "missing",
            name: "Missing",
            unitPriceCents: 10000,
            quantity: 1,
          },
        ]),
        inventory,
      ),
    ).rejects.toThrow();
    expect(await sql`SELECT * FROM orders`).toHaveLength(0);
    expect((await sql`SELECT reserved FROM catalog_stock`)[0].reserved).toBe(0);
  });
  it("retry reuses the same reservation; edits cannot eat reserved stock or overwrite a newer count", async () => {
    await seed(3);
    const input = checkout();
    await createReservedOrder(sql, input, inventory);
    expect((await createReservedOrder(sql, input, inventory)).reused).toBe(
      true,
    );
    const p = { id: "piece", name: "Florero", price: 100 };
    const [stock] = await inventory.list([p]);
    const edit = {
      mutationId: randomUUID(),
      expectedVersion: stock.version,
      expectedStock: 3,
      expectedReserved: 1,
      stockOnHand: 0,
      enabled: true,
      reason: "Conteo físico",
    };
    await expect(inventory.save(p, edit, "owner")).rejects.toThrow(
      "STOCK_BELOW_RESERVED",
    );
    edit.stockOnHand = 4;
    await inventory.save(p, edit, "owner");
    await inventory.save(p, edit, "owner");
    expect(await inventory.history("piece")).toHaveLength(1);
    await expect(
      inventory.save(p, { ...edit, mutationId: randomUUID() }, "owner"),
    ).rejects.toThrow("STOCK_CHANGED");
  });
  it("payment and stock commit atomically, including SQL failure followed by concurrent event retries", async () => {
    await seed();
    const { orderId } = await createReservedOrder(sql, checkout(), inventory);
    await preparePayment(orderId);
    const payments = new PostgresPaymentConfirmationRepository(sql, inventory);
    await sql.unsafe(
      `CREATE FUNCTION cat154_fail() RETURNS trigger AS $$ BEGIN IF NEW.status='paid' THEN RAISE EXCEPTION 'simulated failure'; END IF; RETURN NEW; END $$ LANGUAGE plpgsql; CREATE TRIGGER cat154_fail BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION cat154_fail();`,
    );
    try {
      await expect(payments.apply(confirmation(orderId))).rejects.toThrow(
        "simulated failure",
      );
    } finally {
      await sql.unsafe(
        "DROP TRIGGER cat154_fail ON orders; DROP FUNCTION cat154_fail();",
      );
    }
    expect((await sql`SELECT * FROM catalog_stock`)[0]).toMatchObject({
      stock_on_hand: 1,
      reserved: 1,
    });
    const results = await Promise.all([
      payments.apply(confirmation(orderId)),
      payments.apply(confirmation(orderId)),
    ]);
    expect(results.map((r) => r.kind).sort()).toEqual(["applied", "unchanged"]);
    expect((await sql`SELECT * FROM catalog_stock`)[0]).toMatchObject({
      stock_on_hand: 0,
      reserved: 0,
    });
    expect((await sql`SELECT status FROM orders`)[0].status).toBe("paid");
  });
  it("processing keeps units; confirmed failure releases once; late approval goes to review", async () => {
    await seed();
    const { orderId } = await createReservedOrder(sql, checkout(), inventory);
    await preparePayment(orderId);
    const payments = new PostgresPaymentConfirmationRepository(sql, inventory);
    await payments.apply(confirmation(orderId, "processing"));
    expect((await sql`SELECT reserved FROM catalog_stock`)[0].reserved).toBe(1);
    await payments.apply(confirmation(orderId, "rejected"));
    await payments.apply(confirmation(orderId, "rejected"));
    expect((await sql`SELECT * FROM catalog_stock`)[0]).toMatchObject({
      stock_on_hand: 1,
      reserved: 0,
    });
    await payments.apply(confirmation(orderId));
    expect((await sql`SELECT status FROM orders`)[0].status).toBe(
      "review_required",
    );
  });
});
