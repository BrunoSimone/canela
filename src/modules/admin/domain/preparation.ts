import type { ParcelDimensions } from "../../shipping/domain/parcel-plan";

export type OrderPreparation = {
  version: number;
  parcels: ParcelDimensions[];
  note: string | null;
  updatedAt: string;
  updatedBy: string;
};

export type SavePreparationInput = {
  expectedVersion: number;
  parcels: ParcelDimensions[];
  note: string | null;
};

export class InvalidPreparationError extends Error {
  constructor() {
    super("Invalid preparation details");
    this.name = "InvalidPreparationError";
  }
}

export function parseSavePreparationInput(value: unknown): SavePreparationInput {
  if (!isRecord(value) || !Number.isSafeInteger(value.expectedVersion) ||
    (value.expectedVersion as number) < 0 || (value.expectedVersion as number) >= 2_147_483_647 || !Array.isArray(value.parcels) ||
    value.parcels.length < 1 || value.parcels.length > 20) {
    throw new InvalidPreparationError();
  }
  const note = value.note === null || value.note === undefined ? null : value.note;
  if (note !== null && (typeof note !== "string" || note.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\p{Cf}]/u.test(note))) {
    throw new InvalidPreparationError();
  }
  return {
    expectedVersion: value.expectedVersion as number,
    parcels: value.parcels.map((parcel) => {
      if (!isRecord(parcel)) throw new InvalidPreparationError();
      const fields = ["weightGrams", "heightCm", "widthCm", "lengthCm"] as const;
      for (const field of fields) {
        const maximum = field === "weightGrams" ? 100_000 : 200;
        if (!Number.isSafeInteger(parcel[field]) || (parcel[field] as number) < 1 || (parcel[field] as number) > maximum) {
          throw new InvalidPreparationError();
        }
      }
      return {
        weightGrams: parcel.weightGrams as number,
        heightCm: parcel.heightCm as number,
        widthCm: parcel.widthCm as number,
        lengthCm: parcel.lengthCm as number,
      };
    }),
    note: typeof note === "string" ? note.trim() || null : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
