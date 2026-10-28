# OPS-147 — Preparar producción manteniendo la tienda cerrada

Fecha: 2026-10-27. Rama: `codex/creador-cuadros-personalizados`.

## Decisión

Bruno autoriza configurar cobros y logística productivos manteniendo
`SITE_MAINTENANCE_MODE=1`. La apertura pública queda separada de la preparación
técnica y depende de la carga/confirmación de Mariela.

Bruno envió personalmente la solicitud de regreso a producción a Zipnova.
Enzo confirmó el cambio el 27/10/2026. Tras renovar la sesión se comprobó que
el aviso de pruebas desapareció. Bruno autorizó anular los dos envíos sandbox
identificados; el saldo pasó de -ARS 24.659,99 a ARS 0,00, sin cargos ni facturas.
La variable `ZIPNOVA_ACCOUNT_MODE` registra el modo remoto: no lo cambia.
No configurar `operational` hasta recibir confirmación o comprobar el cambio
en la cuenta. No generar pagos ni transportes reales para probar esta preparación.

## Criterios

1. Con cobros y logística productivos configurados, mantenimiento intercepta
   páginas y APIs de catálogo, checkout y cuadros antes de ejecutar sus handlers.
2. Administración y callbacks conservan su autenticación/validación habitual.
   Mantenimiento no es una barrera contra acciones autorizadas del administrador.
3. No se mezclan credenciales MP de pruebas con entorno productivo ni se declara
   operativa una cuenta de Zipnova que todavía muestra Modo de Pruebas.
4. Las variables finales se aplican juntas tras confirmar el modo remoto:
   `CHECKOUT_MODE=production`, `PAYMENT_ENVIRONMENT=production`,
   `COMMERCE_PRODUCTION_APPROVED=1`, `ZIPNOVA_ACCOUNT_MODE=operational`,
   `ZIPNOVA_FULFILLMENT_MODE=production`, `ORDER_EMAIL_MODE=production` y
   `SITE_MAINTENANCE_MODE=1`. Se conservan origen, despacho en sucursal y un bulto.
5. Verificar HTTP 503 en rutas públicas y de compra, 200 en ingreso administrativo
   y rechazo de API administrativa/webhook sin credenciales tras el despliegue.
6. El trabajo de cuadros de PER-146 conserva por ahora su bloqueo explícito.
   La autorización de esta spec no demuestra que ese recorrido haya sido
   aceptado con proveedores externos ni transforma fixtures en datos confirmados.
7. Redesplegar la revisión que ya está en producción con las nuevas variables;
   no publicar la rama del creador como consecuencia de una activación operativa.
8. La cuenta remota ya no sirve para altas sandbox. En `.env.local`, reflejar
   `ZIPNOVA_ACCOUNT_MODE=operational` y `ZIPNOVA_FULFILLMENT_MODE=disabled` para
   impedir altas accidentales durante pruebas locales. No ejecutar el contrato
   opt-in de creación hasta disponer de otra cuenta sandbox confirmada.

## Verificación

- `src/proxy.test.ts`: rutas públicas y APIs con configuración productiva completa.
- `production-config.test.ts`: incompatibilidades de MP/Zipnova y gates de operación.
- Evidencia HTTPS y estado remoto de Zipnova en `docs/evidence/OPS-147.md`.

## Reversión

Conservar mantenimiento activo. Si falla la preparación, dejar `CHECKOUT_MODE`
y `ZIPNOVA_FULFILLMENT_MODE` deshabilitados. No cambiar credenciales de callbacks
de pagos iniciados. No revertir el modo remoto de Zipnova sin coordinarlo con soporte.

## Continuidad

PER-148 autoriza completar y desplegar la rama del creador bajo el mismo
mantenimiento. La configuración del taller queda pendiente de publicación,
sin confirmar precios ni medidas por Mariela.
