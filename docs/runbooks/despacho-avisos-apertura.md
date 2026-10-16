# Despacho, correos y apertura

Actualizado el 2026-10-16: migraciones aplicadas y preparación de despliegue cerrado.
El estado verificado de publicación figura en [OPEN-01](../evidence/OPEN-01.md). Contrato:
[spec 080](../specs/080-despacho-avisos-apertura.md). Evidencia:
[OPS-01](../evidence/OPS-01.md).

## Preparar un entorno de prueba

1. Usar PostgreSQL independiente. Migraciones `0001` a `0012` necesarias. Antes de
   ejecutar `pnpm db:migrate`, comprobar **ambos** destinos `DATABASE_URL` y
   `DATABASE_URL_UNPOOLED`: el segundo tiene prioridad. No mezclar la base de
   desarrollo con pedidos, inventario o accesos productivos.
2. `PAYMENT_ENVIRONMENT=test`; `COMMERCE_PRODUCTION_APPROVED=0`.
   `CHECKOUT_MODE=test` solo para probar compras. `disabled` permite seguir
   verificando callbacks y trabajando pedidos ya pagados.
3. Zipnova: cuenta confirmada en sandbox, `SHIPPING_PROVIDER=zipnova`,
   `ZIPNOVA_ACCOUNT_MODE=sandbox`, `ZIPNOVA_FULFILLMENT_MODE=sandbox`,
   `ZIPNOVA_DISPATCH_TYPE=carrier_dropoff`, `ZIPNOVA_MAX_PARCELS=1`.
   La flag no cambia la cuenta remota. Ver [Zipnova](zipnova.md).
4. Reutilizar `RESEND_API_KEY`, agregar `ORDER_EMAIL_MODE=test`,
   `ORDER_EMAIL_FROM=Canela <pedidos@canela-store.com>` y
   `ORDER_EMAIL_TEST_TO` con el único destinatario autorizado para pruebas.
   Ambos templates se redirigen a ese correo y llevan `[PRUEBA]`. Configurar
   `NEXT_PUBLIC_SITE_URL` con el origen real del entorno: el enlace del dueño
   apunta al panel y requiere su sesión, nunca contiene un token de acceso.
   `ORDER_OWNER_EMAIL` se necesita recién en producción.
5. La migración no envía avisos históricos. Un nuevo pago verificado crea el aviso
   al taller; no lo crea un retorno de navegador ni un pago pendiente/rechazado.

## Operación del taller

1. Abrir pedido pagado y confirmar el embalaje real.
2. Consultar la tarifa del embalaje real, revisar el costo para Canela y aceptar
   antes de generar la etiqueta. La diferencia respecto del envío pagado queda a
   cargo del negocio; no cambia el total del comprador. Recuperar el envío o
   descargar la etiqueta privada según corresponda.
3. Entregar el paquete físicamente al transporte. En pruebas, omitir toda entrega.
4. Marcar la confirmación y pulsar «Registrar despacho» (en sandbox: «Simular
   despacho»). El registro contiene fecha/operador; doble clic no lo duplica.
5. Consultar seguimiento desde el proveedor. El aviso al comprador contiene URL
   HTTPS y TN si ya existe. El taller registra la entrega; no se afirma que el
   transporte haya confirmado recepción. No se sincroniza tránsito automáticamente.
6. En «Despacho y avisos», consultar ambos estados. «Aceptado por Resend» significa
   aceptación de API, no entrega en bandeja. La etiqueta continúa descargable.

## Recuperación de correos

El pago/despacho y su aviso se guardan en una transacción. Un fallo de Resend no
revierte la venta ni pierde la intención de avisar.

- `pending`: espera primer envío o backoff (60 s, 120 s… hasta 1 h).
- `sending`: otro worker tiene un lease de 60 s; no reenviar por fuera del sistema.
- `sent`: Resend aceptó; conserva su ID, no vuelve a reclamar el aviso.
- `review`: revisar causa, entorno y registro del proveedor; no tiene reintento
  automático. No borrar ni cambiar a pending para forzar un nuevo correo.

El primer POST congela remitente, destinatario y contenido. Reintentos conservan
la clave `canela-notice/<UUID>`. Resend documenta 24 h de idempotencia; el sistema
corta a las 23 h. Un resultado incierto más antiguo requiere revisión para evitar
un duplicado. Una corrección de destinatario/remitente también requiere revisión.
No hay endpoint para resetear estos controles. [Contrato de Resend](https://resend.com/docs/dashboard/emails/idempotency-keys).

Tres mecanismos disponibles:

1. Intento acotado con `after()` después del webhook/reconciliación/despacho.
2. Botón «Consultar y reintentar avisos pendientes» o
   `pnpm notifications:process` (hasta 5 avisos, lee `.env.local`). La CLI también
   puede ejecutarse con variables del proceso y `pnpm exec tsx scripts/process-notifications.ts`.
3. `POST /api/internal/notifications`, con `Authorization: Bearer <secreto>` y
   `NOTIFICATION_WORKER_SECRET` de al menos 32 caracteres. Devuelve cantidades de trabajos procesados, en revisión y demorados más de una
   hora. Responde 503 si hay avisos que requieren atención. Sigue disponible durante
   mantenimiento y autentica antes de procesar.

El workflow `.github/workflows/order-notifications.yml` ejecuta ese POST cada
cinco minutos desde `main`, y permite ejecución manual en GitHub Actions. El mismo
secreto vive en Vercel y en el repositorio. Una respuesta 503 marca el job fallido;
revisar las notificaciones de Actions y el panel. GitHub puede demorar ejecuciones,
por lo que no es un SLA de cinco minutos. Cada corrida actualiza
`background_job_health`; el preflight comprueba una corrida saludable reciente.
No poner el secreto en una URL ni en un cliente web. El endpoint procesa como
máximo 5 avisos por llamada. El límite es acotado; 429 se recupera con backoff.

## Preflight y futura apertura

`pnpm commerce:preflight` es solo lectura: informa coherencia de flags, callbacks,
correo, gate de envíos, checksums de migraciones, avisos en revisión, actividad
reciente del worker, cajas activas e inventario ofrecido con perfiles completos. No imprime
valores secretos ni habilita nada. Puede terminar con código 1 en un entorno
intencionalmente cerrado. No certifica contratos comerciales ni cobertura.

Secuencia para abrir ventas (el despliegue cerrado no habilita cobros):

1. Resolver embalajes/clasificaciones/stock, logística de sucursal, frágiles,
   plazos y correo del dueño; completar aceptación de compra externa integral.
2. Coordinar con Zipnova la salida del modo de pruebas; no hacerlo mientras el
   desarrollo siga usando la misma cuenta. Una cuenta comparte modo remoto:
   no basta con cambiar una variable local para aislar entornos.
3. Backup de base; verificar destino y aplicar migraciones aditivas antes del
   código nuevo. Mantener `SITE_MAINTENANCE_MODE=1` y `CHECKOUT_MODE=disabled`.
4. Configurar `PAYMENT_ENVIRONMENT=production` y los cuatro secretos/identidades
   `MP_PRODUCTION_*`, webhook live correcto, HTTPS y secretos privados. No existe
   fallback a `MP_TEST_*`. Verificar el webhook por separado antes de abrir ventas.
5. Zipnova operativo/dropoff/un bulto; `ZIPNOVA_FULFILLMENT_MODE=production`.
   Emails con `ORDER_EMAIL_MODE=production`, remitente verificado, correo del dueño
   y worker programado. Los avisos de prueba siguen aislados por entorno persistido.
6. Con aprobación comercial explícita, `COMMERCE_PRODUCTION_APPROVED=1`; revisar
   preflight y pruebas de aceptación; recién entonces activar `CHECKOUT_MODE=production`
   y quitar mantenimiento. La flag representa aprobación humana, no la reemplaza.

Pausa: volver `CHECKOUT_MODE=disabled` y `SITE_MAINTENANCE_MODE=1`.
**Conservar** `PAYMENT_ENVIRONMENT`, credenciales y webhook del entorno para pagos
ya iniciados. Si se desea seguir procesando pedidos pagados, mantener sus gates de
fulfillment/correos; no bajar la aprobación global por una simple pausa de ventas.
No borrar colas ni revertir tablas para pausar. Reversión de código solo tras revisar
compatibilidad con el esquema; las migraciones son aditivas, no destructivas.
