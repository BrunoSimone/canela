import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { orderableDocumentListDeskItem } from "@sanity/orderable-document-list";
import { esESLocale } from "@sanity/locale-es-es";

import { schema, CATEGORY_OPTIONS } from "./src/sanity/schema";
import { dataset, projectId } from "./src/sanity/env";

export default defineConfig({
  name: "default",
  title: "Canela — Productos",
  projectId,
  dataset,
  schema,
  plugins: [
    esESLocale(),
    structureTool({
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
