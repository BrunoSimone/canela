# Evidencia MP-03A: orquestación del inicio de checkout

## Fecha y entorno

- 2026-09-15.
- Next.js 16.2.9, TypeScript estricto y Vitest 5.
- PostgreSQL 17 en un contenedor efímero para pruebas destructivas.
- Neon PostgreSQL 17, branch `development`, solo para aplicar y comprobar
  migraciones aditivas.
- Mercado Pago simulado en este incremento; el contrato real quedó cubierto por
  MP-02B.

## Requisito → implementación → prueba → resultado

| Requisito | Implementación | Prueba | Resultado |
| --- | --- | --- | --- |
| Reserva antes del proveedor | El repositorio crea pedido, ítems, reservas e intento de pago dentro de una transacción | Se inspeccionan todas las filas contra PostgreSQL real | Aprobada |
| Snapshot inmutable | Un reintento relee ítems, email, envío y totales persistidos | El segundo request altera esos datos y recibe el snapshot original | Aprobada |
| Idempotencia interna y externa | Una clave identifica el pedido Canela y el intento de Orders API | El checkout persistido se devuelve sin una segunda llamada al proveedor | Aprobada |
| Fallo definitivo | La transición libera únicamente reservas activas y marca pedido/intento rechazados | Ejecutar la liberación dos veces conserva `reserved = 0` | Aprobada |
| Resultado ambiguo | Timeout, fallo reintentable o respuesta incoherente pasan a revisión sin liberar | Tests unitarios verifican cero llamadas de liberación; integración conserva reserva activa | Aprobada |
| Proveedor ya creado | La persistencia rechaza una identidad parcial y la liberación defensiva falla si existe `provider_order_id` | Restricción PostgreSQL y prueba negativa del repositorio | Aprobada |
| Migraciones concurrentes | El runner toma el advisory lock antes de crear su tabla de control | Dos suites detectaron la carrera original; la ejecución serializada posterior pasó | Aprobada |

## Cambios de persistencia

- `0003_checkout_payment_attempt.sql`: un intento de pago por pedido Canela.
- `0004_payment_attempt_provider_pair.sql`: `provider_order_id` y `checkout_url`
  deben existir juntos o permanecer ambos vacíos.
- El intento de pago nace en la misma transacción que la reserva.

## Verificaciones

```text
pnpm test
TEST_DATABASE_URL=<postgres-efimero> pnpm test:db
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm db:migrate
```

## Límites

- Todavía no existe el Route Handler público, la cotización firmada ni la
  pantalla de retorno; corresponden a MP-03B.
- No se confirma ningún pago ni se consume stock; Webhook y consulta
  autoritativa corresponden a MP-04.
- El checkout productivo continúa deshabilitado hasta integrar una cotización
  válida de Correo Argentino.
