# Runbook — Recuperación de pagos Mercado Pago

## Objetivo

Diagnosticar pedidos que permanecen pendientes o pasan a revisión sin liberar
stock por tiempo transcurrido ni iniciar un segundo cobro.

Este procedimiento es para operación técnica. El dueño de la tienda no debe
reconciliar pagos ni modificar inventario manualmente.

## Invariantes

- `expires_at` indica la ventana ofrecida para pagar; no autoriza una transición.
- Mercado Pago es la fuente autoritativa del resultado del pago.
- `processing`, errores de red y resultados ambiguos conservan la reserva.
- `processed/accredited` consume la reserva.
- `expired`, `failed` o `canceled` liberan la reserva.
- `review_required` bloquea fulfillment y un segundo cobro hasta investigar.

## Recuperación automática

1. Mercado Pago envía y reintenta el Webhook de Orders.
2. Canela valida su firma y consulta `GET /v1/orders/{id}`.
3. Si el comprador vuelve, la pantalla de resultado dispara la misma consulta
   autoritativa y mantiene el polling solo mientras está visible.
4. Ambas rutas usan la misma transición transaccional e idempotente.

No existe un cron global ni un botón de reconciliación para el comprador o el
dueño.

## Señales relevantes

- `mercado_pago_webhook_retry`: el evento no quedó aplicado; Mercado Pago debe
  poder reintentarlo.
- `mercado_pago_reconciliation_error`: falló la consulta iniciada desde el
  retorno del comprador.
- `mercado_pago_payment_review_required`: la identidad, el importe o la
  transición requieren investigación técnica. Incluye `orderId` y
  `providerOrderId`, pero no email ni otros datos personales.

## Diagnóstico

1. Confirmar que el endpoint de Webhook responde y que sus secretos pertenecen
   a la misma aplicación que creó la order.
2. Localizar el pedido mediante los ids de la señal estructurada.
3. Consultar la order en Mercado Pago con la credencial server-side del mismo
   ambiente.
4. Comparar estado y detalle, referencia externa, total, ARS, vendedor y
   aplicación con el snapshot inmutable de Canela.
5. Verificar que reserva e inventario respeten los invariantes anteriores.

## Acciones seguras

- Si Mercado Pago sigue en `processing`, restaurar cualquier dependencia caída
  y esperar la próxima notificación. No liberar ni iniciar otro pago.
- Si el Webhook recibió `503`, corregir la causa para que el reintento pueda
  ejecutar la transición. No fabricar ni reutilizar firmas.
- Si Canela ya está `paid`, una notificación negativa tardía no debe revertir la
  venta.
- Si Canela está `review_required`, no crear fulfillment. Resolver entrega o
  reembolso únicamente después de verificar el cobro en Mercado Pago y aplicar
  la política comercial correspondiente.

## Escalamiento

Escalar como incidente si el endpoint continúa fallando, la order no puede
consultarse, los importes o identidades no coinciden, o inventario y reserva no
cumplen sus invariantes. Conservar stock es la conducta segura hasta resolver la
causa.
