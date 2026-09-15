# Investigación: Checkout Pro mediante Orders API

## Estado y alcance

Investigación iniciada el 2026-09-14 sobre documentación oficial vigente de
Mercado Pago Argentina. El 2026-09-15 comenzó la validación contra una aplicación
de prueba propia; todo comportamiento que siga marcado como **por validar** debe
convertirse en una prueba de contrato antes de producción.

## Hallazgos de contrato del 2026-09-15

- La credencial de prueba autentica correctamente contra Mercado Pago.
- `items[].unit_measure` y `items[].total_amount` producen HTTP `400` con código
  `unsupported_properties` en Checkout Pro Orders.
- Cada ítem admite `external_code`, `title`, `unit_price` y `quantity`; el total
  del ítem se deriva de precio unitario por cantidad.
- `config.notification_url` también produce `unsupported_properties`. Las
  notificaciones de Orders se configuran a nivel de aplicación en el panel.
- `PT10M`, `automatic_async`, dos ítems —incluido envío— y la exclusión de
  `ticket` fueron aceptados con HTTP `201` y reflejados en la respuesta.
- Repetir exactamente el mismo request con la misma `X-Idempotency-Key` devuelve
  `201` y el mismo `id`. Cambiar el payload conservando la clave devuelve `409`
  con `idempotency_key_already_used`.
- Un total distinto de `sum(unit_price * quantity)` devuelve `400` con
  `order_items_total_amount_mismatch`.
- Una tarjeta simulada como rechazada muestra rechazo en Checkout Pro y en los
  query params de retorno, pero el GET de la order devuelve
  `action_required/waiting_retry` mientras ofrece pagar con otro medio. La
  reserva debe conservarse hasta un estado terminal o el vencimiento verificado.
- La compra invitada con tarjeta funciona sin iniciar sesión. En la pantalla de
  medios solo aparecieron tarjeta y acceso opcional a Mercado Pago; no aparecieron
  Rapipago ni Pago Fácil.
- El pago simulado `APRO` terminó en `processed/accredited`. El escenario `CONT`
  mostró “Estamos procesando tu pago” y el GET devolvió `processing/in_process`.
- Con dos ítems, Checkout Pro presenta un renglón agregado “Productos” y el total;
  no muestra el envío como desglose separado. Canela debe enseñar el desglose
  completo antes de redirigir, aunque conserve ambos ítems en la order.
- La cuenta de prueba ofreció hasta 24 cuotas. La cantidad máxima sigue siendo una
  decisión comercial pendiente antes de producción.
- Pasado el límite local, una order `action_required/waiting_retry` no cambió por
  sí sola a `expired`. `POST /v1/orders/{id}/cancel` respondió `200/canceled` y el
  GET posterior confirmó el estado. La recuperación debe cancelar explícitamente
  las orders `created` o `action_required` antes de liberar stock.

Este hallazgo reemplaza el payload propuesto originalmente. Se conservó una
respuesta redactada: no contiene Access Token, URL de checkout ni identificadores
completos.

## Conclusión ejecutiva

Para una integración nueva, Canela debería usar **Checkout Pro mediante Orders API**, no Preferences API. Mercado Pago identifica Orders como el camino recomendado y Preferences como legado: [referencia general de Checkout Pro](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro-orders/overview).

El flujo moderno reemplaza:

- `POST /checkout/preferences` por `POST /v1/orders`;
- `preference_id` por el identificador alfanumérico de la order de Mercado Pago;
- `init_point` por `checkout_url`;
- webhooks de `payment` por el evento **Order (Mercado Pago)** y consulta posterior a `GET /v1/orders/{id}`.

Este cambio simplifica la recuperación de timeouts porque la creación exige `X-Idempotency-Key`. La clave permite repetir la misma solicitud sin crear dos orders: [crear order](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro/create-order/post).

## Hechos verificados

### Creación y montos

- Endpoint: `POST https://api.mercadopago.com/v1/orders`.
- Para Checkout Pro: `type = online` y `processing_mode = manual`.
- `X-Idempotency-Key` es obligatorio y admite entre 1 y 128 caracteres.
- La respuesta `201` devuelve `id` y `checkout_url`.
- Si se envían ítems, `total_amount` debe coincidir exactamente con la suma de `unit_price * quantity`; en caso contrario se devuelve `order_items_total_amount_mismatch`.
- Orders permite varios ítems: [order con múltiples ítems](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/additional-settings/create-order-for-multiple-items).

### Envío dentro del total

La referencia de Checkout Pro vía Orders no documenta un campo equivalente a `shipments.cost`, que pertenece al flujo legado de Preferences. Por lo tanto, la estrategia propuesta es representar el envío como un ítem propio, por ejemplo `Envío Correo Argentino`, para que el desglose visible y `total_amount` coincidan.

La API aceptó el ítem de envío y lo devolvió en la order, pero Checkout Pro agrupó
los dos ítems bajo “Productos” y mostró únicamente el total. Canela conservará el
ítem para trazabilidad y suma exacta, y mostrará el desglose de productos y envío
antes de redirigir.

### Resultado del pago: conversión frente a simplicidad

Orders ofrece dos configuraciones relevantes:

- `capture_mode = automatic`: modo binario, solo aprobado o rechazado;
- `capture_mode = automatic_async`: admite `processing` mientras Mercado Pago revisa/procesa.

Mercado Pago advierte que el modo binario rechaza automáticamente resultados que habrían quedado pendientes o en proceso y **puede reducir la tasa de aprobación**: [modo binario](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/additional-settings/enable-binary-mode).

Para Canela hay dos políticas posibles:

1. **Priorizar consistencia simple:** `automatic`, sin estado pendiente y con posible pérdida de aprobaciones.
2. **Priorizar conversión:** `automatic_async`, conservar el bloqueo mientras la order esté `processing` y resolver por webhook/reconciliación.

La documentación señala como ciclo típico `created -> processing -> processed`, y define `processed + accredited` como pago aprobado: [estados de la order](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/payment-management/status/order-status).

**Decisión aceptada el 2026-09-14:** usar `automatic_async` y excluir medios offline, porque el objetivo comercial declarado es reducir fricción y aumentar ventas. La disponibilidad pública sigue siendo binaria; el estado `processing` solo existe en backend.

### Vigencia de diez minutos

- Orders acepta `expiration_time` como duración ISO 8601: [definir vigencia](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/additional-settings/define-order-validity).
- La representación ISO 8601 de diez minutos es `PT10M`.
- La página específica de Checkout Pro muestra el formato pero no publica un mínimo/máximo para esta solución.

Por eso `PT10M` es **por validar mediante prueba de contrato**. Canela no debe asumir que haber vencido localmente implica que un pago iniciado no pueda acreditarse: antes de liberar stock consultará la order de Mercado Pago.

### Fricción del comprador

`config.online.allowed_user_type = account_only` obliga a iniciar sesión en Mercado Pago y además impide pagos de usuarios no registrados, efectivo y transferencia: [restringir usuarios](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/additional-settings/restrict-to-registered-users).

Canela no enviará ese campo. Así evita agregar una restricción de cuenta que contradiga el objetivo de mínima fricción. Los medios offline se excluirán específicamente mediante `config.payment_method.not_allowed_types`, sujeto a la prueba de contrato.

### Retorno del navegador

Las URLs `success_url`, `failure_url` y `pending_url` se configuran bajo `config.online`; `auto_return` puede ser `approved` o `all`: [URLs de retorno](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/web-integration/configure-back-urls).

Los query params de retorno son entrada no confiable. Canela puede usarlos para localizar la order y mostrar “verificando”, pero nunca para descontar stock, enviar email o iniciar fulfillment.

### Webhooks y confirmación autoritativa

- En el panel se configura el evento **Order (Mercado Pago)**.
- El webhook contiene `type = order` y `data.id = ORD...`.
- Se valida `x-signature` usando también `x-request-id`, `data.id` y el secreto de la aplicación.
- Después se consulta `GET /v1/orders/{id}` con el Access Token.
- Mercado Pago espera `200` o `201` dentro de 22 segundos; si no, reintenta inicialmente cada 15 minutos.

Fuente: [notificaciones de Checkout Pro vía Orders](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/payment-notifications).

La documentación usa tanto el nombre visible “Order (Mercado Pago)” como el tópico técnico `orders_v2`. La configuración real del panel y el payload recibido se capturarán como evidencia para evitar codificar el nombre equivocado.

### Pruebas

La guía específica indica crear una order de prueba, redirigir mediante `checkout_url`, iniciar sesión con una cuenta compradora de prueba y usar tarjetas de prueba para simular aprobado, rechazado y pendiente: [compra de prueba con tarjetas](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/integration-test/test-purchase-with-card).

La documentación de credenciales cambió durante 2025. La documentación oficial
consultada el 2026-09-15 confirma que, para Checkout Pro/Orders, el Access Token
de prueba puede comenzar con `APP_USR`, igual que el productivo. La aplicación
real será la autoridad de la configuración: se usará la credencial visible en
**Pruebas > Credenciales de prueba** y se separará como `MP_TEST_ACCESS_TOKEN`;
no se intentará inferir el ambiente a partir del prefijo.

Fuente: [credenciales de Checkout API Orders](https://www.mercadopago.com.ar/developers/es/docs/checkout-api-orders/resources/credentials)
y [cuentas de prueba de Checkout Pro](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/test-accounts).

### Cancelaciones y reembolsos

- Una order no pagada puede cancelarse con `POST /v1/orders/{order_id}/cancel` usando idempotencia.
- Una order pagada puede reembolsarse total o parcialmente con `POST /v1/orders/{order_id}/refund`.
- Mercado Pago documenta un plazo de hasta 180 días para reembolsos.

Fuentes: [cancelar order](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro/cancel-order/post) y [reembolsos](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/refunds-cancellations).

## Payload objetivo para la prueba de contrato

```json
{
  "type": "online",
  "processing_mode": "manual",
  "capture_mode": "automatic_async",
  "total_amount": "34000.00",
  "external_reference": "CAN-000127",
  "expiration_time": "PT10M",
  "payer": {
    "email": "comprador@example.com"
  },
  "items": [
    {
      "external_code": "sanity-product-id",
      "title": "Cuadro Palmera",
      "unit_price": "30000.00",
      "quantity": 1
    },
    {
      "external_code": "shipping-correo-argentino",
      "title": "Envío Correo Argentino",
      "unit_price": "4000.00",
      "quantity": 1
    }
  ],
  "config": {
    "online": {
      "success_url": "https://preview.example.com/checkout/resultado",
      "failure_url": "https://preview.example.com/checkout/resultado",
      "pending_url": "https://preview.example.com/checkout/resultado",
      "auto_return": "all"
    },
    "payment_method": {
      "not_allowed_types": ["ticket"]
    }
  }
}
```

Este ejemplo no se copia a producción hasta comprobar nombres exactos, tipos admitidos, `PT10M`, exclusión de medios offline y presentación del ítem de envío.

## Matriz mínima de pruebas de contrato

| Caso | Evidencia esperada |
| --- | --- |
| Crear con la misma idempotency key dos veces | Confirmado: dos `201`, mismo `id` |
| Reusar la clave con otro payload | Confirmado: `409 idempotency_key_already_used` |
| Crear con `PT10M` | Confirmado: `201` y `PT10M` en la respuesta |
| Suma de ítems incorrecta | Confirmado: `order_items_total_amount_mismatch` |
| Envío como ítem | Aceptado; Checkout lo agrupa como “Productos”, por lo que Canela muestra el desglose antes de redirigir |
| Tipo `ticket` excluido | Confirmado visualmente: no aparecieron Rapipago ni Pago Fácil |
| Comprador sin cuenta | Confirmado: compra con tarjeta disponible sin login |
| Aprobado | Confirmado por UI y GET `processed/accredited`; Webhook pendiente |
| Rechazado reintentable | Confirmado: retorno `rejected`, pero GET devuelve `action_required/waiting_retry`; conserva stock |
| Rechazado terminal | Pendiente: GET terminal permite liberar una vez |
| Processing | Confirmado por UI y GET `processing/in_process`; debe preservar stock |
| Firma alterada | `401`, sin modificar la order interna |
| Webhook duplicado/fuera de orden | Una sola transición terminal |
| Retorno falsificado | Nunca marca pago ni dispara fulfillment |
| Order vencida sin pago | Confirmado: cancelar `created/action_required`, comprobar `canceled` y recién liberar |

## Verificaciones todavía abiertas

1. Definir la cantidad máxima de cuotas.
2. Configurar una URL HTTPS real y obtener el secreto del webhook de prueba.
3. Capturar un Webhook firmado y confirmar la consulta autoritativa posterior.
