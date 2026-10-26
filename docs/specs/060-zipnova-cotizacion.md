# Cotización de envíos con Zipnova

> Actualización 16/10/2026: la [spec 090](090-apertura-caja-compartida.md)
> reemplaza la estrategia de bultos por unidad y agrega caja compartida, inventario,
> aprobación de costo real y gestión de avisos. La [spec 121](121-recuperacion-manual-sin-cron.md)
> establece recuperación manual sin cron desde el 26/10/2026.

## Estado y alcance

Iteración autorizada por Bruno el 2026-10-13: avanzar mientras soporte habilita
sandbox. Sustituye el contrato de tarifas de la spec 040, conservando sus reglas
de embalaje. No habilita ventas productivas ni crea envíos, etiquetas o cargos.

Actualización posterior del 2026-10-13: soporte confirmó sandbox para Canela con
las mismas credenciales y URL. El origen actual ofrece despacho en sucursal;
se validará primero un bulto. El alcance multibulto para OCA necesita aclaración
frente a la respuesta comercial, aunque el prototipo recibió una tarifa para
dos bultos. [Detalle y siguiente alcance](../research/004-zipnova-sandbox.md).

La continuación en [spec 070](070-zipnova-alta-etiqueta.md) implementa alta y
etiqueta sandbox y limita el checkout a un bulto por defecto, hasta acordar
la operación comercial. Los límites del presente documento describen la
iteración de cotización, no todas las capacidades posteriores.

## Comportamiento

- **ZIP-01:** Cotizar todos los bultos en una llamada a `/v2/shipments/quote`.
  Desde la [spec 125](125-margen-embalaje.md), esa consulta incluye el margen de
  embalaje configurado, incluso si cambia de tramo tarifario. El servidor
  relee precios y perfiles publicados. El valor declarado es el
  subtotal de productos; no incluye el porte. Falta de medidas o clasificación
  explícita impide cotizar. No se asume que las artesanías son mercadería General.
- **ZIP-02:** El comprador aporta carrito, localidad, provincia y CP argentino
  de cuatro cifras. No se deriva una localidad del CP. Solo entrega a domicilio.
- **ZIP-03:** Mostrar opciones seleccionables de transporte y precio con IVA
  (`price_incl_tax`), ordenadas por precio. Despacho en sucursal o retiro se
  configura en servidor; no se cambia automáticamente si no hay cobertura.
- **ZIP-04:** Cada opción lleva una firma v3 ligada a configuración de cuenta y
  origen, destino normalizado, precios/productos/cantidades, embalaje y
  clasificación, transporte, servicio, despacho, importe y fecha de emisión.
  Validez local: diez minutos. No representa una garantía de precio del operador;
  `estimation_expires_at` no se utiliza como vencimiento de la tarifa.
- **ZIP-05:** Antes de reservar stock, autenticar la firma, releer el catálogo,
  reconstruir bultos y recotizar. Si cambia el costo al comprador o al vendedor,
  el carrito, embalaje, origen o destino, exigir nueva selección sin iniciar pago.
  Conservar la evidencia de la selección original para reintentos idempotentes.
- **ZIP-06:** Guardar el snapshot de transporte y bultos en la misma transacción
  que la reserva. No guardar el token firmado ni secretos. Los pedidos anteriores
  y las pruebas controladas admiten snapshot nulo.
- **ZIP-07:** La interfaz invalida selección al cambiar destino/carrito, ignora
  respuestas de consultas anteriores, muestra errores recuperables y permite
  recotizar. No muestra envío cero cuando falta tarifa. Los precios releídos se
  utilizan en el resumen; pagar requiere una opción vigente.
- **ZIP-08:** Credenciales exclusivamente en servidor, timeout, redirects
  bloqueados, errores redactados, body limitado y cuota compartida en PostgreSQL
  de 60 consultas por minuto (incluida recotización). No reintentar automáticamente
  llamadas fallidas. Mantenimiento y checkout deshabilitado bloquean estas rutas.
- **ZIP-09:** El pago continúa limitado a credenciales MP de pruebas. La selección
  `SHIPPING_PROVIDER=zipnova` excluye la tarifa controlada; una mala configuración
  falla cerrada. El modo de cuenta Zipnova debe declararse explícitamente y no
  cambia por ejecutar localhost. No existe código para dar de alta envíos aquí.

## Contrato de Canela

`POST /api/shipping/quotes` recibe `{items: [{productId, quantity}], destination:
{city, provinceCode, postalCode}}`. Devuelve `{subtotalCents, items, options}`,
donde cada opción contiene `quoteToken`, `shippingCents`, `carrierName`,
`serviceName`, `parcelCount`, `expiresAt`. El checkout recibe la selección en su
campo existente `shippingQuoteToken`.

## Verificación

Pruebas de un bulto/multibulto, pesos o clasificación ausentes, respuestas
incompletas/no seleccionables, centavos, timeout/401/429/5xx, firma alterada,
expiración, destino/carrito/perfil cambiado y recotización con precio distinto.
Verificar que todo rechazo sucede antes de reservar o llamar a Mercado Pago;
probar persistencia e idempotencia en una base local descartable. Inspeccionar
la pantalla y probar la ruta con catálogo simulado solo en tests y en una
ejecución local aislada; nunca escribir fixtures en Sanity productivo.

## Pendientes externos para apertura

Validación de alta/etiquetas en el sandbox confirmado; modalidad de despacho acordada;
alcance del límite de un bulto aclarado;
clasificación y aceptación de piezas frágiles; medidas reales del catálogo;
plazos de preparación; flujo de fulfillment y prueba coordinada de punta a punta.
El modo mantenimiento y las variables productivas se conservan.

## Evidencia

[Contrato observado y documentación oficial](../research/003-zipnova-validacion.md).
[Implementación y verificación local](../evidence/ZIP-01.md).
