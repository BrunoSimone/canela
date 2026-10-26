# Despacho, correos y apertura

Actualizado el 2026-10-26: presupuesto del worker y regresión FIN-120.
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

El workflow `.github/workflows/order-notifications.yml` solicita ese POST cada
cinco minutos desde `main`, y permite ejecución manual en GitHub Actions. El mismo
secreto vive en Vercel y en el repositorio. Una respuesta 503 marca el job fallido;
revisar las notificaciones de Actions y el panel. GitHub puede demorar ejecuciones,
por lo que no es un SLA de cinco minutos. Cada corrida actualiza
`background_job_health`; el preflight comprueba una corrida saludable reciente.
No poner el secreto en una URL ni en un cliente web. Desde FIN-120 el endpoint
procesa un aviso y una intención de reserva por llamada (hasta 12 avisos por hora
con un disparador de cinco minutos, además de los intentos inmediatos). Tiene un presupuesto
total de 25 s: cancela peticiones externas y cierra su pool SQL dedicado al
agotarlo; devuelve 503 sin registrar una corrida saludable. Un envío incierto
conserva su lease y clave de idempotencia. 429 se recupera con backoff.

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
   Configuración y comprobaciones HTTPS realizadas el 22/10/2026:
   [evidencia](../evidence/MP-produccion-2026-10-22.md). La aceptación con un pago
   real sigue pendiente.
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


## Cadencia del worker: hallazgo de aceptación del 23/10

Las ejecuciones programadas observadas fueron 00:46, 05:26, 10:19 y 15:11 UTC,
aunque el cron publicado es `3-58/5 * * * *`. La invocación manual
[39992011332](https://github.com/BrunoSimone/canela/actions/runs/39992011332)
terminó correctamente a las 17:04 UTC. El endpoint está operativo; el disparador
programado no está cumpliendo la frecuencia esperada. No ampliar el umbral del
preflight para ocultar la falta de actividad.

Antes de abrir ventas, conectar un scheduler con frecuencia comprobable al mismo
`POST https://www.canela-store.com/api/internal/notifications`. Configurar el
header privado `Authorization: Bearer <NOTIFICATION_WORKER_SECRET>` desde su
configuración privada, cada cinco minutos y sin secreto en la URL. Validar
varias ejecuciones consecutivas y alerta ante fallos/ausencias.
El endpoint y la idempotencia ya permiten más de un disparador. No se contrató
un servicio nuevo ni se cambió el plan de Vercel en esta iteración.

Opción evaluada, todavía sin configurar: cron-job.org, con método POST, cuerpo vacío y avisos de fallo,
recuperación y desactivación. Su límite documentado es **30 segundos**, mientras
la función tiene un máximo de 60: FIN-120 limita el trabajo a 25 segundos y prueba
la cancelación de una consulta SQL real de 60 segundos sin afectar otro pool.
No interpretar un timeout del disparador como garantía
de que el servidor no procesó trabajos; consultar `background_job_health` y los
IDs de Resend antes de reintentar. No desactivar GitHub hasta validar el reemplazo.
La cuenta y el almacenamiento del secreto en ese proveedor requieren intervención
del titular. [Límites y configuración de cron-job.org](https://cron-job.org/en/faq/).
[Limitaciones del scheduler de GitHub](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows).

Revisión del 26/10: su FAQ indica que **no valida certificados HTTPS**. No se ha
enviado el secreto. Confirmar una opción de validación efectiva antes de guardarlo,
o elegir un disparador que valide TLS. HTTPS por sí solo no acredita autenticidad
del servidor si el cliente ignora el certificado. La API pública revisada no
documenta ese ajuste. Una alerta de vencimiento no equivale a validar el certificado.

Los intentos inmediatos posteriores a webhook, retorno y despacho siguen
funcionando. Los retrasos afectan la recuperación periódica de avisos/intenciones,
por eso esta comprobación es un requisito operativo de apertura.

## Por qué existe este disparador y qué alternativas hay

El cron no es un requisito de Mercado Pago, Zipnova ni del funcionamiento básico
del checkout. Es una decisión para **recuperar trabajo pendiente sin depender de
visitas ni de que una persona esté mirando el panel**. FIN-02 exige comprobar
esa operación desatendida; cambiarla por supervisión manual requiere acordar y
documentar el cambio operativo, no declarar que el cron es técnicamente inevitable.

### Caso concreto que resuelve

1. El webhook confirma el pago y persiste en PostgreSQL el aviso al taller.
2. La app intenta enviarlo inmediatamente a Resend, después de responder al webhook.
3. Si Resend está temporalmente caído, el aviso queda pendiente con próximo intento.
4. Al terminar esa ejecución, almacenar una fecha no provoca otra llamada. Sin
   visitas, intervención manual o disparador durable, el aviso puede seguir pendiente.
5. El worker recoge lo que ya es elegible, intenta enviarlo y registra el resultado.

Next `after()` sirve para el intento inmediato y está sujeto a la duración máxima
de la función; no agenda por sí mismo una nueva ejecución futura durable.
[Referencia de Next.js](https://nextjs.org/docs/app/api-reference/functions/after).

El mismo endpoint libera intenciones de reserva vencidas **solo anteriores al
alta en MP**: `inventory_state=pending`, plazo vencido, `provider_order_id IS NULL`
y pago en `preference_pending`/`payment_pending`. No libera indiscriminadamente
carritos abandonados ni pagos de resultado incierto. Tampoco consulta seguimiento,
cobra pedidos ni genera etiquetas. Los enlaces de ingreso administrativo tienen
otro flujo y no forman parte de esta cola de avisos.

### Comparación de opciones

| Opción | Ventaja | Límite para Canela |
| --- | --- | --- |
| Reintento manual | Ya existe para avisos en el panel; un operador también puede invocar el worker autorizado | Requiere revisar e intervenir; no ofrece recuperación desatendida |
| Reintentar cuando alguien visita la app | Evita otra cuenta de proveedor | La recuperación depende del tráfico y puede demorarse indefinidamente |
| Confiar solo en `after()` | Primer intento rápido, ya implementado | Termina con la invocación; no reemplaza futuros intentos |
| Usar reintentos de MP | Ya disponibles para sus notificaciones fallidas | MP ya recibió 200 por un pago procesado; no recupera fallos posteriores de Resend ni avisos de despacho |
| Cron sobre la cola existente | Cambio pequeño: llama un endpoint; PostgreSQL conserva estado e idempotencia | Consultas periódicas aun sin trabajo y dependencia del disparador |
| Cola/workflow durable | Puede programar reintentos por evento y evitar consultas vacías | Requiere integrar, operar y probar otro mecanismo de entrega/confirmación; no eliminaría la necesidad de idempotencia |

Vercel ofrece cron nativo con frecuencia por minuto en Pro; Hobby solo permite
una vez al día. No se cambió el plan de la cuenta. Una vez diaria no cumple la
cadencia de recuperación seleccionada.
[Límites oficiales](https://vercel.com/docs/cron-jobs/usage-and-pricing).

### Costos y problemas que se deben operar

- Cada cinco minutos son 288 invocaciones por día: consumen función y consultas
  a PostgreSQL aunque no haya pendientes. Pueden impedir periodos de suspensión
  de la base; un disparador gratuito no vuelve gratuito todo ese consumo.
- Cinco minutos es la frecuencia solicitada, no una garantía de entrega del email.
  Se suman retrasos del proveedor, backoff y cola. El worker procesa un aviso por
  invocación: 12 por hora de recuperación, además de los intentos inmediatos.
- Caídas o desactivación del disparador requieren alertas y respuesta del operador.
  cron-job.org documenta desactivación tras más de 25 fallos consecutivos. El
  endpoint devuelve 503 si encuentra avisos en revisión/demorados: atender esos
  casos y comprobar que el job permanezca activo, sin esconder la señal con 200.
- Un timeout puede dejar un resultado incierto. Límite de 25 s, cancelación real,
  leases y claves de idempotencia reducen solapamientos y efectos repetidos; no
  prometen entrega exactamente una vez bajo cualquier fallo externo.
- El proveedor guardaría un secreto limitado a activar este worker. Nunca necesita
  claves de Mercado Pago/Resend ni acceso a la base. No ponerlo en URLs ni logs;
  usar un cliente que valide TLS y rotarlo si se expone.
- Los rechazos permanentes de correo requieren revisión humana. La aceptación
  por Resend tampoco garantiza bandeja de entrada o lectura.

Decisión vigente: conservar los intentos inmediatos y la cola persistente, y
verificar un disparador periódico seguro antes de declarar FIN-02 cerrado.
GitHub se mantiene hasta comprobar tres corridas programadas del reemplazo;
después conservar solo su ejecución manual de emergencia.
