import { describe, it, expect } from "vitest";
import { planCatalogImport, type SourceDocument } from "./import-catalog";
import type { StoredImage } from "@/modules/media/domain/image-asset";
const image = {
  id: "a".repeat(64),
  original: { sha256: "a".repeat(64) },
  web: { sha256: "b".repeat(64) },
} as StoredImage;
const source: SourceDocument[] = [
  {
    _id: "piece",
    _type: "producto",
    _rev: "a",
    name: "Pieza pública",
    price: 100,
    category: "vidrio",
    sub: "Reciclado",
    orderRank: "0|aaa",
    images: [
      {
        asset: { _ref: "asset" },
        crop: { top: 0.1, bottom: 0.2, left: 0, right: 0 },
        hotspot: { x: 0.3, y: 0.6, width: 0.4, height: 0.2 },
      },
    ],
  },
  {
    _id: "drafts.piece",
    _type: "producto",
    _rev: "b",
    name: "Cambio pendiente",
    price: 120,
  },
  { _id: "drafts.new", _type: "producto", _rev: "c", name: "Solo borrador" },
];
describe("CAT-154 migration planning", () => {
  it("preserves IDs, separate drafts, prices, crop and hotspot; never revives retired stock", () => {
    const plan = planCatalogImport(source, { asset: image });
    const piece = plan.entries.find((e) => e.id === "piece")!;
    expect(piece.draft.name).toBe("Cambio pendiente");
    expect(piece.published?.name).toBe("Pieza pública");
    expect(piece.published?.images?.[0]).toMatchObject({
      assetId: image.id,
      crop: { top: 0.1, bottom: 0.2 },
      hotspot: { x: 0.3, y: 0.6 },
    });
    expect(piece.stock.stockOnHand).toBe(0);
    expect(plan.entries.find((e) => e.id === "new")?.published).toBeNull();
    expect(plan.pending).toHaveLength(1);
  });
  it("stops when a referenced image is missing instead of silently dropping it", () => {
    expect(() => planCatalogImport(source, {})).toThrow(
      "Missing verified asset",
    );
  });
  it("blocks outstanding reservations and orphan stock before cutover", () => {
    for (const doc of [
      {
        _type: "canelaInventory",
        productId: "piece",
        stockOnHand: 3,
        reserved: 1,
        enabled: true,
        version: 2,
      },
      {
        _type: "canelaInventory",
        productId: "orphan",
        stockOnHand: 1,
        reserved: 0,
        enabled: true,
        version: 1,
      },
      { _type: "canelaReservation", state: "active" },
    ])
      expect(() =>
        planCatalogImport(
          [...source, { _id: "inventory.fixture", _rev: "a", ...doc }],
          { asset: image },
        ),
      ).toThrow(/reconciliation/);
  });
  it("imports exact current quantities from source inventory only", () => {
    const plan = planCatalogImport(
      [
        ...source,
        {
          _id: "inventory.piece",
          _type: "canelaInventory",
          _rev: "s",
          productId: "piece",
          stockOnHand: 12,
          reserved: 0,
          enabled: true,
          version: 9,
        },
      ],
      { asset: image },
    );
    expect(plan.entries[0].stock).toEqual({
      stockOnHand: 12,
      reserved: 0,
      enabled: true,
      version: 9,
    });
  });
});
