# Inventario autoritativo en Sanity

2026-10-17. Bruno confirma que Sanity debe almacenar las cantidades y que el
checkout debe adaptar reservas y pagos. Reemplaza la autoridad de stock de
ADR-001 y la pantalla separada de OPEN-04; PostgreSQL conserva pedidos y pagos.

## Criterios de aceptación

- **INV-01:** Stock, reservas y ajustes viven exclusivamente en documentos de
  Sanity. No hay copia editable ni fallback de cantidades en PostgreSQL.
- **INV-02:** El cliente administra el stock desde la ficha del producto en
  Studio. Los saldos operativos se guardan inmediatamente en documentos separados
  del borrador editorial: publicar fotos/precios nunca repone stock vendido.
- **INV-03:** Reservar un carrito modifica todos sus saldos y crea su reserva en
  una única transacción Sanity con precondiciones `_rev`. Dos compras de la última
  unidad producen una única reserva. Sin disponibilidad no se llama a MP.
- **INV-04:** Confirmar/rechazar pagos consume/libera una sola vez. El identificador
  de pedido identifica la operación; un timeout conserva el estado incierto y un
  reintento consulta el resultado. Pago aprobado sin reserva válida va a revisión.
- **INV-05:** Primero se persiste el pedido/intención en PostgreSQL y luego se
  reserva en Sanity. MP solo se invoca después de confirmar esa reserva. Un fallo
  entre bases es recuperable por idempotencia. La herramienta técnica manual
  de la [spec 121](121-recuperacion-manual-sin-cron.md) cancela intenciones
  abandonadas sin MP; no libera reservas con pagos en curso por el reloj.
- **INV-06:** Los documentos de stock usan IDs privados con puntos. Nunca se
  devuelven cantidades ni credenciales al comprador. Solo un usuario Sanity
  autorizado del proyecto puede ajustar; auditoría, motivo y control de versión.
- **INV-07:** Cantidad significa unidades aún no vendidas, incluyendo reservas
  de pagos pendientes; excluye pedidos ya pagados aunque sigan en el taller.
  Pieza única <= 1, cantidades enteras no negativas, saldo >= reservas.
- **INV-08:** Pruebas de concurrencia, carrito atómico, publicación editorial,
  reintentos, fallos entre bases, cancelación, autorización y compra integrada.
  Contrato real de Sanity en dataset de pruebas, separado de producción.
- **INV-09:** Migración verificable, conservación del historial previo y retiro
  de código/UI de stock PostgreSQL. Tienda continúa cerrada durante el cambio.

## Diseño

`canelaInventory` por producto, `canelaReservation` por pedido y
`canelaInventoryChange` por ajuste. Mutaciones condicionadas por revisión y
creación exclusiva del documento de operación, sin CDN. Datos operativos fuera
de los borradores del producto. Test usa otro dataset; producción `production`.

PostgreSQL mantiene snapshots de ítems/estados del pedido, no saldos de inventario.
La confirmación Sanity precede al commit de pago local; un reintento converge al
mismo resultado si el commit local falla. Las intenciones previas a MP tienen
estado durable y la cancelación crea una marca terminal también cuando no llegó
a crearse la reserva, impidiendo una reserva tardía después de la limpieza.

Referencias: [transacciones](https://www.sanity.io/docs/content-lake/transactions),
[privacidad de IDs con puntos](https://www.sanity.io/docs/content-lake/ids).
