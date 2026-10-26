import { ALL_FIELDS_GROUP, type SchemaTypeDefinition } from "sanity";
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

const producto: SchemaTypeDefinition = {
  name: "producto",
  title: "Producto",
  type: "document",
  groups: [
    { name: "product", title: "Datos del producto", default: true },
    { name: "shipping", title: "Envío" },
    { ...ALL_FIELDS_GROUP, hidden: true },
  ],
  fieldsets: [
    {
      name: "optional",
      title: "Detalles opcionales",
      description: "Información adicional para el comprador. Podés dejarlos vacíos.",
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    {
      name: "name",
      title: "Nombre",
      type: "string",
      group: "product",
      validation: (rule) => rule.required(),
    },
    {
      name: "description",
      title: "Descripción",
      type: "text",
      group: "product",
      rows: 3,
      description:
        "Texto corto que aparece en la tarjeta del producto (opcional).",
    },
    {
      name: "category",
      title: "Categoría",
      type: "string",
      group: "product",
      options: { list: CATEGORY_OPTIONS, layout: "radio" },
      validation: (rule) => rule.required(),
    },
    {
      name: "sub",
      title: "Subcategoría",
      type: "string",
      group: "product",
      description:
        "Vidrio → Reciclado / Vitrofusión · Cerámica → Casa / Jardín · Espejos y Cuadros → Espejos / Cuadros",
      options: { list: SUB_OPTIONS },
      validation: (rule) => rule.required(),
    },
    {
      name: "price",
      title: "Precio (ARS)",
      type: "number",
      group: "product",
      description: "Solo el número, sin símbolos. Ej: 8500",
      validation: (rule) => rule.required().min(0),
    },
    {
      name: "images",
      title: "Fotos",
      type: "array",
      group: "product",
      of: [{ type: "image", options: { hotspot: true } }],
      description: "La primera foto es la portada. Las demás se ven al ampliar la pieza.",
      options: { layout: "grid" },
      validation: (rule) => rule.required().min(1),
    },
    {
      name: "tone",
      title: "Modalidad anterior (sin uso)",
      type: "string",
      hidden: true,
      readOnly: true,
    },
    {
      name: "statusNote",
      title: "Nota anterior (sin uso)",
      type: "string",
      hidden: true,
      readOnly: true,
    },
    {
      name: "medidas",
      title: "Medidas sin envolver (opcional)",
      type: "string",
      group: "product",
      fieldset: "optional",
      description: 'Se muestran al comprador. Ej: "Alto 18 cm · Ø 10 cm". Las medidas con protección se cargan en Envío.',
    },
    {
      name: "shippingProfile",
      title: "Unidad protegida para envío",
      type: "object",
      group: "shipping",
      options: { collapsible: false },
      initialValue: { version: 1, shipSeparately: false, canRotate: false, canStack: false },
      description:
        "Medí y pesá UNA pieza con su protección individual, sin la caja exterior. Completá peso, medidas y contenido para calcular el envío. Las cajas se cargan una vez en Cajas de envío.",
      fieldsets: [
        {
          name: "dimensions",
          title: "Medidas con protección (cm)",
          description: "Redondeá hacia arriba: 12,4 cm = 13 cm.",
          options: { collapsible: false, columns: 3 },
        },
        {
          name: "packing",
          title: "Acomodo de la pieza",
          description: "Abrí estas opciones si la pieza admite giro o apilado, o necesita su propia caja.",
          options: { collapsible: true, collapsed: true },
        },
      ],
      fields: [
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
          title: "Peso (g)",
          type: "number",
          description: "En gramos enteros: 1,25 kg = 1250 g.",
          validation: (rule) => rule.required().integer().min(10),
        },
        {
          name: "heightCm",
          title: "Alto",
          type: "number",
          fieldset: "dimensions",
          validation: (rule) => rule.required().integer().min(1),
        },
        {
          name: "widthCm",
          title: "Ancho",
          type: "number",
          fieldset: "dimensions",
          validation: (rule) => rule.required().integer().min(1),
        },
        {
          name: "lengthCm",
          title: "Largo",
          type: "number",
          fieldset: "dimensions",
          validation: (rule) => rule.required().integer().min(1),
        },
        {
          name: "classificationId",
          title: "Contenido del envío",
          type: "string",
          description: "Es lo que declaramos al transporte. Elegí según la pieza; sin esta selección no se puede calcular el envío.",
          options: { list: [
            { title: "Vidrio, espejos o cuadros con vidrio", value: "6" },
            { title: "Cerámica decorativa o cuadros sin vidrio", value: "1" },
            { title: "Pisos y revestimientos cerámicos", value: "4" },
            { title: "Bachas de cocina o vanitory", value: "3" },
          ] },
          validation: (rule) => rule.regex(/^[A-Za-z0-9_-]{1,50}$/),
        },
        { name: "canRotate", title: "Se puede girar sobre la base", type: "boolean", fieldset: "packing", initialValue: false, description: "Conserva la pieza vertical; permite intercambiar ancho y largo." },
        { name: "canStack", title: "Admite otras piezas protegidas encima", type: "boolean", fieldset: "packing", initialValue: false, description: "Activar solo si comprobaste que la protección soporta ese peso. Desactivado, el pedido se acomoda en una sola capa." },
        {
          name: "shipSeparately",
          title: "Esta pieza necesita una caja exclusiva",
          description: "Activar solo si nunca puede compartir caja con otras piezas.",
          type: "boolean",
          fieldset: "packing",
          initialValue: false,
        },
      ],
    },
    {
      name: "material",
      title: "Material (opcional)",
      type: "string",
      group: "product",
      fieldset: "optional",
      description: 'Ej: "Vidrio reciclado", "Cerámica esmaltada".',
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
