import type { SchemaTypeDefinition } from "sanity";
import { orderRankField } from "@sanity/orderable-document-list";

export const CATEGORY_OPTIONS = [
  { title: "Vidrio", value: "vidrio" },
  { title: "Cerámica", value: "ceramica" },
  { title: "Espejos y Cuadros", value: "espejos" },
];

const SUB_OPTIONS = [
  { title: "Reciclado", value: "Reciclado" },
  { title: "Vitrofusión", value: "Vitrofusión" },
  { title: "Casa", value: "Casa" },
  { title: "Jardín", value: "Jardín" },
  { title: "Espejos", value: "Espejos" },
  { title: "Cuadros", value: "Cuadros" },
];

const TONE_OPTIONS = [
  { title: "Pieza única", value: "unica" },
  { title: "En stock", value: "stock" },
  { title: "Por encargo", value: "encargo" },
];

const producto: SchemaTypeDefinition = {
  name: "producto",
  title: "Producto",
  type: "document",
  fields: [
    {
      name: "name",
      title: "Nombre",
      type: "string",
      validation: (rule) => rule.required(),
    },
    {
      name: "category",
      title: "Categoría",
      type: "string",
      options: { list: CATEGORY_OPTIONS, layout: "radio" },
      validation: (rule) => rule.required(),
    },
    {
      name: "sub",
      title: "Subcategoría",
      type: "string",
      description:
        "Vidrio → Reciclado / Vitrofusión · Cerámica → Casa / Jardín · Espejos y Cuadros → Espejos / Cuadros",
      options: { list: SUB_OPTIONS },
      validation: (rule) => rule.required(),
    },
    {
      name: "price",
      title: "Precio (ARS)",
      type: "number",
      description: "Solo el número, sin símbolos. Ej: 8500",
      validation: (rule) => rule.required().min(0),
    },
    {
      name: "tone",
      title: "Estado",
      type: "string",
      options: { list: TONE_OPTIONS, layout: "radio" },
      initialValue: "stock",
      validation: (rule) => rule.required(),
    },
    {
      name: "statusNote",
      title: "Nota de estado (opcional)",
      type: "string",
      description:
        'Detalle del estado, sobre todo para "Por encargo". Ej: "Por encargo · 2 sem"',
    },
    {
      name: "images",
      title: "Fotos",
      type: "array",
      of: [{ type: "image", options: { hotspot: true } }],
      description:
        "La primera foto es la portada de la tarjeta. Podés subir varias: se " +
        "ven en un carrusel al ampliar la pieza.",
      options: { layout: "grid" },
      validation: (rule) => rule.required().min(1),
    },
    orderRankField({ type: "producto" }),
  ],
  preview: {
    select: { title: "name", subtitle: "category", media: "images.0" },
  },
};

const heroSlide: SchemaTypeDefinition = {
  name: "heroSlide",
  title: "Slide del hero",
  type: "document",
  fields: [
    {
      name: "name",
      title: "Nombre de la pieza",
      type: "string",
      validation: (rule) => rule.required(),
    },
    {
      name: "caption",
      title: "Etiqueta (arriba del nombre)",
      type: "string",
      description: 'Ej: "Vidrio · Vitrofusión" o "Espejos y Cuadros".',
      validation: (rule) => rule.required(),
    },
    {
      name: "category",
      title: "Sección a la que enlaza",
      type: "string",
      description: "Al tocar la pieza, lleva a esta sección del catálogo.",
      options: { list: CATEGORY_OPTIONS, layout: "radio" },
      validation: (rule) => rule.required(),
    },
    {
      name: "image",
      title: "Foto",
      type: "image",
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    },
    orderRankField({ type: "heroSlide" }),
  ],
  preview: {
    select: { title: "name", subtitle: "caption", media: "image" },
  },
};

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [producto, heroSlide],
};
