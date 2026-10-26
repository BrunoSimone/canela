# OPS-01 — Despacho, avisos y aislamiento de entornos

Fecha: 2026-10-14. Contrato: [spec 080](../specs/080-despacho-avisos-apertura.md).
Entrega local; sin despliegue, migraciones remotas, activación comercial ni cobros
reales. La documentación de alcance y el plan se escribieron antes de implementar.

## Resultado

- Confirmación explícita y auditable de entrega al transporte; sandbox muestra
  «Simular despacho». Pedido, registro de despacho y aviso al comprador se guardan
  juntos. La etiqueta por sí sola no marca despacho.
- Aviso al taller dentro de la transacción que confirma pago y consume stock.
- Outbox por pedido/tipo, lease, payload congelado, reintento con la misma clave,
  backoff y revisión después de errores permanentes o 23 h de incertidumbre.
- Dos variantes de React Email (HTML/texto), transporte Resend compartido con el
  acceso administrativo, destino único de pruebas y estado visible en la ficha.
- Entorno persistido de la reserva a pago/envío/avisos; credenciales MP separadas,
  validación del entorno esperado, gates productivos y mantenimiento conservados.
- Endpoint/CLI de procesamiento, preflight de solo lectura y runbook de operación.
- Corrección detectada en revisión: el panel ya no llama «prueba» a un envío
  productivo simplemente porque su generación esté habilitada.

## Pruebas y trazabilidad

| Requisitos | Evidencia ejecutada |
| --- | --- |
| OPS-01/02 | SQL: cinco confirmaciones concurrentes → un despacho/aviso; pago/etiqueta/ID/contexto/seguimiento inválidos rechazados; webhook tardío conserva shipped/stock; búsqueda por TN |
| OPS-03 | SQL: confirmación → un aviso al taller; pendientes/rechazos/revisión sin aviso; fallo de INSERT revierte stock, pago y webhook |
| OPS-04 | Render HTML/texto, escaping de catálogo, URL de panel/seguimiento y TN opcional; dos envíos reales de prueba |
| OPS-05 | SQL/worker: claim exclusivo, lease recuperado, ack antiguo ignorado, payload inmutable, backoff, ventana 23 h, respuesta perdida e idempotencia estable |
| OPS-06 | HTTP: auth/origin/demo/confirmación/tamaño/malformed; worker con Bearer, Unicode inválido, falta de secreto, excepciones redactadas; excepción exacta del proxy |
| OPS-07/08 | Config de ambos entornos, credenciales faltantes/mezcladas, gates cerrados, callbacks con checkout pausado, pedido persistido, destinatarios aislados, mensajes/botones del panel |
| OPS-09 | Integración SQL completa en test y producción simulada, tarifa cambiada y cotización de entorno distinto bloqueadas antes de reserva/pago |
| OPS-10 | Preflight de solo lectura en PostgreSQL local, migraciones/checksums; [runbook](../runbooks/despacho-avisos-apertura.md) y [borrador sin enviar](../drafts/consulta-zipnova-condiciones.md) |

### Comandos finales

| Verificación | Resultado | Registro local ignorado |
| --- | --- | --- |
| `pnpm test` | 401 aprobados; 61 opt-in omitidos | `tmp/ops-unit-all.log` |
| `pnpm test:db` con PostgreSQL 17 descartable | 54 aprobados | `tmp/ops-db-all.log` |
| Contrato Zipnova de recuperación/PDF | 1 aprobado | `tmp/ops-zipnova-contract.log` |
| `pnpm exec tsc --noEmit` | Aprobado | `tmp/ops-types.log` |
| `pnpm lint` | Aprobado | `tmp/ops-lint.log` |
| `pnpm build` | Aprobado | `tmp/ops-build.log` |
| `git diff --check` | Aprobado | Verificación final |

Logs rojos previos: `tmp/ops-red-db.log`, `ops-red-worker.log`, `ops-red-mail.log`,
`ops-red-http.log`, `ops-red-production.log`, `ops-environment-red.log`,
`ops-ui-red.log`. Las suites finales incluyen regresiones anteriores. Los tests de
DB son destructivos solamente sobre su base local descartable; nunca usar Neon
productivo como `TEST_DATABASE_URL`.

## Alcance real de la prueba integrada

`purchase-flow.integration.test.ts` ejecuta casos de uso y repositorios reales:
quote firmado → beginCheckout → reserva/orden MP controlada → confirmación por GET
controlado → stock → preparación → fulfillment/etiqueta controlados → despacho →
render → outbox. No usa un UPDATE manual para fingir el paso del pago. Simula una
respuesta de correo perdida después de aceptación y verifica dos mensajes únicos
con tres solicitudes. Toda interacción de pago/transporte/correo en esta suite es
un gateway controlado; la variante «production» no usa cuentas ni dinero reales.

Esto **no equivale** a haber completado una compra externa única con MP y Zipnova.
Esa aceptación sigue pendiente. El historial del proyecto contiene validaciones
previas independientes de MP y Zipnova; no se suman como si fueran una sola compra.

## Verificación de navegador y proveedores

Se levantó Next local en puerto 3005 con una base independiente (Docker 55434) y
un pedido sintético. Se reutilizó el PDF y la referencia del envío sandbox existente;
no se creó otro envío remoto. El pago de esa fixture se aplicó por repositorio
con estado controlado, no fue una compra MP externa.

1. Entrar con un enlace administrativo de prueba; abrir la ficha con rótulo listo.
2. Botón de despacho deshabilitado hasta marcar la confirmación.
3. «Simular despacho» → estado «Despachado», actor/fecha y dos avisos en la ficha.
4. «Actualizar estado» → ambos «Aceptado por Resend», un intento cada uno.
5. Descargar la misma etiqueta privada después del despacho: PDF obtenido.
6. Recargar tras el ajuste de entorno: estado y avisos conservados.

Captura: `tmp/ops-despacho-avisos.png`. Datos de destinatario ficticios.
Al terminar se cerraron la pestaña y el servidor temporales y se eliminó el
contenedor PostgreSQL descartable; los logs y la captura permanecen en `tmp/`.
Los dos correos reales salieron exclusivamente al email de pruebas autorizado de
Bruno, con `[PRUEBA]` y cuerpo de simulación; aceptación guardada con ID Resend.
Consulta posterior del estado de entrega: API respondió 401, así que no se afirma
entrega en bandeja. Metadatos sin payload: `tmp/ops-email-evidence.json`.

La repetición del contrato Zipnova recuperó el mismo envío mediante lectura y su
PDF de prueba. Se conserva `tmp/zipnova-fulfillment-contract.json`: no eliminarlo
para reintentar, porque registra la identidad previa al POST original.

## Pendientes registrados al cierre del 14/10

Este apartado conserva los pendientes de esa entrega. Para el estado vigente,
consultar [el plan de apertura](../plans/007-apertura-2026-10-27.md). La recuperación
manual quedó implementada y verificada el 26/10 en [MAN-121](MAN-121.md).

- Embalajes/clasificación/stock reales, correo del dueño, preparación y viabilidad
  de llevar paquetes a sucursal. El catálogo todavía requiere esos datos.
- Respuesta comercial sobre frágiles, multibulto y coordinación de modo operativo.
- Compra externa integral y aceptación de su resultado.
- Aplicar migraciones 0008..0010, configurar secretos/gates y desplegar en un paso
  posterior autorizado. Esta iteración no modificó Vercel, Neon ni `.env.local`.

El preflight local reportó cerrados checkout/alta y ausencia de secreto del worker,
como correspondía a la configuración examinada. Confirmó migraciones completas,
callbacks y correo. El preflight no sustituye la aprobación de apertura.
