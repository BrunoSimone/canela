# ADR-006: stock autoritativo en Sanity

Aceptado por Bruno el 2026-10-17. Sustituye la parte de inventario de ADR-001.

Sanity almacena los saldos y operaciones de inventario; Studio es su interfaz de
gestión. PostgreSQL conserva pedidos, pagos y despacho. No hay sincronización de
dos saldos. Se descarta mantener PostgreSQL como stock detrás de Studio porque
Bruno pidió expresamente que Sanity también almacene las cantidades.

Las transacciones Sanity con CAS por `_rev` protegen reservas simultáneas.
Los saldos viven separados del producto editorial para evitar sobrescrituras al
publicar borradores. IDs privados preservan cantidades y auditoría.

Se pierde la transacción única entre pedido y stock: se sustituye por intención
durable, operaciones remotas idempotentes y recuperación. Un fallo de Sanity
bloquea nuevas compras y retrasa confirmaciones, nunca habilita stock alternativo.
La spec 100 y sus pruebas definen los fallos y la recuperación exigidos.
