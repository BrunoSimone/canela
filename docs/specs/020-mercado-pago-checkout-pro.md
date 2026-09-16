# Integración de Mercado Pago Checkout Pro

## Estado

Aprobada para implementación el 2026-09-14. MP-01 a MP-04A y la corrección
MP-03B3 están implementados; las migraciones y transiciones críticas se
verificaron en la branch `development` de Neon. El contrato HTTPS real del
Webhook permanece en MP-04B y las puertas de producción continúan cerradas.

## Fuentes normativas

- [Investigación de Orders API](../research/001-mercado-pago-orders-api.md)
- [ADR-003: Checkout Pro mediante Orders API](../adr/003-checkout-pro-orders-api.md)
- [Referencia oficial de Checkout Pro](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro-orders/overview)

La documentación oficial orienta el diseño; las pruebas de contrato con la aplicación de Canela confirman el comportamiento efectivo. Si difieren, el incremento se detiene y la discrepancia queda registrada.

## Decisiones confirmadas

- Se usará Mercado Pago Checkout Pro alojado.
- Neon PostgreSQL será la autoridad de órdenes, inventario y estados verificados.
- El stock se bloqueará atómicamente antes de crear la order de Mercado Pago.
- El bloqueo es interno; públicamente el producto solo está disponible o no disponible.
- La ventana inicial es de **10 minutos**, configurable sin migración.
- Se excluirán medios offline/diferidos en el primer lanzamiento.
- Se usará Checkout Pro vía **Orders API**, no Preferences API.
- Se usará `capture_mode = automatic_async` para priorizar aprobación y conversión; un estado `processing` será interno y no vuelve a exponer stock.
- No se exigirá una cuenta de Mercado Pago al comprador.
- El modelo admite varios productos; todos se bloquean o ninguno.
- Personalización queda fuera de alcance.
- La cotización de Correo ocurre antes de crear el pago productivo; el fulfillment ocurre después de confirmar el pago.

## Presentación del costo de envío

El costo de Correo se envía como un ítem separado para mantener el detalle de la
order y la suma verificable. Checkout Pro acepta ambos ítems, pero visualmente los
agrupa como “Productos” y muestra solo el total.

Por eso Canela debe mostrar productos, envío y total en una confirmación clara
inmediatamente antes de redirigir y nuevamente en el detalle del pedido. `PT10M`
y la exclusión visual de medios offline también quedaron confirmados.

## Objetivo

Permitir que un comprador pague una o varias piezas disponibles sin sobreventa, con el total definitivo de productos y envío, y que Canela confirme el resultado aunque el navegador no vuelva, la API responda con timeout o un Webhook se repita o demore.

## Alcance

- Validar catálogo, precio, cotización y stock en backend.
- Congelar snapshots de productos, envío y total.
- Bloquear stock atómicamente por diez minutos.
- Crear una order con `POST /v1/orders` e idempotencia de proveedor.
- Redirigir mediante `checkout_url`.
- Mostrar el estado interno al regresar a Canela.
- Recibir y validar Webhooks del evento Order (Mercado Pago).
- Consultar `GET /v1/orders/{id}` antes de cualquier transición irreversible.
- Liberar bloqueos vencidos de forma segura.
- Reconciliar orders sin resultado terminal.
- Mantener el CTA actual de WhatsApp como alternativa durante el rollout.

## Fuera de alcance

- Activación pública sin cotización válida de entrega a domicilio.
- Captura de tarjetas dentro de Canela.
- Efectivo, Rapipago, Pago Fácil u otros medios con acreditación posterior.
- Cupones propios, suscripciones y marketplace.
- Panel completo de reembolsos; el MVP documenta una operación asistida.
- Creación de envío o tracking desde esta spec.
- Productos personalizados.

## Nombres de dominio

Para evitar confundir dos objetos distintos:

- **pedido Canela:** compra interna persistida en Neon;
- **order MP:** recurso externo creado en Mercado Pago;
- `order_id`: identificador interno del pedido Canela;
- `provider_order_id`: identificador `ORD...` de Mercado Pago.

## Flujo nominal

```text
Comprador confirma domicilio y carrito
  -> backend relee productos y obtiene cotización vigente de Correo
  -> transacción crea pedido Canela + snapshots + bloqueos
  -> backend crea order MP con la misma clave idempotente estable
  -> guarda provider_order_id + checkout_url
  -> navegador redirige a Checkout Pro
  -> Mercado Pago procesa el pago
  -> Webhook firmado notifica data.id = provider_order_id
  -> backend consulta GET /v1/orders/{provider_order_id}
  -> valida vendedor, ambiente, ARS, monto y external_reference
  -> transacción idempotente confirma venta o conserva/libera bloqueo
  -> página de retorno consulta el estado interno del pedido Canela
```

## Contrato con Mercado Pago

### Creación

- `POST /v1/orders`.
- Header `Authorization: Bearer ...` server-side.
- Header `X-Idempotency-Key`: clave estable por intento de checkout, entre 1 y 128 caracteres.
- `type: online`.
- `processing_mode: manual`.
- `capture_mode: automatic_async`.
- `external_reference`: id inmutable y no PII del pedido Canela, máximo 64 caracteres.
- `expiration_time: PT10M`, sujeto a prueba de contrato.
- `payer.email`: email del comprador.
- `items`: snapshots de productos y, si se valida, el costo de envío como ítem separado.
- Cada ítem usa `external_code`, `title`, `unit_price` y `quantity`. Checkout Pro
  Orders rechazó `unit_measure` y `total_amount` dentro del ítem; el total se
  calcula como `unit_price * quantity`.
- `total_amount`: string decimal ARS igual a la suma exacta de los ítems.
- El webhook no se envía en la order: `config.notification_url` fue rechazado por
  Orders API. Se configura el evento Order y su URL HTTPS en la aplicación de
  Mercado Pago.
- `config.online`: URLs de retorno y `auto_return: all`.
- `config.payment_method.not_allowed_types`: excluir al menos `ticket`, sujeto a evidencia del ambiente.
- No enviar `config.online.allowed_user_type: account_only`.
- `config.payment_method.max_installments` se incorporará cuando el negocio defina
  el máximo; sin configurarlo, la cuenta de prueba ofreció hasta 24 cuotas.

La respuesta `201` debe persistir `id` y `checkout_url`. Nunca se mezclan recursos de prueba y producción.

### Consulta autoritativa

`GET /v1/orders/{provider_order_id}` es la fuente de verdad externa. Canela solo acepta como cobrado:

- `status = processed`;
- `status_detail = accredited`;
- mismo `external_reference`;
- mismo `total_amount` y moneda ARS;
- misma aplicación/cuenta esperada;
- credencial explícita del ambiente esperado. El GET de Orders no devuelve
  `live_mode`; ese campo del Webhook se valida como consistencia, no como prueba
  autoritativa del pago.

`processing` conserva el bloqueo y activa reconciliación. También se conserva
cuando el GET devuelve `action_required/waiting_retry`, porque Checkout Pro aún
permite elegir otro medio dentro de la misma order. Solo `failed`, `canceled` o
`expired` permiten liberar de manera idempotente después de comprobar que no
existe un resultado aprobado.

## Idempotencia y resultados ambiguos

La misma clave y el mismo payload se usan para reintentar `POST /v1/orders` si
hay timeout. No se genera una segunda clave ni se reconstruye el intento con datos
mutables: Mercado Pago devuelve la misma order para una repetición idéntica y
rechaza con `409` una clave reutilizada con otro payload.

- Respuesta `201`: persistir el recurso.
- Error definitivo de payload/autorización: registrar y liberar el bloqueo.
- Timeout/`5xx`/`423 resource_locked`: conservar el bloqueo y reintentar con la misma clave.
- Reintentos agotados: reconciliación y `review_required`; nunca liberar por duda.

La idempotencia de Mercado Pago impide duplicar la order externa; la unicidad en Neon impide asociar dos recursos externos al mismo intento.

## Retorno del comprador

`success_url`, `failure_url` y `pending_url` apuntan a una misma pantalla de resultado con distinto mensaje inicial. Los query params del navegador no son evidencia de pago.

La página obtiene el estado con `GET /api/orders/{public_token}/status` y puede mostrar:

- verificando pago;
- pago confirmado;
- pago no completado, con reintento permitido;
- necesitamos revisar el pago, sin ofrecer un segundo cobro.

El carrito de venta directa se conserva en el navegador ante una recarga. Solo se
vacía cuando el estado interno consultado es `paid`; regresar desde Mercado Pago,
cerrar la pestaña o recibir un estado todavía incierto no elimina sus piezas.

Las piezas publicadas como `encargo` no habilitan el pago inmediato. Permanecen
disponibles en el flujo de consulta por WhatsApp, y un carrito mixto debe separar
claramente ambas acciones sin intentar cobrar el encargo.

## Webhook

### `POST /api/webhooks/mercado-pago`

- Acepta `type = order`.
- Valida `x-signature` con `x-request-id`, `data.id` y el secreto de la aplicación.
- Rechaza con `401` una firma ausente, malformada o inválida sin consultar a
  Mercado Pago ni tocar la base.
- Exige que `data.id` del query coincida con el id de la order informado en el
  body y que `live_mode` coincida con el ambiente configurado.
- Consulta la order MP; el body del Webhook no confirma un cobro.
- Persiste el identificador de notificación y aplica la transición de pedido,
  intento, reserva e inventario dentro de una misma transacción. Un fallo revierte
  también la deduplicación para que el reintento pueda procesarse.
- Aplica una transición monotónica e idempotente: un estado tardío no revierte
  una venta ya confirmada ni consume o libera stock dos veces.
- Responde `200` o `201` después de dejar el evento aplicado o durable.
- La primera implementación procesa la consulta y la transacción de forma
  síncrona dentro de la ventana de 22 segundos del proveedor. Si falla antes de
  persistir, responde error para permitir el reintento de Mercado Pago.

La configuración de prueba usa variables server-side separadas para Access
Token, secreto de Webhook, vendedor y aplicación. No se aceptan ids de identidad
obtenidos desde el navegador.

La configuración real del panel y el nombre técnico `orders_v2` se capturan en la prueba de contrato.

## Stock y expiración

El reloj local no libera stock por sí solo.

1. El worker toma el bloqueo vencido con exclusión mutua.
2. Si nunca se inició una llamada externa, libera.
3. Si existe `provider_order_id` o un intento ambiguo, consulta/reintenta Mercado Pago.
4. `processed/accredited`: consume el bloqueo y confirma venta.
5. `processing`: conserva el bloqueo y reintenta.
6. `created` o `action_required` después del límite: cancela la order con una
   clave idempotente estable, vuelve a consultar y libera solo si confirma
   `canceled`.
7. `failed`, `canceled` o `expired`: libera una vez.
8. Proveedor inaccesible o resultado incoherente: conserva y pasa a `review_required` tras el umbral.

Esto permite un estado público binario sin vender dos veces la última pieza.

## Contratos HTTP propios

### `POST /api/checkout`

Requiere el header `Idempotency-Key`, generado una vez por intento del navegador
y reutilizado en reintentos técnicos. El body no acepta nombre, precio ni total.

Entrada:

```json
{
  "items": [{ "productId": "sanity-product-id", "quantity": 1 }],
  "buyer": { "email": "comprador@example.com" },
  "shippingQuoteToken": "opaque-signed-token"
}
```

Respuesta `201`:

```json
{
  "orderToken": "opaque-public-token",
  "checkoutUrl": "https://www.mercadopago.com/...",
  "expiresAt": "ISO-8601"
}
```

Errores:

- `404 CHECKOUT_DISABLED` mientras el feature flag esté apagado.
- `409 OUT_OF_STOCK`.
- `409 CHECKOUT_ATTEMPT_CLOSED` cuando se reutiliza una clave cuyo intento ya
  terminó; un reintento de red del mismo intento activo reutiliza su order.
- `409 SHIPPING_QUOTE_EXPIRED`.
- `422 INVALID_CHECKOUT` para esquema, email, cantidades o idempotencia inválidos.
- `422 PRODUCT_NOT_SELLABLE`.
- `422 SHIPPING_QUOTE_INVALID`.
- `502 PAYMENT_PROVIDER_UNAVAILABLE` ante error definitivo; libera una vez.
- `202 PAYMENT_PROVIDER_UNCERTAIN` ante resultado ambiguo; conserva y reconcilia.

### `GET /api/orders/{public_token}/status`

Devuelve solo estado presentable, expiración y si un nuevo intento está permitido:

```json
{
  "status": "verifying | paid | not_completed | review_required",
  "expiresAt": "ISO-8601",
  "canRetry": false
}
```

No expone ids internos, PII de otros compradores ni secretos. Los query params
de retorno de Mercado Pago no participan de esta respuesta ni cambian el pedido.

## Modelo mínimo de datos

Los importes se guardan en centavos enteros; el adaptador convierte a strings decimales para Mercado Pago.

- `inventory_item(product_id PK, stock_on_hand, reserved, updated_at, CHECK...)`.
- `orders(id PK, public_token UNIQUE, status, currency, subtotal_cents, shipping_cents, total_cents, buyer_email, created_at, updated_at)`.
- `order_item(order_id, product_id, name_snapshot, unit_price_cents, quantity)`.
- `stock_reservation(id PK, order_id, product_id, quantity, status, expires_at, released_at, consumed_at, UNIQUE(order_id, product_id))`.
- `payment_attempt(id PK, order_id, idempotency_key UNIQUE, provider_order_id UNIQUE NULL, checkout_url NULL, provider_status, provider_status_detail, verified_at)`.
- `processed_webhook(provider, event_id, received_at, UNIQUE(provider, event_id))`.

MP-01 ya creó columnas con nombres de Preferences. No se reescribe la migración aplicada: MP-02 agrega una migración compatible para el modelo Orders y migra/retira nombres antiguos cuando sea seguro.

## Seguridad y privacidad

- El desarrollo usa `MP_TEST_ACCESS_TOKEN`, obtenido de la sección **Pruebas**
  de la aplicación. El prefijo `APP_USR` no distingue credenciales de prueba y
  producción en Checkout Pro/Orders, por lo que la separación se hace por nombre
  y entorno, no por inspección del secreto.
- Access Token, secreto de Webhook y `DATABASE_URL` solo en variables server-side por ambiente.
- Logs sin token, firma, URL completa de checkout ni email sin redacción.
- Validación de esquema, límite de body y rate limit en checkout/estado público.
- Token público aleatorio y no enumerable.
- Ningún dato de retorno del navegador dispara email, stock o fulfillment.

## Observabilidad

- Logs por `order_id` y `provider_order_id`, sin secretos.
- Métricas: `checkout_started`, `inventory_conflict`, `mp_order_created`, `mp_order_processing`, `payment_approved`, `payment_failed`, `reservation_released`, `webhook_invalid`, `reconciliation_recovered`.
- Alertas: aprobado sin bloqueo consumible, monto/referencia inválidos, firma inválida repetida y bloqueo ambiguo más allá del umbral.

## Criterios de aceptación

- **CA-MP-001:** Con una unidad y dos checkouts concurrentes, exactamente uno obtiene checkout.
- **CA-MP-002:** Alterar precio, nombre, envío o total en el navegador no cambia el snapshot del servidor.
- **CA-MP-003:** Si un ítem del carrito no tiene stock, no se bloquea ninguno.
- **CA-MP-004:** Repetir la creación con la misma idempotency key produce una única order MP.
- **CA-MP-005:** La order MP usa `PT10M`, la política de captura aprobada, varios ítems y exclusión de offline verificados en pruebas.
- **CA-MP-006:** `total_amount` coincide con productos más envío y con la suma de ítems aceptada por MP.
- **CA-MP-007:** Visitar o alterar una URL de retorno no marca el pedido como pagado.
- **CA-MP-008:** Una firma inválida no consulta ni modifica el pedido.
- **CA-MP-009:** Un Webhook válido solo confirma tras comprobar por API estado, monto, ARS, referencia, cuenta y ambiente.
- **CA-MP-010:** Duplicados y eventos fuera de orden producen una sola venta y un solo consumo de stock.
- **CA-MP-022:** Si la aplicación falla mientras aplica un evento, su id no queda
  deduplicado y el reintento puede completar la transición.
- **CA-MP-023:** Una consulta autoritativa asociada a otro vendedor, aplicación,
  referencia, monto o moneda conserva el stock y deja el pedido en
  `review_required`; un Webhook cuyo `live_mode` no coincide se rechaza sin
  efectos.
- **CA-MP-024:** Un fallo transitorio al consultar Mercado Pago devuelve error sin
  confirmar la recepción para que el proveedor pueda reintentar.
- **CA-MP-011:** Una order `processing` conserva la unidad y reconciliación converge sin segundo cobro.
- **CA-MP-016:** Un retorno `rejected` cuyo GET autoritativo informa
  `action_required/waiting_retry` conserva el bloqueo y permite reintentar sin
  crear otro pedido.
- **CA-MP-017:** Una order vencida que continúa `created/action_required` se
  cancela de forma idempotente y el stock solo se libera después de verificar
  `canceled`.
- **CA-MP-012:** Si MP no responde al vencer, el sistema no libera por duda.
- **CA-MP-013:** Una vista cacheada de un producto agotado no puede iniciar checkout.
- **CA-MP-014:** Ningún evento de pago crea todavía un envío.
- **CA-MP-015:** El checkout productivo permanece apagado hasta incluir una cotización válida de Correo.
- **CA-MP-018:** Recargar la página conserva el carrito local y un retorno que no
  esté confirmado como `paid` no lo vacía.
- **CA-MP-019:** Un carrito con piezas de encargo no puede iniciar pago inmediato
  por esas piezas y mantiene disponible la consulta por WhatsApp.
- **CA-MP-020:** La confirmación previa muestra productos, envío controlado y total,
  pero el request de checkout envía solo ids, cantidades, email y cotización firmada.
- **CA-MP-021:** Un resultado `verifying` o `review_required` advierte que no se
  inicie un segundo pago; los query params del navegador no alteran esa vista.
- **CA-MP-025:** La landing identifica siempre las piezas de venta directa con la
  acción `Agregar al carrito` y el panel de selección como `Mi carrito`. Las
  piezas `encargo` conservan una acción de consulta. El feature flag controla la
  posibilidad de iniciar el pago online, no el lenguaje ni la arquitectura del
  catálogo.

## Estrategia de pruebas

- Unitarias: payload, decimales, mapeo de estados, firma y transiciones.
- PostgreSQL real: concurrencia, rollback, unicidad e idempotencia interna.
- Contrato MP: matriz de `docs/research/001-mercado-pago-orders-api.md`.
- Webhook: válido, inválido, duplicado, fuera de orden y retrasado.
- E2E: aprobado, rechazado, processing, abandono, retorno falsificado y vencimiento.
- Operativa: localizar pedido, reconciliar y preparar un reembolso asistido.

## Plan de entrega

1. **MP-01 — Base transaccional:** terminado localmente; conectar Neon.
2. **MP-02A — Adaptación a Orders:** migración aditiva, cliente API, payload e idempotencia.
3. **MP-02B — Contrato real:** ejecutar matriz con credenciales de prueba; fijar `PT10M`, medios y envío como ítem.
4. **MP-03 — Inicio y retorno:** checkout, redirección y pantalla de estado.
5. **MP-04 — Confirmación:** Webhook Order firmado, GET autoritativo y transición de stock.
6. **MP-05 — Recuperación:** vencimiento seguro, reconciliación, alertas y operación mínima.
7. **INT-04/05 — Correo posterior al pago:** panel, medidas reales, importación, rótulo, pickup y TN.
8. **MP-06 — Verificación:** E2E, seguridad, observabilidad y feature flag de producción apagado.

## Dependencias

Antes de MP-04:

- El núcleo local y transaccional puede implementarse con configuración ficticia.
- Para cerrar el contrato real de MP-04 se requieren el secreto de Webhooks del
  ambiente de prueba y una URL HTTPS de preview con el endpoint desplegado.

Antes de producción:

- aplicación definitiva bajo la cuenta comercial que recibirá los pagos;
- decisión sobre cantidad máxima de cuotas;
- cotización válida de Correo incluida en el total;
- políticas visibles de devolución/reembolso;
- responsable operativo e email de alertas;
- pruebas completas y aprobación explícita del feature flag.
