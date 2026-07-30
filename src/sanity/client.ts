import { createClient } from "next-sanity";
import { createImageUrlBuilder, type SanityImageSource } from "@sanity/image-url";

import { apiVersion, dataset, projectId } from "./env";

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
});

const builder = createImageUrlBuilder(client);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

// True only when the image actually has an uploaded asset. Guards against empty
// image slots the client may leave in Sanity, which would otherwise make urlFor
// throw and crash the whole prerender.
export function hasAsset(
  source: SanityImageSource | null | undefined,
): source is SanityImageSource {
  return Boolean(
    source &&
      typeof source === "object" &&
      "asset" in source &&
      (source as { asset?: unknown }).asset,
  );
}
