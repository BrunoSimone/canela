import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { orderableDocumentListDeskItem } from "@sanity/orderable-document-list";
import { esESLocale } from "@sanity/locale-es-es";

import { schema, CATEGORY_OPTIONS } from "./src/sanity/schema";
import { dataset, projectId } from "./src/sanity/env";
import { ProductStockView } from "./src/sanity/product-stock-view";

export default defineConfig({
  name: "default",
  title: "Canela — Productos",
  projectId,
  dataset,
  schema,
  auth: { loginMethod: "token" },
  plugins: [
    esESLocale(),
    structureTool({
      defaultDocumentNode: (S, { schemaType }) => schemaType === "producto"
        ? S.document().views([S.view.form().title("Producto"), S.view.component(ProductStockView).title("Stock")])
        : S.document(),
      structure: (S, context) =>
        S.list()
          .title("Contenido")
          .items([
            orderableDocumentListDeskItem({
              type: "heroSlide",
              id: "hero-slides",
              title: "Hero — Carrusel de portada",
              S,
              context,
            }),
            S.divider(),
            S.documentTypeListItem("shippingBox").title("Cajas de envío"),
            ...CATEGORY_OPTIONS.map((category) =>
              orderableDocumentListDeskItem({
                type: "producto",
                id: `productos-${category.value}`,
                title: `Catálogo · ${category.title}`,
                filter: "category == $category",
                params: { category: category.value },
                S,
                context,
              }),
            ),
          ]),
    }),
  ],
});
