# Integración de cotización Zipnova

Iteración local del 2026-10-13. Alcance: [spec 060](../specs/060-zipnova-cotizacion.md).

1. Reemplazar el núcleo experimental de tarifas por bulto por cotización conjunta
   y firma v3. Mantener el planificador y las pruebas controladas MP. ZIP-01/04.
2. Adaptador HTTP y configuración explícita, clasificación en Sanity, endpoint
   y cuota compartida. ZIP-01/02/03/08/09.
3. Revalidación previa al pago, persistencia atómica de snapshot e interfaz de
   selección/recotización. ZIP-04/05/06/07.
4. Tests unitarios e integración PostgreSQL local, lint, tipos, build y revisión
   visual. Documentar resultados y límites sin activar producción.

No crear envíos reales ni simular activación remota de sandbox con una flag local.

## Resultado

Los cuatro pasos están completados localmente. Ver
[evidencia ZIP-01](../evidence/ZIP-01.md): 277 pruebas de la suite general,
31 de PostgreSQL aislado y una consulta real de contrato del adaptador; lint,
tipos, build y revisión visual aprobados.

Soporte confirmó posteriormente la activación remota del sandbox el 2026-10-13.
Quedan fuera de esta iteración alta de envíos,
etiquetas y tracking, perfiles embalados reales, confirmación de clasificación y
modalidad logística. No se migró ni desplegó producción. La apertura sigue
condicionada a completar fulfillment y la validación de punta a punta.

El siguiente alcance se detalla en la
[actualización de sandbox](../research/004-zipnova-sandbox.md).
