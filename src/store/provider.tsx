"use client";

import { useEffect, useState } from "react";
import { setupListeners } from "@reduxjs/toolkit/query";
import { Provider } from "react-redux";

import {
  hydrateCart,
  selectCartItems,
} from "@/modules/cart/presentation/state/cart-slice";

import { createAppStore } from "./store";

const CART_STORAGE_KEY = "canela:cart:v1";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(createAppStore);

  useEffect(() => {
    const unsubscribeListeners = setupListeners(store.dispatch);
    store.dispatch(hydrateCart(readPersistedCart()));
    let previousItems = selectCartItems(store.getState());

    const unsubscribeStore = store.subscribe(() => {
      const items = selectCartItems(store.getState());
      if (items === previousItems) return;
      previousItems = items;
      persistCart(items);
    });

    return () => {
      unsubscribeStore();
      unsubscribeListeners();
    };
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}

function readPersistedCart(): unknown {
  try {
    const value = window.localStorage.getItem(CART_STORAGE_KEY);
    return value ? (JSON.parse(value) as unknown) : [];
  } catch {
    return [];
  }
}

function persistCart(value: unknown): void {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(value));
  } catch {
    return;
  }
}
