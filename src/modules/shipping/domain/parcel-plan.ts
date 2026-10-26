import { createHash } from "node:crypto";

export type ShippingLine = {
  productId: string;
  quantity: number;
};

export type ParcelDimensions = {
  weightGrams: number;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
};

export type ShippingProfile = ParcelDimensions & {
  productId: string;
  version: number;
  shipSeparately: boolean;
  revision?: string;
  canRotate?: boolean;
  canStack?: boolean;
  classificationId?: string;
};

export type ParcelGroupingRule = {
  id: string;
  version: number;
  items: ShippingLine[];
  parcel: ParcelDimensions;
  classificationId?: string;
};

export type ParcelConstraints = {
  maxWeightGrams: number;
  maxHeightCm: number;
  maxWidthCm: number;
  maxLengthCm: number;
  maxCombinedCm?: number;
  maxUnits: number;
};

export type PlannedParcel = ParcelDimensions & {
  packing?: import("./shared-box-plan").PackingInstructions;
  quoteMargin?: import("./quote-margin").QuoteMargin;
  items: ShippingLine[];
  groupingRule: { id: string; version: number } | null;
  classificationId?: string;
};

export type ParcelPlan = {
  items: ShippingLine[];
  parcels: PlannedParcel[];
  fingerprint: string;
};

export class InvalidParcelPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidParcelPlanError";
  }
}

export class MissingShippingProfileError extends InvalidParcelPlanError {
  constructor(readonly productIds: string[]) {
    super(`Missing shipping profiles: ${productIds.join(", ")}`);
    this.name = "MissingShippingProfileError";
  }
}

export class ParcelLimitExceededError extends InvalidParcelPlanError {
  constructor() {
    super("A parcel exceeds the configured shipping limits");
    this.name = "ParcelLimitExceededError";
  }
}

export type BuildParcelPlanInput = {
  items: ShippingLine[];
  profiles: ShippingProfile[];
  groupingRules: ParcelGroupingRule[];
  constraints: ParcelConstraints;
};

export function buildParcelPlan(input: BuildParcelPlanInput): ParcelPlan {
  validateConstraints(input.constraints);
  const items = normalizeShippingLines(input.items, input.constraints.maxUnits);
  const profiles = new Map<string, ShippingProfile>();

  for (const profile of input.profiles) {
    if (profiles.has(profile.productId)) {
      throw new InvalidParcelPlanError("Duplicate shipping profile");
    }
    validateProfile(profile);
    profiles.set(profile.productId, profile);
  }

  const missing = items
    .filter((item) => !profiles.has(item.productId))
    .map((item) => item.productId);
  if (missing.length > 0) {
    throw new MissingShippingProfileError(missing);
  }

  const matches = input.groupingRules.filter((rule) => {
    positiveInteger(rule.version, "grouping rule version");
    if (!rule.id.trim()) {
      throw new InvalidParcelPlanError("Grouping rule id is required");
    }
    const ruleItems = canonicalLines(rule.items, Number.MAX_SAFE_INTEGER);
    return JSON.stringify(ruleItems) === JSON.stringify(items);
  });
  if (matches.length > 1) {
    throw new InvalidParcelPlanError("Multiple grouping rules match the cart");
  }

  const rule = matches[0];
  let parcels: PlannedParcel[];
  if (rule) {
    if (items.some((item) => profiles.get(item.productId)!.shipSeparately)) {
      throw new InvalidParcelPlanError(
        "A grouping rule conflicts with a product that ships separately",
      );
    }
    validateDimensions(rule.parcel);
    parcels = [{
      weightGrams: rule.parcel.weightGrams,
      heightCm: rule.parcel.heightCm,
      widthCm: rule.parcel.widthCm,
      lengthCm: rule.parcel.lengthCm,
      items,
      groupingRule: { id: rule.id, version: rule.version },
      ...(rule.classificationId ? { classificationId: rule.classificationId } : {}),
    }];
  } else {
    parcels = items.flatMap((item) => {
      const profile = profiles.get(item.productId)!;
      return Array.from({ length: item.quantity }, () => ({
        weightGrams: profile.weightGrams,
        heightCm: profile.heightCm,
        widthCm: profile.widthCm,
        lengthCm: profile.lengthCm,
        items: [{ productId: item.productId, quantity: 1 }],
        groupingRule: null,
        ...(profile.classificationId ? { classificationId: profile.classificationId } : {}),
      }));
    });
  }

  for (const parcel of parcels) {
    if (
      parcel.weightGrams > input.constraints.maxWeightGrams ||
      parcel.heightCm > input.constraints.maxHeightCm ||
      parcel.widthCm > input.constraints.maxWidthCm ||
      parcel.lengthCm > input.constraints.maxLengthCm ||
      (input.constraints.maxCombinedCm !== undefined &&
        parcel.heightCm + parcel.widthCm + parcel.lengthCm >
          input.constraints.maxCombinedCm)
    ) {
      throw new ParcelLimitExceededError();
    }
  }

  const profileSnapshot = items.map(({ productId }) => {
    const profile = profiles.get(productId)!;
    return {
      productId,
      version: profile.version,
      weightGrams: profile.weightGrams,
      heightCm: profile.heightCm,
      widthCm: profile.widthCm,
      lengthCm: profile.lengthCm,
      shipSeparately: profile.shipSeparately,
      ...(profile.classificationId ? { classificationId: profile.classificationId } : {}),
    };
  });
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ version: 1, items, profiles: profileSnapshot, parcels }))
    .digest("hex");

  return { items, parcels, fingerprint };
}

export function normalizeShippingLines(
  items: ShippingLine[],
  maxUnits: number,
): ShippingLine[] {
  positiveInteger(maxUnits, "maxUnits");
  return canonicalLines(items, maxUnits);
}

function canonicalLines(items: ShippingLine[], maxUnits: number): ShippingLine[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new InvalidParcelPlanError("At least one product is required");
  }
  const seen = new Set<string>();
  let units = 0;
  for (const item of items) {
    if (
      !item || typeof item.productId !== "string" ||
      !item.productId.trim() || seen.has(item.productId)
    ) {
      throw new InvalidParcelPlanError("Product ids must be nonempty and unique");
    }
    positiveInteger(item.quantity, "quantity");
    seen.add(item.productId);
    units += item.quantity;
    if (!Number.isSafeInteger(units) || units > maxUnits) {
      throw new InvalidParcelPlanError("Cart exceeds the configured unit limit");
    }
  }
  return items
    .map(({ productId, quantity }) => ({ productId, quantity }))
    .sort((a, b) => a.productId.localeCompare(b.productId));
}

function validateProfile(profile: ShippingProfile): void {
  if (!profile.productId.trim() || typeof profile.shipSeparately !== "boolean") {
    throw new InvalidParcelPlanError("Shipping profile is invalid");
  }
  positiveInteger(profile.version, "shipping profile version");
  validateDimensions(profile);
}

function validateDimensions(dimensions: ParcelDimensions): void {
  positiveInteger(dimensions.weightGrams, "weightGrams");
  positiveInteger(dimensions.heightCm, "heightCm");
  positiveInteger(dimensions.widthCm, "widthCm");
  positiveInteger(dimensions.lengthCm, "lengthCm");
}

function validateConstraints(constraints: ParcelConstraints): void {
  positiveInteger(constraints.maxWeightGrams, "maxWeightGrams");
  positiveInteger(constraints.maxHeightCm, "maxHeightCm");
  positiveInteger(constraints.maxWidthCm, "maxWidthCm");
  positiveInteger(constraints.maxLengthCm, "maxLengthCm");
  if (constraints.maxCombinedCm !== undefined) {
    positiveInteger(constraints.maxCombinedCm, "maxCombinedCm");
  }
}

function positiveInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new InvalidParcelPlanError(`${field} must be a positive integer`);
  }
}
