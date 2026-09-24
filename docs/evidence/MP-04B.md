# Evidencia MP-04B — Contrato HTTPS del Webhook

## Estado

Completada el 2026-09-24. Se validaron entregas firmadas de compras sandbox
reales, tanto para un pago aprobado como para otro en procesamiento, usando la
aplicación de prueba que creó cada order. Mercado Pago canonicalizó `data.id` a
minúsculas para calcular el HMAC, aunque el query string conservó el
identificador en mayúsculas. El receptor acepta ahora tanto el manifiesto
literal documentado como esa canonicalización observada, sin aceptar firmas
calculadas con otro secreto.

La entrega oficial capturada atravesó nuevamente la URL HTTPS de ngrok y obtuvo
`200`; su repetición exacta también obtuvo `200` sin duplicar efectos. La
verificación usa exclusivamente credenciales de prueba, Neon `development` y
un servidor local.

## Fuentes oficiales

- [Configurar notificaciones de Checkout Pro mediante Orders](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/notifications?scope=prod)
- [Probar Checkout Pro mediante Orders](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/integration-test-introduction?scope=prod)
- [Compra de prueba con tarjeta](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/integration-test/test-purchase-with-card?scope=prod)

## Entorno

- Receptor local: `POST /api/webhooks/mercado-pago`.
- Exposición: túnel HTTPS temporal hacia `localhost:3000`.
- Evento esperado: `Order (Mercado Pago)` (`order`).
- Autoridad externa: `GET /v1/orders/{id}` con credencial de prueba.
- Autoridad interna: Neon `development`.

La URL temporal completa y los secretos no se versionan.

## Matriz de verificación

| Caso | Resultado esperado | Evidencia | Estado |
| --- | --- | --- | --- |
| Simulación oficial firmada | La firma coincide con el secreto configurado | La firma validó; el fixture genérico fue rechazado con `400` porque informó `live_mode: true` y una identidad ajena al sandbox | Firma confirmada; fixture no procesable |
| Firma ausente o alterada | `401`; no consulta MP ni modifica Neon | Firma alterada rechazada por la URL pública con `INVALID_SIGNATURE` | Confirmado |
| Order real en estado no terminal | Respuesta `200`; reserva conservada | Order de prueba aceptada por MP; GET autoritativo mantuvo pedido pendiente, stock `1` y reserva `1` | Confirmado |
| Pago aprobado real de prueba | Pedido `paid`; reserva consumida y stock descontado una vez | GET autoritativo devolvió `processed/accredited`; tras corregir la canonicalización, la entrega oficial capturada recibió `200` y Neon conservó pedido `paid`, pago `approved`, reserva `consumed`, stock `0` y reservado `0` | Confirmado |
| Repetición exacta de la entrega | `200`; sin segundo descuento ni segundo ajuste | Dos entregas con el mismo `x-request-id` recibieron `200`; quedó una fila para la entrega, un ajuste `payment_confirmed`, stock `0` y reservado `0` | Confirmado |
| Order real no terminal | `200`; reserva y stock conservados | Una order `created` consultada autoritativamente conservó pedido pendiente, stock `1` y reserva `1` | Confirmado |
| Rechazo reintentable o estado `processing` | Stock conservado según estado autoritativo | Compra real con titular `CONT`: GET devolvió `processing/in_process`; el Webhook oficial recibió `200` y Neon conservó pedido pendiente, reserva activa, stock `1`, reservado `1` y cero ajustes | Confirmado |
| Latencia | Confirmación HTTP menor a 22 segundos | Entrega aprobada corregida: 3,3 s; duplicado: 1,2 s; entrega `processing`: 2,2 s | Confirmado |

## Restricciones

- No se usan credenciales, URLs ni datos productivos.
- No se crea fulfillment ni envío.
- Las respuestas del navegador no autorizan ninguna transición.
- Los payloads capturados se redactan antes de documentarlos.

## Hallazgos durante la prueba

### Límite de `external_code`

El primer intento real desde la landing recibió HTTP `400 property_value` porque
el UUID de Sanity tenía 36 caracteres y Orders API limita `items[].external_code`
a 30. La reserva interna se liberó correctamente ante el rechazo definitivo. El
adaptador ahora conserva códigos cortos y reemplaza ids largos por un código
determinista de 30 caracteres. La prueba que reprodujo el límite pasó de roja a
verde y la repetición real creó correctamente la order externa.

### Entrega firmada e idempotencia

Antes de la simulación del panel se reprodujo el contrato documentado con el
secreto de prueba local: HMAC-SHA256 sobre `data.id`, `x-request-id` y timestamp,
enviado por la misma URL HTTPS pública. La primera entrega consultó la order real
y conservó la reserva porque Mercado Pago devolvió `created`; la repetición exacta
respondió `200` sin duplicar `processed_webhook` ni modificar inventario.

### Pago aprobado y consumo de inventario

Se completó una compra real de prueba con Checkout Pro. Mercado Pago devolvió
la order como `approved`, con estado del proveedor `processed` y detalle
`accredited`. Una entrega controlada para esa misma order, firmada mediante
HMAC-SHA256 con el secreto vigente, atravesó la URL pública y recibió `200`.
Neon quedó con el pedido `paid`, el intento `approved`, la reserva `consumed`,
stock `0`, reservado `0` y un único ajuste `payment_confirmed`. La repetición
exacta conservó esos valores y una sola fila para el `x-request-id` procesado.

### Discrepancia inicial de la firma oficial

Las primeras notificaciones reales `order.processed` alcanzaron ngrok y el
endpoint local, pero recibieron `401 INVALID_SIGNATURE`. La investigación
posterior demostró que la order pertenecía a la aplicación de prueba
`1232783220387666`, mientras el secreto se había copiado desde la aplicación
principal `7955035517497142`. La aplicación de prueba se obtiene al iniciar
sesión en Developers con el Seller Test User vinculado a las credenciales.

### Repetición independiente del 2026-09-22

Una nueva compra sandbox reprodujo el problema sin reutilizar una order ni un
túnel anteriores. El cuerpo informó el ambiente, aplicación, vendedor y order
esperados; `GET /v1/orders/{id}` confirmó `processed/accredited`, referencia y
total. El HMAC recibido no coincidió con el secreto visible en ninguno de los
modos del panel, mientras que el simulador oficial sí firmó con el secreto de
prueba vigente.

El endpoint respondió `401` y Neon mantuvo pedido e intento pendientes, reserva
activa, stock físico `1` y reservado `1`. Esto demuestra el comportamiento
fail-safe: una notificación no autenticada no vende ni libera la pieza. Una
reconciliación controlada posterior consultó la misma order, confirmó la venta y
dejó exactamente un ajuste de inventario.

### Resolución del 2026-09-24

Se configuró la URL HTTPS y `Order (Mercado Pago)` en modo productivo dentro de
la aplicación del Seller Test User, se cargó su secreto como
`MP_TEST_WEBHOOK_SECRET` y se reinició la aplicación. Una nueva compra sandbox
produjo otra entrega real. El HMAC recibido coincidió exactamente con el secreto
correcto al usar este manifiesto:

```text
id:{data.id en minúsculas};request-id:{x-request-id};ts:{ts};
```

El mismo secreto no validó el identificador literal, y el secreto de la
aplicación principal no validó ninguna variante. Se agregó una prueba de
regresión y el receptor quedó compatible con el manifiesto literal documentado
y con la canonicalización real, manteniendo comparación constante del hash y
rechazo de secretos incorrectos.

La entrega oficial capturada se repitió por la URL pública después de la
corrección. La primera llamada respondió `200` en 3,3 segundos y la repetición
del mismo `x-request-id` respondió `200` en 1,2 segundos. Neon registró una sola
entrega procesada, un solo ajuste, reserva consumida, stock físico `0` y
reservado `0`.

El simulador del panel agotó 22 segundos tanto en la aplicación principal como
en la aplicación de prueba sin que ngrok registrara una solicitud. Por eso no se
usa ese timeout como evidencia contra el receptor; las compras sandbox reales y
la repetición controlada constituyen la evidencia HTTPS disponible.

### Pago en procesamiento y conservación de stock

Se ejecutó una compra sandbox real con el resultado de prueba `CONT`. Mercado
Pago envió la notificación oficial a la URL HTTPS y el receptor respondió `200`
en 2,2 segundos. La consulta autoritativa de Orders API devolvió
`processing/in_process` tanto para la order como para su pago.

Neon quedó con el pedido y el intento en `payment_pending`, la reserva `active`,
stock físico `1`, reservado `1`, ningún ajuste de inventario y una única entrega
procesada. Esto confirma que una notificación válida no descuenta ni libera la
pieza mientras el proveedor todavía no informa un resultado terminal.
