"use client";

import {
  addItem,
  closeCartPanel,
  decrementItem,
  incrementItem,
  removeItem,
  selectCartCount,
  selectCartItems,
  selectCartPanelOpen,
  toggleCartPanel,
  type CartItem,
} from "@/modules/cart/presentation/state/cart-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function useCart() {
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCartItems);
  const count = useAppSelector(selectCartCount);
  const panelOpen = useAppSelector(selectCartPanelOpen);

  return {
    items,
    count,
    panelOpen,
    add: (item: Omit<CartItem, "qty">) => dispatch(addItem(item)),
    inc: (id: string) => dispatch(incrementItem(id)),
    dec: (id: string) => dispatch(decrementItem(id)),
    remove: (id: string) => dispatch(removeItem(id)),
    qtyOf: (id: string) => items.find((item) => item.id === id)?.qty ?? 0,
    togglePanel: () => dispatch(toggleCartPanel()),
    closePanel: () => dispatch(closeCartPanel()),
  };
}
