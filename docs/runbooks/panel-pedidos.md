# Panel de pedidos del dueño

## Probar las pantallas sin datos reales

En desarrollo local, definir `ADMIN_DEMO_MODE=1` y ejecutar `pnpm dev`. Abrir `/admin/ingresar` y usar «Ver bandeja de demostración», o abrir `/admin?demo=1` directamente. Las fixtures viven en el backend en `src/modules/admin/infrastructure/demo-orders.ts`. La API demo usa los mismos endpoints y formato que los pedidos reales. La opción se ignora en producción aunque la variable esté definida.

## Activar pedidos reales

1. Aplicar las migraciones con `pnpm db:migrate` usando la base de datos del entorno correspondiente. `0005` agrega acceso y auditoría del panel, `0006` guarda el domicilio del pedido, `0007` guarda la preparación de bultos con historial, `0008` la cotización `0009` el envío/etiqueta y `0010` el entorno, despacho y cola de avisos. Las migraciones hasta `0013` están aplicadas en producción; el despliegue permanece cerrado. Probar cualquier migración nueva en una base independiente.
2. Configurar `DATABASE_URL` y `ADMIN_ALLOWED_EMAILS` como lista de emails separados por comas.
3. Crear una cuenta gratuita en [Resend](https://resend.com/), [verificar un dominio propio](https://resend.com/docs/add-a-domain) con los registros DNS que indique el panel y dejar desactivado el seguimiento de apertura y clics para los enlaces de acceso. Resend recomienda un subdominio para correo transaccional, por ejemplo `acceso.tudominio.com`. Crear una [API key](https://resend.com/docs/create-an-api-key) con permiso **Sending access**, restringida a ese dominio. Configurar `RESEND_API_KEY` y `ADMIN_EMAIL_FROM` con una dirección del dominio verificado, por ejemplo `Canela <ingreso@acceso.tudominio.com>`; `NEXT_PUBLIC_SITE_URL` debe apuntar al origen HTTPS público en producción. La clave se configura solamente en el servidor.
4. Abrir `/admin/ingresar`, solicitar el enlace con un email autorizado, abrirlo y pulsar «Entrar al panel». El enlace vence en 15 minutos, se consume una vez y la sesión dura 8 horas.

Sin estos valores el endpoint de solicitud responde indisponible y ningún pedido real queda accesible. El panel no acepta contraseñas ni tokens de desarrollo en producción. Los enlaces y las cookies de sesión se almacenan por hash en la base.

El panel usa `Referrer-Policy: no-referrer` para evitar que el token del enlace viaje como referencia. En formularios nativos el navegador puede enviar `Origin: null`; ingreso, cierre de sesión y preparación aceptan ese caso únicamente con `Sec-Fetch-Site: same-origin`. Un origen externo o la falta de ambas señales se rechazan con 403.

## Plantilla del correo de acceso

La plantilla vive en `src/emails/admin-login.tsx` y usa React Email. El mailer de Resend recibe de ella el asunto, HTML y texto plano; no mantiene una segunda copia del contenido. Para previsualizarla sin credenciales ni enviar correos, ejecutar `pnpm email:dev` y abrir `http://localhost:3004`. La URL mostrada en la vista previa contiene un token ficticio. No habilitar el seguimiento de clics en el dominio de Resend que envía enlaces de acceso.

## Datos y siguientes campos

`orders` y `order_item` aportan fecha, estado, email, productos e importes. Los pedidos nuevos guardan el snapshot de contacto y domicilio en `order_delivery`; los anteriores pueden no tenerlo. El número y enlace de seguimiento llegan de Zipnova cuando estén disponibles. Nunca completar un pedido cobrado con valores de ejemplo.

La ficha de un pedido pagado permite registrar el peso y las medidas exteriores de cada bulto, más una nota. Guardar crea una nueva versión auditable y exige la versión anterior para evitar sobrescrituras entre sesiones. La ficha de demostración no escribe datos. El alta y etiqueta de Zipnova sandbox se habilitan de forma explícita según el [runbook de Zipnova](zipnova.md); el dueño confirma el embalaje antes del alta y desde entonces no puede editarlo. La etiqueta no indica despacho. Specs: [panel](../specs/030-bandeja-pedidos.md) y [alta/etiqueta](../specs/070-zipnova-alta-etiqueta.md).

## Despacho y avisos

La ficha permite confirmar la entrega al transporte cuando hay pago y etiqueta.
En sandbox la acción se llama «Simular despacho». Se guardan operador y fecha;
los avisos de compra y despacho tienen estado visible y reintento controlado.
El número de seguimiento también puede buscarse desde la bandeja. Ver el
[runbook de operación y recuperación](despacho-avisos-apertura.md).


## Navegación y recuperación (23/10/2026)

- Catálogo, stock, pesos, medidas y cajas se gestionan en **Sanity**. El enlace
  «Catálogo y stock» abre el Studio; `/admin/inventario` conserva una redirección
  compatible. No hay dos lugares para editar cantidades.
- Cada fila ofrece «Abrir» además de la vista previa. Funciona en móvil sin tener
  que buscar el botón al final del resumen. Buscar por ID, comprador o producto;
  el botón «Actualizar pedidos» repite la consulta conservando el filtro.
- Si falla la consulta, usar «Reintentar». Si venció la sesión, volver a ingresar
  con el enlace de correo. Un error de conexión no elimina el pedido.
- La ficha ordena las acciones: próximo paso, caja cotizada, preparación real,
  cotización/aceptación del costo, etiqueta, despacho y avisos. Cambiar la versión
  de preparación invalida cualquier aceptación de tarifa que estuviera en pantalla.
- El enlace de seguimiento se muestra aunque el transporte todavía no informe
  un número. La etiqueta no acredita entrega física al transporte.
