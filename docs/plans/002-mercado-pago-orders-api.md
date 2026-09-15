# Plan de acción: Mercado Pago mediante Orders API

## Estado

Aprobado el 2026-09-14. ADR-003 y `capture_mode = automatic_async` quedaron aceptados; el próximo incremento ejecutable es MP-02A.

## Resultado esperado

Checkout Pro probado de extremo a extremo contra una aplicación de prueba, con stock concurrente seguro, order expirable, Webhook firmado, reconciliación y feature flag productivo apagado hasta integrar la tarifa de Correo.

## Orden de trabajo

### Puerta 0 — Cerrada el 2026-09-14

- Orders API aprobada en ADR-003.
- `automatic_async` aprobado para priorizar conversión sin aceptar pagos offline.
- Definir cantidad máxima de cuotas.

La cantidad máxima de cuotas es una configuración comercial pendiente, pero no bloquea MP-02A.

**Salida:** spec 020 aprobada para implementación.

### MP-02A — Adaptar persistencia y cliente

- Agregar una migración aditiva para `provider_order_id`, `checkout_url`, `provider_status` y `provider_status_detail`.
- No editar la migración 0001 ya verificada.
- Implementar el adaptador de `POST /v1/orders` y `GET /v1/orders/{id}`.
- Reusar una idempotency key estable al reintentar el mismo intento.
- Agregar pruebas unitarias del payload, decimales ARS y mapeo de estados.

**Puerta:** lint, tipos, migración reversible/compatible y pruebas locales verdes.

### MP-02B — Pruebas de contrato oficiales

- Crear/configurar la aplicación de prueba de Canela.
- Ejecutar la matriz de `docs/research/001-mercado-pago-orders-api.md`.
- Confirmar `PT10M`, exclusión de `ticket`, compra sin `account_only` y envío como ítem.
- Capturar requests/responses redactados como evidencia versionada.
- Corregir la spec si el ambiente contradice la documentación.

**Puerta:** ningún supuesto crítico sin evidencia real.

### MP-03 — Checkout y retorno detrás de feature flag

- Extender `POST /api/checkout` con cotización firmada.
- Para pruebas usar un proveedor de cotización controlado, claramente no productivo.
- Crear order MP y redirigir a `checkout_url`.
- Implementar la pantalla de resultado que consulta el pedido Canela.
- No confirmar pago desde query params del navegador.

**Puerta:** aprobado, rechazado, processing, abandono y retorno falsificado pasan E2E.

### MP-04 — Webhook y confirmación

- Configurar evento Order (Mercado Pago) y secreto de prueba.
- Validar la firma con `x-signature`, `x-request-id` y `data.id`.
- Deduplicar el evento y consultar la order MP.
- Consumir/liberar/conservar stock según estado verificado.
- Responder dentro de la ventana del proveedor después de persistir el trabajo.

**Puerta:** duplicados, desorden, demora y firma inválida no producen efectos dobles.

### MP-05 — Expiración y recuperación

- Worker para reservas vencidas.
- Consulta/reintento antes de liberar.
- Tratar `processing` y caída del proveedor sin reofrecer la unidad.
- Alertar `review_required` y documentar runbook.

**Puerta:** prueba de Webhook tardío y caída de MP cerca de `PT10M`.

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
