# Plan de implementación: cotización de Correo Argentino

## Estado

Propuesto el 2026-09-25. Requiere aprobación de la spec 040 y completar la puerta
de contrato de INT-00 antes de conectar el proveedor real.

## Objetivo

Reemplazar la tarifa controlada de pruebas por una cotización domiciliaria de
Correo Argentino ligada al destino, carrito y plan de bultos, sin debilitar el
checkout de Mercado Pago ya validado.

## Dependencias externas

- Respuesta del ejecutivo de Correo sobre API(s) habilitada(s).
- Credenciales QA ingresadas mediante un canal seguro.
- `customerId` o `agreement` y productos habilitados.
- Perfiles embalados y reglas de agrupación del catálogo.

## INT-00A — Contrato público y bloqueo explícito

**Estado:** completado el 2026-09-25.

**Cubre:** ADR-002 y puerta previa de INT-00.

**Entregables:**

- análisis de API MiCorreo y PAQ.AR API 2.0 desde URLs oficiales;
- probes no autenticados de `/token` y `/rates` en QA;
- discrepancia de límites documentada;
- matriz QA y datos que se deben solicitar a Correo;
- spec 040 de cotización y bultos.

**Verificación:** fuentes oficiales enlazadas, PDFs renderizados/inspeccionados y
respuesta `401` esperada de ambas rutas protegidas.

**Punto de commit:** `docs: define Correo Argentino shipping contract`

## INT-00B — Contrato ejecutable de la cuenta

**Cubre:** matriz de contrato de research 002.

**Cambios previstos:**

- configuración QA server-only;
- prueba de autenticación opt-in;
- prueba de `/rates` válida e inválida;
- captura redactada de campos, moneda, precisión, `validTo`, límites y errores;
- decisión final de responsabilidades MiCorreo/PAQ.AR 2.0.

**Pruebas:** no corren por defecto ni imprimen secretos; se activan con una
variable explícita y credenciales QA.

**Riesgo:** una contradicción entre QA y documentación bloquea este incremento y
se escala a Correo; no se implementa una interpretación local.

**Finalización:** autenticación y tarifa domiciliaria reproducibles en QA, con
servicio y límites de Canela identificados.

**Punto de commit:** `test: verify Correo Argentino QA contract`

## INT-01A — Perfil logístico y plan de bultos

**Avance local del 2026-09-27:** existen los campos opcionales de perfil embalado
en Sanity, un lector server-side y un planificador puro con pruebas. Todavía no
hay perfiles reales cargados, reglas de agrupación aprobadas ni límites QA; por
eso el incremento no está terminado ni conectado al checkout.

**Cubre:** RF-SHP-002 a RF-SHP-006; CA-SHP-002, CA-SHP-005 a CA-SHP-008.

**Cambios previstos:**

- campos estructurados de embalaje en Sanity, separados de `medidas`;
- lectura server-side de perfiles publicados;
- modelo de peso/dimensiones y límites configurados por contrato;
- planificador determinista: regla de caja común o bultos separados;
- huella canónica de productos, cantidades, perfiles y plan.

La primera implementación acepta una regla de caja común solamente cuando su
lista de productos y cantidades coincide con el carrito completo. Cada regla
debe incluir peso y dimensiones exteriores aprobados. Sin coincidencia, genera
un bulto por unidad protegida; no inventa una caja conjunta. La composición
parcial de grupos queda pendiente de una regla operativa del taller.

**Ciclo de pruebas:**

1. Rojo: perfil inválido/faltante, unidades repetidas, agrupación explícita,
   fallback separado y límites.
2. Verde: mínima implementación de dominio sin llamadas externas.
3. Refactor: tipos y responsabilidades separados entre catálogo y shipping.

**Finalización:** fixtures representativos producen siempre el mismo plan; ningún
dato de exhibición se usa como medida logística.

**Punto de commit:** `feat: model shipping profiles and parcel plans`

## INT-01B0 — Núcleo interno previo al contrato QA

**Avance local del 2026-09-27:** el caso de uso relee perfiles publicados,
construye el plan, exige una tarifa del servicio configurado para cada bulto,
suma importes enteros en centavos y usa el vencimiento más temprano. El token
firmado v2 liga ambiente, modalidad domiciliaria, CP de origen/destino, carrito,
huella de bultos, servicio, importe y vencimiento. Las pruebas usan un puerto de
tarifas simulado; no hay adaptador de red ni cotización disponible en la web.

Este tramo es independiente del payload de Correo. No confirma moneda, precisión,
`productType`, límites ni semántica de `validTo` del contrato ejecutable. La
vigencia se comprueba después de recibir todas las tarifas y debe cubrir los diez
minutos completos del checkout. El token controlado v1 y el checkout MP actual
permanecen sin cambios.

El formato definitivo del código postal se valida en INT-00B/HTTP; este caso de
uso interno solo exige un valor no vacío y no publica aún una ruta.

**Datos del taller:** [checklist de perfiles embalados](../runbooks/perfiles-embalaje-correo.md).

## INT-01B — Cotización real y snapshot firmado

**Cubre:** RF-SHP-001, RF-SHP-006 a RF-SHP-012; CA-SHP-001 a CA-SHP-014.

**Cambios previstos:**

- conexión del puerto normalizado con el proveedor validado en QA;
- adaptador del contrato confirmado en INT-00B;
- caché server-side del token de acceso si corresponde;
- verificación de moneda, precisión, `validTo`, producto y modalidad reales;
- `POST /api/shipping/quotes` con validación y errores normalizados.

**Pruebas:** unitarias del adaptador con `fetch` controlado, aplicación multibulto,
HTTP, expiración, firma alterada, timeout, `429`, `50x` y ausencia de secretos.

**Finalización:** una petición local con proveedor QA devuelve una cotización real
verificable; un fallo no modifica inventario ni pagos.

**Punto de commit:** `feat: add Correo Argentino shipping quotes`

## INT-01C — Integración vertical con checkout

**Cubre:** RF-SHP-001, RF-SHP-007 a RF-SHP-012; CA-SHP-003, CA-SHP-004,
CA-SHP-009 a CA-SHP-012.

**Cambios previstos:**

- formulario accesible de código postal;
- estados sin cotizar, consultando, cotizado, vencido y error;
- invalidación al cambiar CP o carrito;
- resumen con servicio, bultos, envío, total y vigencia;
- verificación del token contra los ítems antes de reservar;
- retiro de `CHECKOUT_TEST_SHIPPING_CENTS` del camino productivo.

**Pruebas:** componente/estado cliente, handler, integración con checkout y recorrido
manual local antes de cualquier preview.

**Finalización:** el comprador no puede llegar a Mercado Pago sin una tarifa real,
vigente y correspondiente exactamente a su carrito y destino.

**Punto de commit:** `feat: connect shipping quotes to checkout`

## INT-01D — Evidencia y activación controlada

**Cubre:** salida operativa de INT-01.

**Verificación:**

- suite completa, lint, TypeScript y build;
- contrato QA opt-in;
- caso un bulto, varios bultos, destino no cubierto, vencimiento y proveedor caído;
- inspección de logs redactados;
- checkout productivo todavía apagado hasta cargar todos los perfiles reales.

**Finalización:** evidencia guardada y checklist de variables para Vercel sin
valores secretos.

**Punto de commit:** `test: verify Correo Argentino checkout quoting`

## Orden y criterio de bloqueo

```text
INT-00A completado
  -> INT-01A perfiles/bultos e INT-01B0 núcleo interno (preparación local)
  -> respuesta y credenciales de Correo -> INT-00B contrato QA
  -> INT-01B cotización real
  -> INT-01C checkout
  -> INT-01D evidencia
```

INT-01A y el núcleo interno INT-01B0 pueden prepararse sin credenciales después
de aprobar el alcance de la spec, pero no se habilitan con datos ficticios.
INT-01B no conecta al proveedor hasta que INT-00B determine el contrato
ejecutable de la cuenta.
