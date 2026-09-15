# ADR-003: Checkout Pro mediante Orders API

## Estado

Aceptado el 2026-09-14 por Bruno.

## Contexto

La spec original fue escrita sobre Preferences API. Durante la investigación de documentación vigente, Mercado Pago pasó a presentar Orders API como el camino recomendado para integraciones nuevas y Preferences como legado.

## Decisión

Integrar Checkout Pro con `POST /v1/orders`, `capture_mode = automatic_async`, Webhooks de order y `GET /v1/orders/{id}`. Mantener Preferences únicamente como antecedente, no como fallback silencioso.

## Razones

- Es el camino recomendado oficialmente para una integración nueva.
- `X-Idempotency-Key` es obligatorio en la creación y permite reintentos seguros.
- Devuelve `checkout_url` directamente.
- Unifica creación, consulta, cancelación y reembolso alrededor de la misma order del proveedor.
- Las nuevas funcionalidades se anuncian para Orders API.

## Consecuencias

- La migración ya implementada en MP-01 necesita una migración aditiva posterior: `provider_order_id` y `checkout_url` reemplazarán conceptualmente a `preference_id`/`init_point`.
- El Webhook cambia de `payment` al evento Order (Mercado Pago); la confirmación autoritativa consulta la order.
- La estrategia antigua de buscar una preferencia por `external_reference` tras timeout deja de ser primaria; se reintenta con la misma idempotency key.
- La vigencia de 10 minutos y el costo de envío como ítem requieren pruebas de contrato.

## Alternativas descartadas

### Preferences API

Sigue soportada, pero Mercado Pago la identifica como legado y reserva nuevas funcionalidades para Orders.

### Checkout API/Bricks

Ofrece una experiencia embebida, pero aumenta la superficie de pago, validación y UX. No aporta una ventaja suficiente al primer ecommerce de Canela frente al Checkout Pro alojado.

## Fuentes

- [Referencia general de Checkout Pro](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro-orders/overview)
- [Crear order](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro/create-order/post)
- [Notificaciones de order](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/payment-notifications)
- [Investigación completa](../research/001-mercado-pago-orders-api.md)
