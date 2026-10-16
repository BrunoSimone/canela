import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "@/sanity/env";
import { validateBox, type ShippingBox } from "../../domain/shared-box-plan";

const client = createClient({ projectId, dataset, apiVersion, useCdn: false });
export class SanityShippingBoxes {
  async list(): Promise<ShippingBox[]> {
    const boxes = await client.fetch<ShippingBox[]>(`*[_type == "shippingBox" && active == true] {
      "id": _id, "revision": _rev, name, innerHeightCm, innerWidthCm, innerLengthCm,
      heightCm, widthCm, lengthCm, tareWeightGrams, maxWeightGrams
    }`, {}, { cache: "no-store", perspective: "published" });
    boxes.forEach(validateBox);
    return boxes;
  }
}
