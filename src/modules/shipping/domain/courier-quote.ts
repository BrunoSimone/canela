import type { PlannedParcel, ShippingLine } from "./parcel-plan";

export type ParcelRate = {
  deliveryType: "home" | "branch";
  serviceCode: string;
  serviceName: string;
  amountCents: number;
};

export type ParcelRateResult = {
  validTo: Date;
  rates: ParcelRate[];
};

export interface ParcelRateGateway {
  quoteParcel(input: {
    deliveryType: "home";
    originPostalCode: string;
    destinationPostalCode: string;
    parcel: PlannedParcel;
  }): Promise<ParcelRateResult>;
}

export type CourierQuoteSnapshot = {
  provider: "correo_argentino";
  environment: "qa" | "production";
  deliveryType: "home";
  originPostalCode: string;
  destinationPostalCode: string;
  items: ShippingLine[];
  planFingerprint: string;
  parcelCount: number;
  serviceCode: string;
  serviceName: string;
  amountCents: number;
  expiresAt: Date;
};

export type IssuedCourierQuote = CourierQuoteSnapshot & {
  token: string;
};

export interface CourierQuoteIssuer {
  issue(snapshot: CourierQuoteSnapshot): IssuedCourierQuote;
}

export class InvalidCourierQuoteInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCourierQuoteInputError";
  }
}

export class UnavailableCourierRateError extends Error {
  constructor() {
    super("The configured courier service is unavailable for a parcel");
    this.name = "UnavailableCourierRateError";
  }
}

export class InvalidCourierRateError extends Error {
  constructor() {
    super("The courier returned an invalid rate");
    this.name = "InvalidCourierRateError";
  }
}

export class InsufficientCourierRateValidityError extends Error {
  constructor() {
    super("The courier rate does not cover the checkout window");
    this.name = "InsufficientCourierRateValidityError";
  }
}

export class CourierQuoteMismatchError extends Error {
  constructor() {
    super("The courier quote does not match the cart or destination");
    this.name = "CourierQuoteMismatchError";
  }
}
