import { InvalidCheckoutItemsError, ProductNotSellableError } from "../../../checkout/application/resolve-checkout-items";
import { UnshippableProductError } from "../../application/plan-shipping-parcels";
import { CourierProviderUnavailableError, CourierQuoteMismatchError, CourierRateChangedError, InvalidCourierQuoteInputError, InvalidCourierRateError, ShippingRateLimitedError, UnavailableCourierRateError } from "../../domain/courier-quote";
import { InvalidParcelPlanError, MissingShippingProfileError, ParcelLimitExceededError } from "../../domain/parcel-plan";

export function shippingErrorResponse(error: unknown): Response | null {
  if (error instanceof UnshippableProductError || error instanceof MissingShippingProfileError) return json("UNSHIPPABLE_ITEM", 422);
  if (error instanceof ParcelLimitExceededError) return json("PACKAGE_LIMIT_EXCEEDED", 422);
  if (error instanceof InvalidCourierQuoteInputError || error instanceof InvalidParcelPlanError || error instanceof InvalidCheckoutItemsError) return json("INVALID_SHIPPING_REQUEST", 422);
  if (error instanceof ProductNotSellableError) return json("PRODUCT_NOT_SELLABLE", 422);
  if (error instanceof CourierQuoteMismatchError) return json("SHIPPING_QUOTE_MISMATCH", 409);
  if (error instanceof CourierRateChangedError) return json("SHIPPING_RATE_CHANGED", 409);
  if (error instanceof UnavailableCourierRateError) return json("SHIPPING_NOT_AVAILABLE", 422);
  if (error instanceof CourierProviderUnavailableError || error instanceof InvalidCourierRateError) return json("SHIPPING_PROVIDER_UNAVAILABLE", 503);
  if (error instanceof ShippingRateLimitedError) return json("SHIPPING_RATE_LIMITED", 429);
  return null;
}
function json(code: string, status: number) { return Response.json({ code }, { status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "60" } : {}) } }); }
