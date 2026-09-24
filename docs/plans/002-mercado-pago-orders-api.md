# Plan de acción: Mercado Pago mediante Orders API

## Estado

Aprobado el 2026-09-14. ADR-003 y `capture_mode = automatic_async` quedaron
aceptados. MP-01, MP-02, MP-03, MP-03B3, MP-04A, MP-04B y MP-04C están
cerrados. Una prueba manual del catálogo detectó que MP-03B2 no hacía visible
la compra desde la landing; MP-03B3 corrigió esa integración antes de continuar
con la confirmación autoritativa.

## Resultado esperado

Checkout Pro probado de extremo a extremo contra una aplicación de prueba, con stock concurrente seguro, order expirable, Webhook firmado, reconciliación y feature flag productivo apagado hasta integrar la tarifa de Correo.

## Orden de trabajo

### Puerta 0 — Cerrada el 2026-09-14

- Orders API aprobada en ADR-003.
- `automatic_async` aprobado para priorizar conversión sin aceptar pagos offline.
- Definir cantidad máxima de cuotas.

La cantidad máxima de cuotas es una configuración comercial pendiente, pero no bloquea MP-02A.

**Salida:** spec 020 aprobada para implementación.

### MP-02A — Adaptar persistencia y cliente — completada localmente el 2026-09-15

- Alinear la spec 010 con las decisiones ya aprobadas y registrar los límites de
  arquitectura en ADR-004/005.
- Agregar una migración aditiva para `provider_order_id`, `checkout_url`, `provider_status` y `provider_status_detail`.
- No editar la migración 0001 ya verificada.
- Implementar el adaptador de `POST /v1/orders` y `GET /v1/orders/{id}`.
- Reusar una idempotency key estable al reintentar el mismo intento.
- Agregar pruebas unitarias del payload, decimales ARS y mapeo de estados.
- Separar el código de dominio de los contratos y transporte específicos de
  Mercado Pago.

**Puerta:** lint, tipos, migración reversible/compatible y pruebas locales verdes.

La puerta local quedó cerrada con 19 pruebas unitarias del adaptador, 4 pruebas
de integración contra PostgreSQL 17, lint, tipos y build verdes. Las migraciones
0001 y 0002 también quedaron aplicadas y verificadas en la branch `development`
de Neon; no se usó la branch productiva.

### MP-02B — Pruebas de contrato oficiales — completada el 2026-09-15

- Crear/configurar la aplicación de prueba de Canela.
- Ejecutar la matriz de `docs/research/001-mercado-pago-orders-api.md`.
- Confirmar `PT10M`, exclusión de `ticket`, compra sin `account_only` y envío como ítem.
- Capturar requests/responses redactados como evidencia versionada.
- Corregir la spec si el ambiente contradice la documentación.

**Puerta:** ningún supuesto crítico sin evidencia real.

La API y Checkout Pro ya confirman creación, consulta, `PT10M`, dos ítems,
exclusión de `ticket`, suma, idempotencia, compra invitada, aprobado, rechazo
reintentable, processing y cancelación. Falta observar Webhooks sobre una URL
HTTPS real; esa verificación queda en MP-04, junto al endpoint receptor.

### MP-03A — Orquestación del inicio de checkout — completada el 2026-09-15

- Conectar reserva, intento de pago, Orders API y persistencia del resultado.
- Reusar snapshots e idempotency key persistidos ante un reintento.
- Liberar una reserva únicamente ante un fallo definitivo de creación.
- Conservarla y marcar revisión ante timeout, `5xx`, `409` o resultado
  incoherente del proveedor.

**Puerta:** pruebas unitarias del caso de uso y pruebas de integración de las
transiciones de Neon demuestran éxito, reintento, fallo definitivo y resultado
ambiguo sin sobreventa.

La orquestación usa el snapshot persistido para crear o reintentar la order,
conserva stock ante resultados ambiguos y libera de forma idempotente solo ante
un rechazo definitivo. Las transiciones se probaron contra PostgreSQL 17 local;
las migraciones aditivas se verificaron en Neon `development`.

### MP-03B1 — Contrato HTTP detrás de feature flag — completada el 2026-09-15

- Extender `POST /api/checkout` con cotización firmada.
- Para pruebas usar un proveedor de cotización controlado, claramente no productivo.
- Releer nombre y precio publicados desde Sanity sin aceptar importes del navegador.
- Exponer el estado presentable por token público no enumerable.
- Mantener el endpoint apagado por defecto.

**Puerta:** validación HTTP, token manipulado, catálogo no vendible, falta de
stock, reintento y retorno falsificado pasan pruebas sin que el navegador pueda
confirmar un pago.

Los endpoints de inicio y estado público quedaron implementados con el checkout
apagado por defecto. El modo controlado exige credenciales `TEST-`, la tarifa
viaja firmada y el navegador nunca envía precios ni totales.

### MP-03B2 — Confirmación, redirección y retorno

- Incorporar Redux Toolkit y RTK Query para carrito, mutación y polling.
- Persistir localmente el carrito sin comprometer el render inicial de Next.js.
- Mantener los encargos en WhatsApp y limitar el pago inmediato a piezas
  publicadas para venta directa.
- Mostrar el desglose de productos, envío y total antes de Mercado Pago.
- Crear order MP y redirigir a `checkout_url`.
- Implementar la pantalla de resultado que consulta el pedido Canela.
- No confirmar pago desde query params del navegador.
- Vaciar el carrito únicamente después de observar `paid` desde el endpoint
  interno.
- Separar la credencial del ambiente como `MP_TEST_ACCESS_TOKEN`; Checkout
  Pro/Orders usa `APP_USR` tanto en prueba como en producción y el prefijo no es
  una defensa válida.

**Puerta:** reducer persistible, requests sin importes, redirección, abandono,
estados inciertos y retorno falsificado pasan pruebas del nivel apropiado; lint,
tipos y build permanecen verdes.

La puerta quedó cerrada el 2026-09-15: el carrito persistente usa Redux Toolkit,
la mutación y el polling usan RTK Query, la confirmación no envía importes y el
retorno ignora datos no autoritativos del navegador. La evidencia se encuentra
en `docs/evidence/MP-03B2.md`.
Los E2E de aprobado, rechazado y `processing` cierran en MP-04, cuando exista
confirmación autoritativa.

### MP-03B3 — Conexión visible del catálogo al checkout controlado — completada el 2026-09-15

- Convertir el selector existente en un carrito único, sin mantener una variante
  visual paralela de consulta.
- Comunicar `Agregar al carrito` en productos de venta directa, con independencia
  del feature flag de pago.
- Mantener una acción de consulta solamente para productos `encargo`.
- Usar el feature flag únicamente para habilitar la navegación desde el carrito
  a la confirmación de pago.
- Cruzar cada vista nueva del catálogo con la disponibilidad autoritativa de
  Neon, manteniendo visibles los encargos y ocultando venta directa sin stock.
- Preparar inventario de prueba con ids reales de Sanity únicamente en Neon
  `development`, sin inferir cantidades productivas.
- Verificar el recorrido local hasta la confirmación sin configurar ni ejecutar
  Webhooks.

**Cubre:** RF-CHK-001, CA-001, CA-MP-015, CA-MP-019 y CA-MP-025.

**Puerta:** pruebas unitarias del lenguaje de compra/consulta, recorrido visual
`landing → carrito → confirmación`, lint, tipos y build verdes. El envío sigue
marcado como controlado y el checkout productivo permanece apagado.

**Commit previsto:** `fix: connect catalog to controlled checkout`

La landing usa un único carrito, presenta la compra online como recorrido
principal y conserva WhatsApp como ayuda y canal de encargos. Cada render nuevo
cruza el contenido de Sanity con `available > 0` en Neon; el checkout vuelve a
validar atómicamente para proteger pestañas desactualizadas. El recorrido local
llegó hasta la confirmación sin crear una order MP ni requerir Webhooks.

### MP-04A — Confirmación autoritativa local

Completada localmente el 2026-09-15.

- Validar la firma con `x-signature`, `x-request-id` y `data.id`.
- Rechazar eventos malformados o de otro ambiente antes de producir efectos.
- Consultar la order MP y verificar id, referencia, monto, moneda, vendedor y
  aplicación.
- Deduplicar y consumir/liberar/conservar stock en una única transacción.
- Probar concurrencia, rollback y monotonía contra PostgreSQL real.

**Puerta:** firma inválida no consulta MP; aprobado consume una sola vez;
pendiente conserva; terminal negativo libera; discrepancias conservan y pasan a
revisión; un fallo no pierde el evento.

**Commit previsto:** `feat: confirm Mercado Pago payments from signed webhooks`

### MP-04B — Contrato HTTPS del Webhook — completada el 2026-09-24

- Desplegar el endpoint en una URL HTTPS de preview.
- Configurar evento Order (Mercado Pago) y secreto de prueba.
- Simular una notificación desde el panel y capturar request/response redactados.
- Ejecutar aprobado, `processing`, rechazo reintentable, duplicado y firma
  alterada contra el endpoint real.
- Confirmar respuesta `200` dentro de los 22 segundos o documentar el cambio a
  una cola durable si la latencia real no deja margen seguro.

**Puerta:** duplicados, desorden, demora y firma inválida no producen efectos dobles.

El 2026-09-24 una compra sandbox real permitió cerrar la discrepancia de firma:
la aplicación de prueba firma `data.id` normalizado a minúsculas, mientras la
documentación presenta el identificador literal. El receptor acepta ambas
canonicalizaciones con el mismo secreto y conserva el rechazo de firmas
alteradas. La entrega oficial corregida y su duplicado respondieron `200` dentro
del límite, con una sola entrega y un solo ajuste en Neon. Una segunda compra
sandbox produjo `processing/in_process`: su Webhook oficial respondió `200` en
2,2 segundos y Neon conservó el pedido pendiente, la reserva activa, stock `1`,
reservado `1` y cero ajustes. La matriz HTTPS quedó cerrada sin usar el timeout
del simulador del panel como evidencia del receptor.

**Commit previsto:** `test: verify Mercado Pago webhook contract`

### MP-04C — Reconciliación segura desde el retorno — completada el 2026-09-23

- Agregar `POST /api/orders/{public_token}/reconcile` sin body de pago.
- Resolver `provider_order_id` desde Neon y consultar Orders API desde el
  servidor.
- Reutilizar las validaciones de identidad, referencia, importe y moneda y la
  transición transaccional del Webhook.
- No insertar una entrega Webhook ficticia durante reconciliación.
- Hacer que la pantalla de resultado dispare una reconciliación al entrar y
  continúe leyendo el estado público acotado solo mientras esté visible.
- Limitar el polling del estado interno; abandonar la pantalla lo detiene y no
  se instala polling global en el resto de Canela.
- Probar retorno falsificado, pago acreditado, estado pendiente, fallo transitorio
  y concurrencia con Webhook sin efectos dobles.

**Cubre:** RF-PAY-004/005/006/007/008, CA-MP-007/009/010/024/026/027/028.

**Puerta:** una order acreditada converge a `paid` al volver el comprador; ningún
parámetro del navegador elige la order ni confirma el pago; repeticiones y carrera
con Webhook conservan un único consumo de stock.

Las pruebas unitarias, PostgreSQL 17 aislado, lint, tipos y build están verdes.
La compra sandbox manual confirmó el retorno `pending` → `paid`, el consumo
único de la reserva y la desaparición del producto agotado de la landing.
La evidencia está registrada en `docs/evidence/MP-04C.md`.

**Commit previsto:** `feat: reconcile Mercado Pago payments on checkout return`

### MP-05 — Expiración y recuperación

- Alinear `expires_at` y la vigencia de la order en `PT10M` sin convertir el
  reloj en una transición de inventario.
- Liberar únicamente tras verificar `failed`, `canceled` o `expired` en Mercado
  Pago; consumir ante `processed/accredited` y conservar ante `processing` o
  duda.
- Depender de los reintentos del Webhook cuando el comprador no regresa y
  mantener la pieza bloqueada hasta recibir un resultado autoritativo.
- Alertar `review_required` y documentar el runbook sin cron ni acción manual de
  reconciliación para el dueño.

**Puerta:** prueba de Webhook tardío, expiración verificada y caída de MP cerca
de `PT10M`, demostrando que el reloj aislado no libera stock.

### INT-00/01 — Conectar Correo antes de producción

- Validar contrato oficial en QA y cotización de entrega a domicilio.
- Incorporar perfiles de paquete cuando el dueño pueda aportarlos.
- Sustituir el proveedor de cotización controlado por el adaptador real.
- Verificar que tarifa, snapshot, ítems MP y total coincidan.

Los perfiles concretos no bloquean MP-02 a MP-05 en prueba; sí bloquean el feature flag productivo.

### ADM-00/04 — Operación del dueño

- Implementar acceso por email.
- Construir bandeja, búsqueda, orden, preview y detalle según spec 030.
- Integrar después el flujo de medidas reales, importación de envío, rótulo y TN.

### MP-06 — Salida gradual

- E2E completo con Correo QA + Mercado Pago prueba.
- Revisión de privacidad, devolución, seguridad y observabilidad.
- Smoke test productivo controlado.
- Activar feature flag gradualmente y mantener WhatsApp como respaldo inicial.

## Dependencias externas

- Credenciales y secreto de Webhooks de Mercado Pago.
- URL HTTPS de preview.
- Neon remoto.
- Credenciales QA de MiCorreo para la conexión posterior.

## Riesgos controlados

- **Orders es reciente:** contrato real obligatorio, sin asumir paridad con Preferences.
- **Estado processing:** stock conservado y reconciliación; no segundo cobro.
- **Tarifa no disponible:** checkout público apagado, pero desarrollo MP continúa.
- **Timeout al crear:** misma idempotency key, nunca reintento con nueva clave.
- **Retorno falsificado:** página informativa; Webhook + GET autorizan efectos.
- **Ítem de envío no aceptado/poco claro:** desglose previo en Canela y ajuste de payload documentado.

## Evidencia de cierre

- ADR-003 aceptado.
- Spec 020 aprobada y criterios CA-MP verdes.
- Matriz de contrato con payloads redactados.
- Informe E2E de prueba.
- Runbook de reconciliación/reembolso.
- Feature flag productivo con aprobación explícita.
