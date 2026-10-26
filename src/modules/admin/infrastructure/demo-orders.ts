import type { AdminOrder, AdminOrderPage, OrderQuery } from "../domain/order";
import { makeOrderCursor, readOrderCursor } from "../domain/order";

// Fictional records are only available through the explicit local demo mode.
const fixtures: AdminOrder[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    reference: "CAN-2401",
    createdAt: "2026-09-26T16:42:00.000Z",
    updatedAt: "2026-09-26T16:42:00.000Z",
    status: "prepare",
    statusLabel: "Preparar pedido",
    nextAction: "Preparar las piezas y confirmar el embalaje.",
    buyer: { name: "Lucía Fernández", email: "lucia.ejemplo@example.com", phone: "+54 221 555-0101" },
    destination: { locality: "La Plata", province: "Buenos Aires" },
    shippingAddress: "Calle 12 430, piso 2",
    deliveryMethod: "A domicilio",
    trackingNumber: null,
    preparation: null,
    currency: "ARS",
    subtotalCents: 8650000,
    shippingCents: 990000,
    totalCents: 9640000,
    items: [
      { productId: "demo-fuente", name: "Fuente de cerámica esmaltada", quantity: 1, unitPriceCents: 6200000 },
      { productId: "demo-vaso", name: "Vaso de vidrio ámbar", quantity: 2, unitPriceCents: 1225000 },
    ],
    source: "demo",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    reference: "CAN-2400",
    createdAt: "2026-09-25T13:05:00.000Z",
    updatedAt: "2026-09-25T13:05:00.000Z",
    status: "attention",
    statusLabel: "Necesita revisión",
    nextAction: "Pedí ayuda técnica para verificar el pago y la reserva de stock antes de preparar el pedido. Compartí el ID del pedido.",
    buyer: { name: "Martín Ríos", email: "martin.ejemplo@example.com", phone: "+54 351 555-0102" },
    destination: { locality: "Córdoba", province: "Córdoba" },
    shippingAddress: "Av. Colón 830",
    deliveryMethod: "A domicilio",
    trackingNumber: null,
    preparation: null,
    currency: "ARS",
    subtotalCents: 12400000,
    shippingCents: 1450000,
    totalCents: 13850000,
    items: [{ productId: "demo-espejo", name: "Espejo con marco artesanal", quantity: 1, unitPriceCents: 12400000 }],
    source: "demo",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    reference: "CAN-2399",
    createdAt: "2026-09-24T18:18:00.000Z",
    updatedAt: "2026-09-24T18:18:00.000Z",
    status: "shipped",
    statusLabel: "Despachado",
    nextAction: "Consultar el seguimiento en Correo Argentino.",
    buyer: { name: "Valentina Paz", email: "valentina.ejemplo@example.com", phone: "+54 341 555-0103" },
    destination: { locality: "Rosario", province: "Santa Fe" },
    shippingAddress: "San Lorenzo 1220",
    deliveryMethod: "A domicilio",
    trackingNumber: "DEMO-PAQAR-2399",
    preparation: null,
    currency: "ARS",
    subtotalCents: 4900000,
    shippingCents: 890000,
    totalCents: 5790000,
    items: [{ productId: "demo-cuadro", name: "Cuadro botánico", quantity: 1, unitPriceCents: 4900000 }],
    source: "demo",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    reference: "CAN-2398",
    createdAt: "2026-09-23T11:30:00.000Z",
    updatedAt: "2026-09-23T11:30:00.000Z",
    status: "payment_verification",
    statusLabel: "Pago en verificación",
    nextAction: "Esperar la confirmación del pago.",
    buyer: { name: "Sofía Costa", email: "sofia.ejemplo@example.com", phone: "+54 261 555-0104" },
    destination: { locality: "Mendoza", province: "Mendoza" },
    shippingAddress: "Belgrano 560",
    deliveryMethod: "A domicilio",
    trackingNumber: null,
    preparation: null,
    currency: "ARS",
    subtotalCents: 7300000,
    shippingCents: 1200000,
    totalCents: 8500000,
    items: [{ productId: "demo-bandeja", name: "Bandeja de cerámica", quantity: 1, unitPriceCents: 7300000 }],
    source: "demo",
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    reference: "CAN-2397",
    createdAt: "2026-09-22T15:20:00.000Z",
    updatedAt: "2026-09-22T15:20:00.000Z",
    status: "ready_to_ship",
    statusLabel: "Listo para crear envío",
    nextAction: "Confirmar las medidas reales antes de generar el envío.",
    buyer: { name: "Elena Medina", email: "elena.ejemplo@example.com", phone: "+54 11 5555-0105" },
    destination: { locality: "CABA", province: "Buenos Aires" },
    shippingAddress: "Salguero 1550",
    deliveryMethod: "A domicilio",
    trackingNumber: null,
    currency: "ARS",
    subtotalCents: 5300000,
    shippingCents: 780000,
    totalCents: 6080000,
    preparation: {
      version: 1,
      parcels: [{ weightGrams: 1250, heightCm: 32, widthCm: 24, lengthCm: 22 }],
      note: "Proteger el borde antes de cerrar la caja.",
      updatedAt: "2026-09-22T17:00:00.000Z",
      updatedBy: "duenio.ejemplo@canela.test",
    },
    items: [{ productId: "demo-florero", name: "Florero de vidrio soplado", quantity: 1, unitPriceCents: 5300000 }],
    source: "demo",
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    reference: "CAN-2396",
    createdAt: "2026-09-21T17:45:00.000Z",
    updatedAt: "2026-09-21T17:45:00.000Z",
    status: "label_ready",
    statusLabel: "Rótulo listo",
    nextAction: "Imprimir el rótulo y coordinar el despacho.",
    buyer: { name: "Tomás Aguirre", email: "tomas.ejemplo@example.com", phone: "+54 223 555-0106" },
    destination: { locality: "Mar del Plata", province: "Buenos Aires" },
    shippingAddress: "Alberti 480",
    deliveryMethod: "A domicilio",
    trackingNumber: "DEMO-PAQAR-2396",
    preparation: null,
    currency: "ARS",
    subtotalCents: 10500000,
    shippingCents: 1500000,
    totalCents: 12000000,
    items: [{ productId: "demo-espejo-redondo", name: "Espejo circular", quantity: 1, unitPriceCents: 10500000 }],
    source: "demo",
  },
  {
    id: "77777777-7777-4777-8777-777777777777",
    reference: "CAN-2395",
    createdAt: "2026-09-20T09:55:00.000Z",
    updatedAt: "2026-09-20T09:55:00.000Z",
    status: "cancelled",
    statusLabel: "Cancelado",
    nextAction: "No preparar este pedido.",
    buyer: { name: "Ana López", email: "ana.ejemplo@example.com", phone: "+54 11 5555-0107" },
    destination: { locality: "San Isidro", province: "Buenos Aires" },
    shippingAddress: "Av. Centenario 1420",
    deliveryMethod: "A domicilio",
    trackingNumber: null,
    preparation: null,
    currency: "ARS",
    subtotalCents: 4200000,
    shippingCents: 780000,
    totalCents: 4980000,
    items: [{ productId: "demo-taza", name: "Taza de cerámica", quantity: 1, unitPriceCents: 4200000 }],
    source: "demo",
  },
];

export function demoOrderById(id: string): AdminOrder | null {
  return fixtures.find((order) => order.id === id) ?? null;
}

export function listDemoOrders(query: OrderQuery): AdminOrderPage {
  const needle = query.q.toLocaleLowerCase("es-AR");
  const matches = fixtures.filter((order) => !needle || [
    order.reference,
    order.id,
    order.buyer.name ?? "",
    order.buyer.email ?? "",
    order.trackingNumber ?? "",
    ...order.items.map((item) => item.name),
  ].some((value) => value.toLocaleLowerCase("es-AR").includes(needle)));

  matches.sort((a, b) => {
    const comparison = a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
    return query.sort === "created_asc" ? comparison : -comparison;
  });
  const cursor = query.cursor ? readOrderCursor(query.cursor) : null;
  const afterCursor = cursor ? matches.filter((order) => {
    const comparison = order.createdAt.localeCompare(cursor.createdAt) || order.id.localeCompare(cursor.id);
    return query.sort === "created_asc" ? comparison > 0 : comparison < 0;
  }) : matches;
  const page = afterCursor.slice(0, query.limit);
  return {
    orders: page,
    nextCursor: afterCursor.length > query.limit && page.length
      ? makeOrderCursor(page[page.length - 1].createdAt, page[page.length - 1].id)
      : null,
  };
}
