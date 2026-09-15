import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  checkoutEligible: boolean;
};

export type CartState = {
  items: CartItem[];
  panelOpen: boolean;
  hydrated: boolean;
};

export const initialCartState: CartState = {
  items: [],
  panelOpen: false,
  hydrated: false,
};

type CartRootState = { cart: CartState };

const cartSlice = createSlice({
  name: "cart",
  initialState: initialCartState,
  reducers: {
    addItem(state, action: PayloadAction<Omit<CartItem, "qty">>) {
      const existing = state.items.find((item) => item.id === action.payload.id);
      if (existing) {
        existing.qty += 1;
      } else {
        state.items.push({ ...action.payload, qty: 1 });
      }
      state.panelOpen = true;
    },
    incrementItem(state, action: PayloadAction<string>) {
      const item = state.items.find((candidate) => candidate.id === action.payload);
      if (item) item.qty += 1;
    },
    decrementItem(state, action: PayloadAction<string>) {
      const item = state.items.find((candidate) => candidate.id === action.payload);
      if (!item) return;
      if (item.qty === 1) {
        state.items = state.items.filter((candidate) => candidate.id !== action.payload);
      } else {
        item.qty -= 1;
      }
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    clearCart(state) {
      state.items = [];
      state.panelOpen = false;
    },
    hydrateCart(state, action: PayloadAction<unknown>) {
      state.items = parsePersistedItems(action.payload);
      state.hydrated = true;
    },
    toggleCartPanel(state) {
      state.panelOpen = !state.panelOpen;
    },
    closeCartPanel(state) {
      state.panelOpen = false;
    },
  },
});

export const {
  addItem,
  incrementItem,
  decrementItem,
  removeItem,
  clearCart,
  hydrateCart,
  toggleCartPanel,
  closeCartPanel,
} = cartSlice.actions;

export const cartReducer = cartSlice.reducer;

export const selectCartItems = (state: CartRootState) => state.cart.items;
export const selectCartPanelOpen = (state: CartRootState) => state.cart.panelOpen;
export const selectCartHydrated = (state: CartRootState) => state.cart.hydrated;
export const selectCartCount = (state: CartRootState) =>
  state.cart.items.reduce((total, item) => total + item.qty, 0);
export const selectCanStartCheckout = (state: CartRootState) =>
  state.cart.items.length > 0 &&
  state.cart.items.every((item) => item.checkoutEligible);

function parsePersistedItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate) => {
    if (!isRecord(candidate)) return [];
    const { id, name, price, qty, checkoutEligible } = candidate;
    if (
      typeof id !== "string" ||
      id.length === 0 ||
      typeof name !== "string" ||
      name.length === 0 ||
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price < 0 ||
      typeof qty !== "number" ||
      !Number.isSafeInteger(qty) ||
      qty <= 0
    ) {
      return [];
    }

    return [
      {
        id,
        name,
        price,
        qty,
        checkoutEligible:
          typeof checkoutEligible === "boolean" ? checkoutEligible : false,
      },
    ];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
