# Evidencia MP-02B: contrato real de Mercado Pago Orders

## Estado

Cerrada para el contrato de creación, consulta, Checkout Pro y cancelación el
2026-09-15. La firma y entrega de Webhooks se verificará en MP-04 cuando exista el
endpoint HTTPS receptor.

## Entorno

- Aplicación temporal `Canela Store - Desarrollo` con Checkout Pro y Orders API.
- Credencial de prueba cargada únicamente desde `.env.local`.
- Endpoints oficiales `POST /v1/orders` y `GET /v1/orders/{id}`.
- Emails `@testuser.com`, referencias ficticias y URLs de retorno de ejemplo.
- No se realizó ningún cobro real.

La evidencia está redactada: no contiene Access Token, IDs completos, URLs de
checkout ni datos personales.

## Resultados

| Caso | Resultado observado | Estado |
| --- | --- | --- |
| Autenticación | `GET /users/me` respondió `200` | Confirmado |
| Payload inicial | `unit_measure` y `total_amount` dentro de cada ítem devolvieron `400 unsupported_properties` | Contrato corregido |
| Webhook por order | `config.notification_url` devolvió `400 unsupported_properties` | Se configura en el panel |
| Crear order corregida | `201 created`, ARS 34.000 y `checkout_url` presente | Confirmado |
| Consulta por ID | `200`, mismo ID, referencia, monto y moneda | Confirmado |
| Vigencia | La respuesta reflejó `expiration_time = PT10M` | Confirmado |
| Captura | La respuesta reflejó `capture_mode = automatic_async` | Confirmado |
| Envío como ítem | Aceptado; Checkout mostró “Productos” y el total agregado | Confirmado; desglose queda en Canela |
| Excluir ticket | Solo aparecieron tarjeta y login opcional; sin Rapipago/Pago Fácil | Confirmado visualmente |
| Sin `account_only` | Se completó una compra con tarjeta sin iniciar sesión | Confirmado visualmente |
| Reintento idéntico | Dos respuestas `201` con el mismo ID | Confirmado |
| Misma clave, otro payload | `409 idempotency_key_already_used` | Confirmado |
| Total incorrecto | `400 order_items_total_amount_mismatch` | Confirmado |
| Aprobado | Checkout confirmó acreditación; GET devolvió `processed/accredited` | Confirmado |
| Rechazo reintentable | UI y retorno mostraron rechazo; GET devolvió `action_required/waiting_retry` | Confirmado; conserva reserva |
| Processing | UI mostró procesamiento; GET devolvió `processing/in_process` | Confirmado; conserva reserva |
| Cuotas sin límite propio | Checkout ofreció 1, 2, 3, 6, 9, 12, 18 y 24 | Decisión comercial pendiente |
| Vencimiento de rechazo reintentable | La order permaneció `action_required`; cancelación respondió y confirmó `canceled` | Cancelación explícita requerida |

## Correcciones derivadas

- Se eliminaron `items[].unit_measure` e `items[].total_amount` del builder.
- Se eliminó `notificationUrl` del contrato de dominio y del payload remoto.
- El parser de errores admite la estructura real `errors[].code` sin exponer el
  mensaje del proveedor.
- La regla de reintento exige la misma clave y el mismo snapshot inmutable.
- Se agregó el estado de dominio `action_required` para no liberar una reserva
  cuando Mercado Pago todavía permite reintentar el pago.
- La expiración local no espera una transición automática: para
  `created/action_required`, recuperación cancela, verifica y recién libera.
- Se agregó `pnpm test:mp` para repetir cinco verificaciones reales sin ejecutar
  estas llamadas durante `pnpm test`.

## Verificación automatizada

```text
pnpm test:mp
```

Resultado: 5 pruebas de contrato aprobadas contra Mercado Pago.

Regresión local:

```text
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

Resultado: 24 pruebas unitarias aprobadas; las suites externas se omiten sin su
flag; TypeScript, ESLint y build de producción aprobados.

## Decisiones y verificaciones posteriores

1. Definir la cantidad máxima de cuotas.
2. En MP-04, disponer de una URL HTTPS real y configurar el evento Order.
3. En MP-04, capturar un Webhook firmado y confirmar la consulta autoritativa.

Fuente de referencia: [crear order con Checkout Pro Orders](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro/create-order/post).
