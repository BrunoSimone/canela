# Mercado Pago — Credenciales y webhook productivos

22/10/2026. Alcance: configurar la cuenta real y publicar esa configuración con
la tienda cerrada. Referencias: [spec de pagos](../specs/020-mercado-pago-checkout-pro.md),
[apertura](../specs/080-despacho-avisos-apertura.md) e
[inventario vigente en Sanity](../specs/100-inventario-sanity.md).

## Configuración completada

- Aplicación `Canela Store - Produccion`, ID `1240910919769951`, Checkout Pro
  mediante Orders API. Cuenta vendedora de Mariela, ID `354681968`.
- Credenciales productivas activadas desde el panel de Mercado Pago con la
  autorización del usuario y las verificaciones de identidad de Mercado Pago
  completadas durante la sesión.
- Consulta autenticada y de solo lectura a `/users/me`: identidad coincidente
  con el vendedor esperado y cuenta sin indicador de usuario de prueba.
- Webhook productivo guardado en
  `https://www.canela-store.com/api/webhooks/mercado-pago`, evento
  **Order (Mercado Pago)**. Clave de firma generada por Mercado Pago.
- Los cuatro valores `MP_PRODUCTION_*` están configurados en Vercel Production
  y en `.env.local`, sin copiar secretos a esta evidencia ni al repositorio.
- `PAYMENT_ENVIRONMENT=production` en Vercel; el entorno local conserva `test`.
- Gates conservados: `SITE_MAINTENANCE_MODE=1`, `CHECKOUT_MODE=disabled` y
  `COMMERCE_PRODUCTION_APPROVED=0`.

## Despliegue

Se reconstruyó el despliegue productivo existente
`dpl_GFmDeZi4sPeAP3K4diPhcHx6iB4B` con las variables actualizadas, sin cambios de
código de aplicación ni migraciones. Nuevo despliegue:
`dpl_Ao5VagsLa1NWZ6tEu2QNnyf6WQ89`, estado **Ready** y alias
`https://www.canela-store.com` confirmado.

## Verificación

26 pruebas aprobadas en cuatro suites: configuración del webhook, firma,
handler HTTP y configuración/gates del checkout. No se ejecutaron pruebas de
contrato que creen orders reales.

Comprobaciones HTTPS sobre el dominio productivo, completadas el
23/10/2026 a las 00:50:43 UTC (22/10, 21:50 de Argentina):

| Comprobación | Resultado |
| --- | --- |
| Portada | 503, mantenimiento |
| POST `/api/checkout` | 503, `SITE_MAINTENANCE` |
| `/admin/ingresar` | 200 |
| `/admin` sin sesión | 307, acceso protegido |
| Webhook con query válida pero sin firma | 401, `INVALID_SIGNATURE` |
| Webhook con firma válida y cuerpo deliberadamente inválido | 400, `INVALID_WEBHOOK` |

La última prueba comprueba que el secreto desplegado coincide con el generado
en Mercado Pago: supera la autenticación y se rechaza antes de confirmar pagos o
escribir pedidos. No se creó ningún pedido, cobro o envío. La captura privada del
panel, sin secretos visibles, está en `tmp/mp-setup/webhook-productivo.jpg`.

## Límites y próximos pasos

Esta evidencia verifica activación, autenticación, configuración y protección del
receptor; no demuestra todavía la entrega de un evento de una compra real desde
Mercado Pago ni el circuito completo pago → stock → envío → correos.

Antes de abrir ventas siguen pendientes la carga física de stock/medidas/cajas,
la coordinación de la salida del sandbox de Zipnova y la aceptación integral de
una compra controlada. La habilitación de ventas requiere aprobación comercial
explícita según el [runbook de apertura](../runbooks/despacho-avisos-apertura.md).

La tienda permanece cerrada. Para una pausa posterior de ventas se conservan las
credenciales y `PAYMENT_ENVIRONMENT` de los pagos ya iniciados; no se cambia a
credenciales de prueba como mecanismo de pausa.
