# Panel de pedidos del dueño

## Probar las pantallas sin datos reales

En desarrollo local, definir `ADMIN_DEMO_MODE=1` y ejecutar `pnpm dev`. Abrir `/admin/ingresar` y usar «Ver bandeja de demostración», o abrir `/admin?demo=1` directamente. Las fixtures viven en el backend en `src/modules/admin/infrastructure/demo-orders.ts`. La API demo usa los mismos endpoints y formato que los pedidos reales. La opción se ignora en producción aunque la variable esté definida.

## Activar pedidos reales

1. Aplicar las migraciones con `pnpm db:migrate` usando la base de datos del entorno correspondiente. `0005` agrega acceso y auditoría del panel, `0006` guarda el domicilio del pedido y `0007` guarda la preparación de bultos con historial.
2. Configurar `DATABASE_URL` y `ADMIN_ALLOWED_EMAILS` como lista de emails separados por comas.
3. Crear una cuenta gratuita en [Resend](https://resend.com/), [verificar un dominio propio](https://resend.com/docs/add-a-domain) con los registros DNS que indique el panel y dejar desactivado el seguimiento de apertura y clics para los enlaces de acceso. Resend recomienda un subdominio para correo transaccional, por ejemplo `acceso.tudominio.com`. Crear una [API key](https://resend.com/docs/create-an-api-key) con permiso **Sending access**, restringida a ese dominio. Configurar `RESEND_API_KEY` y `ADMIN_EMAIL_FROM` con una dirección del dominio verificado, por ejemplo `Canela <ingreso@acceso.tudominio.com>`; `NEXT_PUBLIC_SITE_URL` debe apuntar al origen HTTPS público en producción. La clave se configura solamente en el servidor.
4. Abrir `/admin/ingresar`, solicitar el enlace con un email autorizado, abrirlo y pulsar «Entrar al panel». El enlace vence en 15 minutos, se consume una vez y la sesión dura 8 horas.

Sin estos valores el endpoint de solicitud responde indisponible y ningún pedido real queda accesible. El panel no acepta contraseñas ni tokens de desarrollo en producción. Los enlaces y las cookies de sesión se almacenan por hash en la base.

El panel usa `Referrer-Policy: no-referrer` para evitar que el token del enlace viaje como referencia. En formularios nativos el navegador puede enviar `Origin: null`; ingreso, cierre de sesión y preparación aceptan ese caso únicamente con `Sec-Fetch-Site: same-origin`. Un origen externo o la falta de ambas señales se rechazan con 403.

## Plantilla del correo de acceso

La plantilla vive en `src/emails/admin-login.tsx` y usa React Email. El mailer de Resend recibe de ella el asunto, HTML y texto plano; no mantiene una segunda copia del contenido. Para previsualizarla sin credenciales ni enviar correos, ejecutar `pnpm email:dev` y abrir `http://localhost:3004`. La URL mostrada en la vista previa contiene un token ficticio. No habilitar el seguimiento de clics en el dominio de Resend que envía enlaces de acceso.

## Datos y siguientes campos

`orders` y `order_item` aportan fecha, estado, email, productos e importes. Los pedidos nuevos guardan el snapshot de contacto y domicilio en `order_delivery`; los anteriores pueden no tenerlo. El TN llega solo cuando exista una integración real con Correo. Nunca completar un pedido cobrado con valores de ejemplo.

La ficha de un pedido pagado permite registrar el peso y las medidas exteriores de cada bulto, más una nota. Guardar crea una nueva versión auditable y exige la versión anterior para evitar sobrescrituras entre sesiones. La ficha de demostración no escribe datos. Crear el envío y registrar despacho esperan el contrato y credenciales de Correo. La spec funcional vive en `docs/specs/030-bandeja-pedidos.md`.
