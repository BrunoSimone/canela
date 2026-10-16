# Plan OPS — TDD desde la spec 080

## 1. Despacho y persistencia (OPS-01/02/03)

Escribir primero integración PostgreSQL que falle por ausencia de funcionalidad:
registro único concurrente, precondiciones, atomicidad de avisos/pago/stock,
rollback y webhook duplicado. Luego implementar migración/repositorios y handler.
Finaliza con esos escenarios pasando y contratos anteriores conservados.

## 2. Emails y recuperación (OPS-04/05/06/07)

Tests previos de templates (HTML/texto y escaping), configuración, aislamiento,
transporte (idempotency header, timeout/429/5xx/permanentes), worker (lease vencido,
respuesta perdida, payload estable, 23 h) y autenticación/reintento. Implementar
cola, transporte compartido, worker, endpoints y ficha. Envío de prueba solo al
correo autorizado de Bruno; nunca usar destinatarios reales de compradores.

## 3. Preparación de producción (OPS-07/08/10)

Matriz de configuración: disabled/test/live; secretos faltantes o mezclados;
HTTP, tarifas simuladas, Zipnova sandbox y gate cerrado. Persistir entorno,
verificar callbacks y órdenes contra identidad/entorno esperado; probar que
pausar checkout no desactiva callbacks. Preflight y runbook sin activar producción.

## 4. Prueba integrada y evidencia (OPS-09/10)

Suite determinista con PostgreSQL y contratos externos controlados: cotización,
checkout, pago, inventario, preparación, etiqueta, despacho y dos avisos.
Repetir eventos y fallos relevantes. Verificar ficha real en navegador con fixture
local y PDF sandbox existente. Intentar validación externa de correos y documentar
qué tramos externos permanecen pendientes. No sustituir compra real por UPDATE paid
sin explicitarlo. Ejecutar suites, tipos, lint y build; guardar evidencia OPS-01.

## Matriz mínima

| Riesgo | Nivel |
| --- | --- |
| Despacho sin pago/etiqueta/confirmación, ID/contexto cambiado | Dominio + SQL |
| Doble clic y webhook duplicado, rollback de pago | SQL concurrente |
| Cola perdida o envío duplicado tras caída | SQL + worker + contrato Resend |
| Destinatario de producción en pruebas | Config + worker |
| 401/403, demo, input grande/malformado, caché/PII | HTTP |
| Texto/HTML, URLs permitidas, escaping | Render de templates |
| Gate comercial y credenciales de otro entorno | Config + flujo de pago |
| Recorrido total y errores sin segundo cobro/envío/email | Integración SQL |
| Estado visible, confirmación, descarga y reintento | Navegador local |

## Cierre 2026-10-14

- [x] Specs/diseño y pruebas de fallos antes de las piezas de implementación.
- [x] Despacho transaccional, concurrencia y rollback.
- [x] Templates, transporte compartido, cola y recuperación.
- [x] Entorno persistido de compra a envío/avisos y gates productivos cerrados.
- [x] Flujo integrado con PostgreSQL y gateways externos controlados.
- [x] Navegador local: confirmar, consultar avisos y descargar PDF.
- [x] Dos correos de prueba aceptados por Resend, destinados solo a Bruno.
- [x] Contrato Zipnova repetido por lectura del mismo envío sandbox, sin nuevo POST.
- [x] Preflight, runbook y borrador de consulta comercial.
- [ ] Aceptación externa integral de compra MP + Zipnova + correo con un pedido común.
- [x] Scheduler y preparación de configuración para despliegue cerrado completados en spec 090; verificar publicación en OPEN-01.
- [ ] Confirmaciones comerciales/datos del dueño y posterior aprobación de apertura.

Detalle verificable y límites: [OPS-01](../evidence/OPS-01.md).
