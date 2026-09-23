# Evidencia MP-04C — Reconciliación segura desde el retorno

## Estado

Completada el 2026-09-23. La implementación automática y una compra sandbox
manual recorrieron Checkout Pro, el retorno a Canela, la reconciliación
autoritaria y la actualización del catálogo.

## Contrato implementado

- `POST /api/orders/{public_token}/reconcile` no acepta identidad ni estado de
  pago desde el navegador.
- El token se almacena y consulta mediante SHA-256; un token malformado o
  desconocido devuelve el mismo `404`.
- Neon resuelve `provider_order_id`, referencia, importe y moneda esperados.
- El backend consulta `GET /v1/orders/{provider_order_id}` y valida además
  vendedor y aplicación.
- Webhook y retorno comparten la misma transición de dominio y persistencia.
- La reconciliación de retorno no crea una fila ficticia en
  `processed_webhook`.
- La pantalla solicita una reconciliación al entrar. Después consulta únicamente
  Neon cada tres segundos, solo mientras está visible y por un máximo de noventa
  segundos.
- Abandonar la pantalla desmonta la suscripción; no existe polling global.

## Evidencia automática

| Nivel | Resultado |
| --- | --- |
| Pruebas unitarias | 143 aprobadas; 25 de integración omitidas por la ejecución normal |
| PostgreSQL 17 aislado | 20 aprobadas, incluyendo carrera Webhook/retorno |
| Concurrencia | Un consumo de stock, un ajuste y una única entrega Webhook real |
| Linter | Sin errores ni advertencias |
| TypeScript | `tsc --noEmit` aprobado |
| Build | Next.js 16.2.9 compiló y registró la ruta dinámica de reconciliación |
| Runtime local | Token inválido respondió `404 ORDER_NOT_FOUND` con `Cache-Control: no-store` |

## Invariantes demostradas

1. Los parámetros del retorno no eligen la order externa ni confirman el pago.
2. Un estado autoritativo `processing` conserva la reserva.
3. Una discrepancia de identidad, referencia, importe o moneda pasa el pedido a
   revisión en lugar de confirmar o liberar.
4. Dos verificaciones concurrentes solo pueden consumir el inventario una vez.
5. El tiempo de la ventana de pago no participa de la transición de inventario.

## Evidencia manual sandbox

El 2026-09-23 se compró `Conjunto de Platitos`, cuya disponibilidad inicial
era una unidad, con comprador y tarjeta de prueba de Mercado Pago.

1. Checkout Pro aprobó el pago y redirigió a la URL de retorno de Canela.
2. La pantalla mostró primero `pending` y cambió a pago confirmado con la
   primera consulta posterior a la reconciliación.
3. Neon registró la order como `paid` y el intento como `approved`, con estado
   autoritativo `processed/accredited` verificado contra Orders API.
4. La reserva pasó a `consumed`; el inventario quedó en `stock_on_hand = 0` y
   `reserved = 0`.
5. Existe exactamente un `inventory_adjustment` por `payment_confirmed` para la
   order y no se creó una entrega ficticia en `processed_webhook`.
6. Una nueva respuesta de la landing no contiene `Conjunto de Platitos`, porque
   el filtro server-side excluye productos sin disponibilidad efectiva.

Esta ejecución demuestra la recuperación desde el retorno aun sin una entrega
Webhook aceptada. La validación del contrato de firma real continúa separada en
MP-04B y no fue debilitada para cerrar esta prueba.
