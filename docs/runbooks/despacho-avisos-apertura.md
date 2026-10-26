# Despacho, correos y apertura

Actualizado el 2026-10-26: recuperación manual sin cron, [spec 121](../specs/121-recuperacion-manual-sin-cron.md).
El estado verificado de publicación figura en [OPEN-01](../evidence/OPEN-01.md). Contrato:
[spec 080](../specs/080-despacho-avisos-apertura.md). Evidencia:
[OPS-01](../evidence/OPS-01.md).

## Preparar un entorno de prueba

Para probar sin cargar datos ficticios en el catálogo real, configurar
`NEXT_PUBLIC_SANITY_DATASET=inventory_test` y
`SANITY_INVENTORY_DATASET=inventory_test`. Productos, perfiles, cajas y stock de
prueba deben existir en ese dataset. El Studio publicado del cliente conserva
`production`; un Studio local de QA puede usar `SANITY_STUDIO_DATASET=inventory_test`.
Ver [preparación del 23/10/2026](../evidence/ACEPTACION-sandbox-2026-10-23.md).

1. Usar PostgreSQL independiente. Migraciones `0001` a `0013` necesarias. Antes de
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
5. Para probar callbacks por túnel HTTPS, configurar el origen en
   `NEXT_PUBLIC_SITE_URL` y su hostname exacto en `CANELA_DEV_HOST` (solo desarrollo).
   Actualizar las URLs de ambos modos en la aplicación del vendedor de prueba de
   Mercado Pago; revisar las entregas bajo el filtro **Prueba**. La evidencia
   histórica de modo productivo solo no garantiza el destino de una compra actual.
   Conservar los secretos y comprobar la firma recibida antes de cambiar credenciales.
6. La migración no envía avisos históricos. Un nuevo pago verificado crea el aviso
   al taller. El retorno puede disparar una consulta autoritativa a MP; sus
   parámetros por sí solos no confirman un pago ni crean avisos.

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

El workflow `.github/workflows/order-notifications.yml` se ejecuta **solo a pedido**
en GitHub Actions. Ya no tiene `schedule`. El mismo secreto vive en Vercel y en el
repositorio. Cada ejecución registra `background_job_health` como historial, sin
exigir que exista una corrida reciente. No poner el secreto en una URL ni en un
cliente web. El endpoint procesa un aviso y una intención de reserva por llamada.
Informa `processed`, `review`, `overdue` y `expiredReservations`; devuelve 503 si
quedan casos en revisión, avisos de más de una hora o intenciones vencidas. La CLI
`notifications:process` procesa solo correos; usar el workflow/endpoint para reservas.
Tiene un presupuesto total de 25 s: cancela peticiones externas y cierra su pool SQL dedicado al
agotarlo; devuelve 503 sin registrar una corrida saludable. Un envío incierto
conserva su lease y clave de idempotencia. 429 se recupera con backoff.

## Preflight y futura apertura

`pnpm commerce:preflight` es solo lectura: informa coherencia de flags, callbacks,
correo, gate de envíos, checksums de migraciones, avisos en revisión, avisos demorados, reservas previas al pago vencidas, cajas activas e inventario ofrecido con perfiles completos. No imprime
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
   Configuración y comprobaciones HTTPS realizadas el 22/10/2026:
   [evidencia](../evidence/MP-produccion-2026-10-22.md). La aceptación con un pago
   real sigue pendiente.
5. Zipnova operativo/dropoff/un bulto; `ZIPNOVA_FULFILLMENT_MODE=production`.
   Emails con `ORDER_EMAIL_MODE=production`, remitente verificado, correo del dueño
   y procedimiento de revisión manual de pedidos/avisos. Los avisos de prueba siguen aislados por entorno persistido.
6. Con aprobación comercial explícita, `COMMERCE_PRODUCTION_APPROVED=1`; revisar
   preflight y pruebas de aceptación; recién entonces activar `CHECKOUT_MODE=production`
   y quitar mantenimiento. La flag representa aprobación humana, no la reemplaza.

Pausa: volver `CHECKOUT_MODE=disabled` y `SITE_MAINTENANCE_MODE=1`.
**Conservar** `PAYMENT_ENVIRONMENT`, credenciales y webhook del entorno para pagos
ya iniciados. Si se desea seguir procesando pedidos pagados, mantener sus gates de
fulfillment/correos; no bajar la aprobación global por una simple pausa de ventas.
No borrar colas ni revertir tablas para pausar. Reversión de código solo tras revisar
compatibilidad con el esquema; las migraciones son aditivas, no destructivas.


## Supervisión y recuperación manual

Decisión de Bruno del 26/10: no usar cron ni contratar un disparador externo.
Los intentos inmediatos y los reintentos de webhooks de Mercado Pago siguen
activos. El cambio retira la recuperación periódica; no quita persistencia,
idempotencia ni botones manuales.

### Taller

1. Consultar la bandeja de pedidos habitualmente durante la operación; no depender
   solo del aviso por email para enterarse de una compra. Un fallo del email no
   genera una segunda alerta independiente.
2. Al abrir un pedido, revisar «Despacho y avisos». Si está pendiente, usar
   «Consultar y reintentar avisos pendientes» cuando corresponda. El botón respeta
   tiempos de espera, exclusividad e idempotencia; no fuerza un duplicado.
3. Si aparece «Revisión», pedir asistencia técnica. No enviar otra copia ni cambiar
   estados de base para saltar la protección de resultados inciertos.
4. Si aparece stock reservado sin una compra resuelta, solicitar revisión técnica.
   No ajustar cantidades manualmente para compensar reservas del sistema.

### Operador técnico

1. En GitHub → Actions → **Recuperación manual de avisos y reservas** → Run workflow,
   ejecutar sobre `main`. El secreto ya configurado se envía como header privado.
2. Revisar los conteos devueltos. Una corrida atiende como máximo un aviso y una
   intención vencida. Si hay más trabajo elegible, ejecutar otra vez; respetar el
   backoff del correo y revisar los casos permanentes. Un 200 no significa que todo
   correo reciente esté enviado: `overdue` cuenta solo los de más de una hora.
3. Para intenciones de reserva, el recuperador solo libera las vencidas con
   `inventory_state=pending`, sin orden remota MP y con intento previo al pago.
   No expira reservas listas ni pagos existentes o inciertos por antigüedad.
4. Si hay 503 por fallo técnico, revisar logs/configuración. Si hay casos en
   `review`, comprobar el resultado en Resend y resolver la causa antes de cualquier
   envío adicional. Después de 23 h desde un primer intento incierto, el sistema
   exige revisión para evitar duplicados fuera de la ventana de idempotencia.
5. Antes de apertura, `commerce:preflight` consulta pendientes reales y bloquea
   por revisión, avisos demorados o intenciones vencidas. No requiere actividad
   periódica ni transforma un historial antiguo en un fallo actual.

Sin intervención humana ni nuevos eventos no se promete detección ni reintento.
No hay alertas externas nuevas ni procesamiento por abrir una pantalla. El alcance
puede revisarse cuando exista volumen real que justifique automatizar la operación.
La evaluación anterior del scheduler queda como antecedente en FIN-120; no es un
bloqueo de apertura ni requiere crear/iniciar sesión en cron-job.org.
