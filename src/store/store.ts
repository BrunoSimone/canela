import { configureStore } from "@reduxjs/toolkit";

import { cartReducer } from "@/modules/cart/presentation/state/cart-slice";
import { checkoutApi } from "@/modules/checkout/presentation/client/checkout-api";

export function createAppStore() {
  return configureStore({
    reducer: {
      cart: cartReducer,
      [checkoutApi.reducerPath]: checkoutApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(checkoutApi.middleware),
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
