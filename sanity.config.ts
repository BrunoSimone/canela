import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { orderableDocumentListDeskItem } from "@sanity/orderable-document-list";
import { esESLocale } from "@sanity/locale-es-es";

import { schema, CATEGORY_OPTIONS } from "./src/sanity/schema";
import { projectId } from "./src/sanity/env";
import { resolveCatalogDataset } from "./src/sanity/catalog-dataset";
import { ArchiveLayout } from "./src/sanity/archive-layout";
import { ProductStockView } from "./src/sanity/product-stock-view";

const archive = process.env.SANITY_STUDIO_READ_ONLY === "1";
const catalogDataset = resolveCatalogDataset(process.env.SANITY_STUDIO_DATASET);

export default defineConfig([{
  basePath: "/",
  name: "default",
  title: archive ? "Canela — Respaldo" : "Canela — Productos",
  projectId,
  dataset: catalogDataset,
  schema: archive ? { ...schema, types: schema.types.map(type => ({...type, readOnly:true})) } : schema,
  ...(archive ? { studio:{components:{layout:ArchiveLayout}},document:{actions:()=>[],newDocumentOptions:()=>[]} } : {}),
  auth: { loginMethod: "token" },
  plugins: [
    esESLocale(),
    structureTool({
      defaultDocumentNode: (S, { schemaType }) => !archive && schemaType === "producto"
        ? S.document().views([S.view.form().title("Producto"), S.view.component(ProductStockView).title("Stock")])
        : S.document(),
      structure: (S, context) =>
        S.list()
          .title(archive ? "Respaldo de solo lectura" : "Contenido")
          .items(archive ? [S.documentTypeListItem("producto"),S.documentTypeListItem("heroSlide"),S.documentTypeListItem("shippingBox"),S.documentTypeListItem("frameDesign")] : [
            orderableDocumentListDeskItem({
              type: "heroSlide",
              id: "hero-slides",
              title: "Hero — Carrusel de portada",
              S,
              context,
            }),
            S.divider(),
            S.documentTypeListItem("shippingBox").title("Cajas de envío"),
            S.documentTypeListItem("frameDesign").title("Cuadros · Galería"),
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
}]);
