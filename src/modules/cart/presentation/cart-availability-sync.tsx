"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { reconcileCartAvailability, selectCartHydrated } from "./state/cart-slice";

/** Refresh persisted eligibility from a server snapshot after local hydration. */
export function CartAvailabilitySync({ availableProductIds }: { availableProductIds: string[] }) {
  const dispatch = useAppDispatch();
  const hydrated = useAppSelector(selectCartHydrated);
  useEffect(() => {
    if (hydrated) dispatch(reconcileCartAvailability(availableProductIds));
  }, [dispatch, hydrated, availableProductIds]);
  return null;
}
