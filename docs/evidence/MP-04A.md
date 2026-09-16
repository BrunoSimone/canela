# Evidencia MP-04A — Confirmación autoritativa local

## Alcance verificado

- `POST /api/webhooks/mercado-pago` valida tipo, `data.id`, `live_mode`,
  `x-request-id` y firma HMAC-SHA256 antes de consultar o persistir.
- La notificación solo localiza la order; `GET /v1/orders/{id}` determina el
  estado autoritativo.
- La consulta contrasta provider order, referencia interna, monto, moneda,
  vendedor y aplicación.
- Pedido, intento, reserva, inventario, ajuste y deduplicación cambian en una
  única transacción PostgreSQL.
- Aprobado consume una vez; `processing` conserva; rechazo/cancelación/vencimiento
  liberan una vez; discrepancias conservan y marcan revisión.
- Una venta ya aprobada no retrocede por una entrega tardía.
- Un fallo de persistencia revierte también el identificador deduplicado y el
  mismo delivery puede reintentarse.

## Trazabilidad

- Requisitos: Webhook, consulta autoritativa, stock y seguridad de spec 020.
- Criterios: CA-MP-008, CA-MP-009, CA-MP-010, CA-MP-011, CA-MP-014,
  CA-MP-022, CA-MP-023 y CA-MP-024.
- Plan: MP-04A de `docs/plans/002-mercado-pago-orders-api.md`.

## Evidencia automatizada

- `pnpm test` — 124 pruebas pasaron; 22 de contrato/integración quedaron
  correctamente omitidas por sus puertas de entorno.
- `pnpm test:db` usando exclusivamente Neon `development` — 17 pruebas de
  integración pasaron, incluidas concurrencia, duplicado y rollback.
- `pnpm test:mp` contra la aplicación de prueba — 5 pruebas de contrato pasaron.
- `pnpm lint` — pasó.
- `pnpm exec tsc --noEmit` — pasó.
- `pnpm build` — pasó y registró `/api/webhooks/mercado-pago` como ruta dinámica.
- Smoke HTTP con `next dev` y secreto efímero — firma alterada devolvió `401`;
  firma válida para una order desconocida devolvió `200` sin transición.

## Hallazgo de contrato

El GET real de Orders devuelve `user_id` e
`integration_data.application_id`, pero no `live_mode`. La implementación no
inventa ese dato: separa ambientes por credencial, valida las identidades
autoritativas y usa `live_mode` del body solo como consistencia de entrada.

## Límite pendiente

MP-04A demuestra el comportamiento local y el contrato de consulta, pero no la
entrega real de Webhooks. MP-04B requiere una URL HTTPS de preview y el secreto
generado por Mercado Pago para simular y capturar una notificación firmada.
