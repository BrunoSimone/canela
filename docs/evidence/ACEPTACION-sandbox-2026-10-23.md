# Aceptación sandbox — ejecución del 23/10/2026

Plan: [aceptación integral](../plans/003-aceptacion-integral-sandbox.md).

## Preparado y comprobado

- PostgreSQL 17 nuevo, contenedor `canela-sandbox-20261023`, puerto local 55434,
  base `canela_sandbox`; 13 migraciones aplicadas. Neon no fue modificado.
- Sanity `inventory_test`: dos productos identificados como PRUEBA, precios
  sintéticos ARS 100 y 150, tres unidades de cada uno y caja compartida sintética.
  No se cargaron pesos, cantidades ni cajas ficticias en `production`.
- Catálogo configurable por entorno, con default productivo preservado y rechazo
  de datasets alternativos en Vercel Production. Studio usa su propia variable.
- Aplicación local en puerto 3000: pago test, logística sandbox/dropoff/un bulto,
  correos en test dirigidos exclusivamente al destinatario autorizado Bruno.
  Configuración temporal privada en `tmp/sandbox-20261023/runtime.env`;
  inicio reproducible: `node tmp/sandbox-20261023/start.mjs`.
- `/users/me` de Mercado Pago autenticó el vendedor de prueba esperado, con
  indicador `test_user`; aplicación `1232783220387666`.
- Checkout recorrido en navegador con ambos productos y dirección sintética en
  La Plata. Zipnova devolvió OCA ARS 12.060 y Correo Argentino ARS 19.257, ambos
  para **un bulto**. Selección OCA: subtotal ARS 250, envío ARS 12.060, total
  ARS 12.310. Son importes de esta cotización, sujetos a vencimiento/recotización.
- Receptor del webhook accesible en localhost y por HTTPS/ngrok: ambos rechazan
  solicitudes sin firma con `401 INVALID_SIGNATURE`.
- 48 pruebas aprobadas: selección/aislamiento de dataset, inventario Sanity,
  perfiles de envío, gates de checkout/envío, webhook y configuración de correo.
  TypeScript, ESLint de los archivos modificados y build de Sanity Studio aprobados.

## Acceso y callback desbloqueados

Se inició sesión en Developers con el **Seller Test User** de la aplicación
`1232783220387666`. La verificación de e-mail aceptó el código de prueba derivado
del ID del vendedor. No fue necesario acceder a un buzón ficticio.

La preparación siguió la evidencia histórica [MP-04B](MP-04B.md) y actualizó la
URL del modo productivo **dentro de la aplicación del vendedor de prueba**.
La ejecución actual mostró que eso no bastaba: la notificación de esta compra
apareció en el filtro **Prueba**, con entrega fallida 404 a las 14:10:16 UTC,
mientras la URL del modo de prueba todavía apuntaba al túnel anterior.
Se corrigió también esa URL y se comprobó persistida al volver a la configuración.
Ambos modos de esa aplicación de prueba apuntan ahora al túnel vigente, con
`Order (Mercado Pago)` seleccionado y sin restablecer secretos.
El webhook productivo de Mariela no fue modificado.

La URL temporal actual termina en `/api/webhooks/mercado-pago`; consultar el
origen vigente en `tmp/sandbox-20261023/context.json` o en el túnel activo. Si el
túnel cambia, actualizarlo antes de comprar. El aviso inicial de ngrok puede
requerir que el usuario confirme la visita al retornar desde Mercado Pago.

## Compra completada, inventario y despacho

Se renovó la cotización y se inició un pedido desde el navegador, usando la opción
de pago con tarjeta sin cuenta. La tarjeta es la Mastercard de prueba oficial,
titular `APRO`, en una cuota; no se ingresaron datos de una tarjeta real.

- Pedido interno: `74e13b6f-f6f8-4dca-8413-0de2aba3a674`.
- Order de Mercado Pago: `ORDTST01M5MHCMCMQ0TQNRKAWT9E27W2`.
- Total: ARS 12.310 (productos ARS 250 + envío ARS 12.060).
- El usuario completó «Pagar». GET autoritativo de MP confirmó
  `processed/accredited`, mismo importe y referencia interna.
- El retorno mostró «Pago confirmado» después de consultar MP desde el backend.
  El estado no se tomó de los parámetros del navegador.
- Ambas reservas pasaron de `active` a `consumed`. Sanity `inventory_test` quedó
  con stock físico **2**, reservado **0**, versión **3** para cada producto
  (antes: físico 3, reservado 1). La recarga no volvió a descontar.
- Acceso al panel por enlace local y confirmación POST: correcto por HTTPS.
- Preparación versión 1: un paquete sintético de **600 g, alto 10, ancho 14,
  largo 24 cm**, con las dos piezas en una caja.
- Recotización OCA: ARS 12.060, igual al envío cobrado. Confirmación desde el panel
  creó un único envío sandbox Zipnova **31865536** / guía **0999-31865536**,
  identificador externo `CA-dd99c516c31949968c8ce69fb4c`.
- PDF descargado desde la ruta autenticada: una página, 11.731 bytes;
  inspección visual del destinatario sintético, OCA, despacho en sucursal y
  bulto **1/1**. Es una etiqueta sandbox: no acredita un despacho operativo.
- «Simular despacho» dejó un único registro a las **14:18:28 UTC** y el pedido
  en `shipped`; ninguna entrega física ni contratación operativa.
- `owner_paid` y `buyer_shipped`: `sent`, un intento cada uno, ambos dirigidos
  exclusivamente a Bruno. Resend los aceptó con IDs
  `01a1691b-2f99-7db3-a832-3a6e98bd1287` y
  `01a16920-a3ce-79de-9aca-e48bd9fc2a88`. No se certifica recepción en bandeja:
  la consulta de lectura con la clave disponible devolvió 401.

## Webhook e idempotencia: alcance de lo comprobado

- La entrega automática de esta compra quedó registrada como 404 en Developers;
  no alcanzó nuestro túnel vigente. La confirmación inicial fue la reconciliación
  del retorno. **Actualización del mismo día:** Mercado Pago reintentó el evento
  automáticamente y se recibió a las 14:30:47 UTC, con respuesta 200. Developers
  muestra «Entregada con éxito - 200», ambiente Prueba. Request ID
  `011d586f-8683-4b03-b659-2afe5a2053d7`, persistido en `processed_webhook` a las
  14:30:48 UTC. El panel no expuso un botón para reenviar manualmente ese evento.
- El simulador oficial llegó por HTTPS a las **14:22:09 UTC**. Se comprobó que
  su HMAC coincide con `MP_TEST_WEBHOOK_SECRET`; el receptor respondió
  `400 INVALID_WEBHOOK` porque el fixture genérico declara `live_mode: true`.
  No se relajó la validación de entorno para aceptar ese fixture.
- Se enviaron dos notificaciones **controladas**, firmadas localmente, para la
  order real de prueba, con `live_mode: false` y el mismo request ID
  `qa-controlled-20261023-duplicate-after-dispatch`. Ambas respondieron 200.
  Esto no se presenta como reenvío automático de Mercado Pago.
- Después de ambas: un `processed_webhook` para ese ID, pedido todavía `shipped`,
  stock 2/reservado 0/versión 3, un envío, un despacho y un aviso de cada tipo
  con sus IDs y número de intentos originales. Sin duplicados ni regresión de estado.

## Correcciones y regresiones

- `CANELA_DEV_HOST` habilita exclusivamente el hostname explícito del túnel para
  recursos de desarrollo de Next. Antes la protección de origen impedía hidratar
  correctamente la página de retorno.
- El acceso del panel detrás de proxy redirigía a `https://localhost:3000/admin`.
  Ahora utiliza el origen público configurado solo si Host/X-Forwarded-Host
  coincide exactamente, conservando el rechazo de solicitudes cross-site.
  Acceso, preparación, recotización y despacho comprobados por HTTPS.
- Regresión inicial: 7 fallos reproducidos antes del arreglo; 50 pruebas del panel
  y handlers relevantes aprobadas después. Ejecución final de pagos, inventario,
  envíos, avisos, dataset y autenticación: **300 aprobadas, 51 omitidas** por gates
  de integración/contrato. No se cuentan las omitidas como QA ejecutado.
- TypeScript (`tsc --noEmit`) y ESLint de los archivos modificados aprobados.

Producción conserva mantenimiento y checkout deshabilitado. Esta ejecución no
publicó código ni cambió variables de Vercel o el modo remoto de Zipnova.
La apertura y la compra controlada productiva siguen siendo pasos separados.
Evidencias locales privadas en `tmp/sandbox-20261023/`: `pago-confirmado.jpg`,
`despacho-sandbox-confirmado.jpg`, `etiqueta-sandbox.png`,
`webhook-intento-404.jpg`, `latest-state.json` y `replay-controlled.json`.
PDF descargado: `~/Downloads/canela-74e13b6f.pdf`.


## Revisión posterior: recepción automática confirmada

La comprobación del 23/10 a las 16:51 UTC cruzó Developers, el inspector HTTP de
ngrok y PostgreSQL. Los tres coinciden para el request ID anterior. El cuerpo
real tiene `live_mode: false`; el receptor no necesitó excepciones de firma ni
entorno. Stock físico 2/reservado 0/versión 3 en ambas piezas, un envío, un
registro de despacho y los dos avisos originales `sent`, un intento cada uno.
El pago original se confirmó antes por retorno: esta entrega automática prueba
recepción/autenticación e idempotencia tardía; por sí sola no demuestra la primera
transición de un pedido impago. Esa transición está cubierta por las suites SQL
/y handlers. La aceptación adicional sin retorno queda documentada en [UX-110](UX-110.md).
