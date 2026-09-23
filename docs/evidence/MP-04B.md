# Evidencia MP-04B — Contrato HTTPS del Webhook

## Estado

En ejecución desde el 2026-09-16. El procesamiento de una order aprobada y su
idempotencia quedaron confirmados. El 2026-09-22 una firma del simulador validó
con el secreto de prueba, pero una nueva notificación de una compra sandbox real
volvió a presentar una firma distinta. La firma real continúa abierta. La verificación usa
exclusivamente la aplicación y las credenciales de prueba de Mercado Pago,
Neon `development` y una URL HTTPS temporal de ngrok conectada al servidor
local.

## Fuentes oficiales

- [Configurar notificaciones de Checkout Pro mediante Orders](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/payment-notifications?scope=prod)
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
| Pago aprobado real de prueba | Pedido `paid`; reserva consumida y stock descontado una vez | GET autoritativo devolvió `processed/accredited`; la notificación oficial recibió `401` por firma y conservó stock; una reconciliación controlada produjo pedido `paid`, pago `approved`, reserva `consumed`, stock `0` y reservado `0` | Procesamiento confirmado; firma oficial pendiente |
| Repetición exacta de la entrega | `200`; sin segundo descuento ni segundo ajuste | Dos entregas con el mismo `x-request-id` recibieron `200`; quedó una fila para la entrega, un ajuste `payment_confirmed`, stock `0` y reservado `0` | Confirmado |
| Rechazo reintentable o estado `processing` | Stock conservado según estado autoritativo | Pendiente | Pendiente |
| Latencia | Confirmación HTTP menor a 22 segundos | Entrega aprobada: 3,6 s; duplicado: 2,0 s | Confirmado |

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

### Discrepancia de la firma oficial

La notificación real `order.processed` sí alcanzó ngrok y el endpoint local,
pero recibió `401 INVALID_SIGNATURE`. El HMAC recibido no coincidió con el
manifiesto oficial `id:{data.id};request-id:{x-request-id};ts:{ts};` usando el
secreto de prueba vigente. Tampoco coincidió al normalizar el identificador,
omitirlo, incorporar la referencia externa, interpretar el secreto hexadecimal
como bytes ni usar el secreto anterior. El cuerpo, el query string y el
`application_id` correspondían a la order de prueba esperada.

Por lo tanto, el receptor y la transición transaccional están demostrados, pero
la integración no puede considerarse cerrada hasta recibir una nueva
notificación oficial cuya firma valide o aclarar la discrepancia con Mercado
Pago. No se relajará ni omitirá la autenticación para hacer pasar la prueba.

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
