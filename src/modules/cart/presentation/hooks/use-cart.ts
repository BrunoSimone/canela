"use client";

import { useMemo } from "react";

import { whatsappLink, WA_GENERAL_MESSAGE } from "@/lib/config";
import { formatPrice } from "@/lib/product-status";
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
    cartWhatsAppLink: useMemo(() => whatsappLink(buildMessage(items)), [items]),
    generalWhatsAppLink: useMemo(() => whatsappLink(WA_GENERAL_MESSAGE), []),
  };
}

function buildMessage(items: CartItem[]): string {
  if (items.length === 0) return WA_GENERAL_MESSAGE;
  const lines = items
    .map((item) => `• ${item.name} x${item.qty} (${formatPrice(item.price)})`)
    .join("\n");
  return `¡Hola! Quería consultar por estas piezas:\n${lines}\n¿Me ayudás con mi pedido? 🙂`;
}
