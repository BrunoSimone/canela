import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type StartCheckoutInput = {
  items: Array<{ productId: string; quantity: number }>;
  buyerEmail: string;
  shippingQuoteToken: string;
  idempotencyKey: string;
};

export type StartedCheckoutResponse = {
  orderToken: string;
  checkoutUrl: string;
  expiresAt: string;
};

export type UncertainCheckoutResponse = {
  code: "PAYMENT_PROVIDER_UNCERTAIN";
  orderToken: string;
};

export type PublicOrderStatusResponse = {
  status: "verifying" | "paid" | "not_completed" | "review_required";
  canRetry: boolean;
  expiresAt: string;
};

export const checkoutApi = createApi({
  reducerPath: "checkoutApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["PublicOrder"],
  endpoints: (builder) => ({
    startCheckout: builder.mutation<
      StartedCheckoutResponse | UncertainCheckoutResponse,
      StartCheckoutInput
    >({
      query: buildStartCheckoutRequest,
    }),
    getPublicOrderStatus: builder.query<PublicOrderStatusResponse, string>({
      query: (publicToken) => ({
        url: `/orders/${encodeURIComponent(publicToken)}/status`,
        method: "GET",
      }),
      providesTags: (_result, _error, publicToken) => [
        { type: "PublicOrder", id: publicToken },
      ],
    }),
    reconcilePublicOrder: builder.mutation<PublicOrderStatusResponse, string>({
      query: buildReconcilePublicOrderRequest,
      invalidatesTags: (_result, _error, publicToken) => [
        { type: "PublicOrder", id: publicToken },
      ],
    }),
  }),
});

export function buildStartCheckoutRequest(input: StartCheckoutInput) {
  return {
    url: "/checkout",
    method: "POST" as const,
    headers: { "Idempotency-Key": input.idempotencyKey },
    body: {
      items: input.items,
      buyer: { email: input.buyerEmail },
      shippingQuoteToken: input.shippingQuoteToken,
    },
  };
}

export function buildReconcilePublicOrderRequest(publicToken: string) {
  return {
    url: `/orders/${encodeURIComponent(publicToken)}/reconcile`,
    method: "POST" as const,
  };
}

export const {
  useStartCheckoutMutation,
  useGetPublicOrderStatusQuery,
  useReconcilePublicOrderMutation,
} = checkoutApi;
