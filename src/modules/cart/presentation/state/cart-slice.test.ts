import { describe, expect, it } from "vitest";

import {
  addItem,
  clearCart,
  decrementItem,
  hydrateCart,
  incrementItem,
  initialCartState,
  removeItem,
  reconcileCartAvailability,
  selectCanStartCheckout,
  selectCartCount,
  cartReducer,
} from "./cart-slice";

const directItem = {
  id: "piece-1",
  name: "Espejo Perlas",
  price: 15_000,
  checkoutEligible: true,
};

describe("cartReducer", () => {
  it("adds a product once and increments its quantity on repeated additions", () => {
    const first = cartReducer(initialCartState, addItem(directItem));
    const second = cartReducer(first, addItem(directItem));

    expect(second.items).toEqual([{ ...directItem, qty: 2 }]);
    expect(second.panelOpen).toBe(true);
    expect(selectCartCount({ cart: second })).toBe(2);
  });

  it("decrements an item and removes it when the last unit is removed", () => {
    const withTwo = cartReducer(
      { ...initialCartState, items: [{ ...directItem, qty: 2 }] },
      decrementItem(directItem.id),
    );
    const empty = cartReducer(withTwo, decrementItem(directItem.id));

    expect(withTwo.items[0]?.qty).toBe(1);
    expect(empty.items).toEqual([]);
  });

  it("increments, removes and clears without changing unrelated items", () => {
    const commission = {
      id: "commission-1",
      name: "Cuadro personalizado",
      price: 20_000,
      qty: 1,
      checkoutEligible: false,
    };
    const state = {
      ...initialCartState,
      items: [{ ...directItem, qty: 1 }, commission],
    };

    const incremented = cartReducer(state, incrementItem(directItem.id));
    const removed = cartReducer(incremented, removeItem(directItem.id));
    const cleared = cartReducer(removed, clearCart());

    expect(incremented.items[1]).toEqual(commission);
    expect(removed.items).toEqual([commission]);
    expect(cleared.items).toEqual([]);
  });

  it("hydrates valid persisted items and treats legacy items as ineligible", () => {
    const hydrated = cartReducer(
      initialCartState,
      hydrateCart([
        { ...directItem, qty: 2 },
        { id: "legacy", name: "Pieza anterior", price: 9_000, qty: 1 },
        { id: "broken", name: "Inválida", price: -1, qty: 1 },
      ]),
    );

    expect(hydrated.items).toEqual([
      { ...directItem, qty: 2 },
      {
        id: "legacy",
        name: "Pieza anterior",
        price: 9_000,
        qty: 1,
        checkoutEligible: false,
      },
    ]);
    expect(hydrated.hydrated).toBe(true);
    expect(selectCanStartCheckout({ cart: hydrated })).toBe(false);
  });

  it("enables checkout only when every item is explicitly eligible", () => {
    const directOnly = {
      ...initialCartState,
      items: [{ ...directItem, qty: 1 }],
    };
    const mixed = {
      ...directOnly,
      items: [
        ...directOnly.items,
        {
          id: "commission-1",
          name: "Cuadro personalizado",
          price: 20_000,
          qty: 1,
          checkoutEligible: false,
        },
      ],
    };

    expect(selectCanStartCheckout({ cart: initialCartState })).toBe(false);
    expect(selectCanStartCheckout({ cart: directOnly })).toBe(true);
    expect(selectCanStartCheckout({ cart: mixed })).toBe(false);
  });
  it("STK-04 refreshes stale cart availability, preserving quantities and supporting restock", () => {
    let state = cartReducer(initialCartState, hydrateCart([
      { ...directItem, qty: 2 },
      { id: "restocked", name: "Reposición", price: 50, qty: 1, checkoutEligible: false },
    ]));
    state = cartReducer(state, reconcileCartAvailability(["restocked"]));
    expect(state.items.map(i => [i.id, i.qty, i.checkoutEligible])).toEqual([
      [directItem.id, 2, false], ["restocked", 1, true],
    ]);
    state = cartReducer(state, incrementItem(directItem.id));
    expect(state.items[0].qty).toBe(2);
    state = cartReducer(state, reconcileCartAvailability([directItem.id, "restocked"]));
    expect(selectCanStartCheckout({ cart: state })).toBe(true);
    expect(state.items[0].qty).toBe(2);
  });
  it("STK-03 ignores adding a sold-out product", () => {
    expect(cartReducer(initialCartState, addItem({ ...directItem, checkoutEligible: false })).items).toEqual([]);
  });

});
