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
  { title: "Venta por unidades", value: "stock" },
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
      name: "description",
      title: "Descripción",
      type: "text",
      rows: 3,
      description:
        "Texto corto que aparece en la tarjeta del producto (opcional).",
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
      title: "Modalidad de venta",
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
      name: "medidas",
      title: "Medidas",
      type: "string",
      description: 'Ej: "20 × 12 cm" o "Alto 18 cm · Ø 10 cm".',
      validation: (rule) => rule.required(),
    },
    {
      name: "shippingProfile",
      title: "Unidad protegida para envío",
      type: "object",
      initialValue: { version: 1, shipSeparately: false, canRotate: false, canStack: false },
      description:
        "Medí y pesá UNA pieza con su papel, separadores o protección individual, SIN la caja exterior compartida. Podés cargar las medidas ahora y completar la clasificación después. La tienda solo cotiza perfiles completos.",
      fields: [
        { name: "canRotate", title: "Se puede girar 90° sobre la base", type: "boolean", initialValue: false, description: "Conserva la pieza vertical; permite intercambiar ancho y largo." },
        { name: "canStack", title: "Admite otras piezas protegidas encima", type: "boolean", initialValue: false, description: "Activar únicamente si la protección soporta ese apilado. Si alguna pieza no lo permite, el pedido se acomoda en una sola capa." },
        {
          name: "classificationId",
          title: "Clasificación de mercadería en Zipnova",
          type: "string",
          description: "ID o código confirmado por Zipnova para esta pieza. Consultar condiciones para vidrio, cerámica y espejos; no asumir General. Sin este dato no se cotiza.",
          validation: (rule) => rule.regex(/^[A-Za-z0-9_-]{1,50}$/),
        },
        {
          name: "version",
          title: "Versión del perfil",
          hidden: true,
          type: "number",
          initialValue: 1,
          validation: (rule) => rule.integer().min(1),
        },
        {
          name: "weightGrams",
          title: "Peso de la unidad protegida (g)",
          type: "number",
          validation: (rule) => rule.required().integer().min(10),
        },
        {
          name: "heightCm",
          title: "Alto de la unidad protegida (cm)",
          type: "number",
          validation: (rule) => rule.required().integer().min(1),
        },
        {
          name: "widthCm",
          title: "Ancho de la unidad protegida (cm)",
          type: "number",
          validation: (rule) => rule.required().integer().min(1),
        },
        {
          name: "lengthCm",
          title: "Largo de la unidad protegida (cm)",
          type: "number",
          validation: (rule) => rule.required().integer().min(1),
        },
        {
          name: "shipSeparately",
          title: "Esta pieza necesita una caja exclusiva",
          description: "Activar solo si nunca puede compartir caja con otras piezas.",
          type: "boolean",
          initialValue: false,
        },
      ],
    },
    {
      name: "material",
      title: "Material (opcional)",
      type: "string",
      description: 'Ej: "Vidrio reciclado", "Cerámica esmaltada".',
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

const shippingBox: SchemaTypeDefinition = {
  name: "shippingBox", title: "Caja de envío", type: "document",
  fields: [
    { name: "name", title: "Nombre para reconocerla en el taller", type: "string", validation: r => r.required() },
    { name: "active", title: "Disponible para preparar pedidos", type: "boolean", initialValue: false },
    ...["height", "width", "length"].map((axis, index) => ({
      name: `inner${axis[0].toUpperCase()}${axis.slice(1)}Cm`,
      title: `${["Alto", "Ancho", "Largo"][index]} interior útil (cm)`, type: "number",
      description: "Espacio libre después de colocar revestimiento y protección de la caja.",
      validation: (r: import("sanity").Rule) => r.required().integer().min(1).max(5000),
    })),
    ...["height", "width", "length"].map((axis, index) => ({
      name: `${axis}Cm`, title: `${["Alto", "Ancho", "Largo"][index]} exterior (cm)`, type: "number",
      validation: (r: import("sanity").Rule) => r.required().integer().min(1).max(5000),
    })),
    { name: "tareWeightGrams", title: "Peso de caja y relleno común (g)", type: "number", description: "Sin productos. Incluí cinta, separadores y relleno adicional habitual.", validation: r => r.required().integer().min(1) },
    { name: "maxWeightGrams", title: "Peso máximo total que admite (g)", type: "number", description: "Incluye productos, protecciones y caja.", validation: r => r.required().integer().min(10) },
  ],
  validation: (rule: import("sanity").Rule) => rule.custom((value: unknown) => {
    if (!value) return true;
    const box = value as Record<string, unknown>;
    for (const axis of ["height", "width", "length"]) {
      const inside = box[`inner${axis[0].toUpperCase()}${axis.slice(1)}Cm`], outside = box[`${axis}Cm`];
      if (typeof inside === "number" && typeof outside === "number" && inside > outside) return "El espacio interior no puede superar la medida exterior.";
    }
    return typeof box.tareWeightGrams === "number" && typeof box.maxWeightGrams === "number" && box.tareWeightGrams >= box.maxWeightGrams ? "El peso máximo debe ser mayor que el peso de la caja vacía." : true;
  }),
  preview: { select: { title: "name" } },
};

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [producto, heroSlide, shippingBox],
};
