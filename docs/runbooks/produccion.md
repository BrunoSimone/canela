# Producción de Canela

## Estado vigente — 23 de octubre de 2026

La tienda permanece en mantenimiento y con checkout deshabilitado. Sanity es la
única fuente de catálogo y cantidades; el panel administra pedidos, embalaje,
etiquetas y despacho. La implementación incluye Resend y los templates React
Email de acceso, compra pagada y despacho. El envío de avisos comerciales depende
de sus gates de producción.

Migraciones `0001` a `0013` aplicadas. El dueño y el desarrollador tienen el acceso
configurado; no se publican sus datos ni credenciales en este runbook.
El Studio publicado permite cargar cantidades, unidades protegidas y cajas.
**Nunca usar cantidades o medidas de los fixtures como valores reales.**

La aceptación sandbox de pago, descuento de stock, etiqueta y despacho está en
[la evidencia del 23/10](../evidence/ACEPTACION-sandbox-2026-10-23.md). El webhook
automático reintentado ya tiene entrega 200. La revisión completa de tienda/panel,
regresión y publicación cerrada se registra en [UX-110](../evidence/UX-110.md).

El worker está configurado en GitHub Actions cada cinco minutos. Se observaron
retrasos de varias horas el 23/10; no dar esa frecuencia por garantizada. La
invocación manual comprobó que el endpoint funciona. Ver el runbook de
[despacho, avisos y apertura](despacho-avisos-apertura.md) para recuperación y
requisitos de un disparador externo fiable antes de abrir ventas.

Guía del cliente: [carga en Sanity](carga-cliente.md). Configuración de cobros
productivos: [MP producción](../evidence/MP-produccion-2026-10-22.md). La compra
con dinero real sigue pendiente y necesita su propia autorización.

## Registro histórico de recuperación — 10/10/2026

Lo que sigue conserva el diagnóstico y la recuperación de esa fecha. Las
referencias a inventario SQL, correos no implementados y migraciones `0001–0007`
son históricas: no describen el estado vigente anterior.

## Entornos

- Sitio: `https://www.canela-store.com`.
- Proyecto de Vercel: `brunosimones-projects/canela`.
- Proyecto de Neon: `canela-store`, región São Paulo.
- La rama `production` corresponde al sitio público. La rama `development` contiene pedidos y stock de prueba; no se debe conectar a producción ni copiar sus datos comerciales.

## Diagnóstico inicial del 10 de octubre de 2026

El despliegue público del commit `7c0fb57` responde HTTP 500. Los logs de Vercel muestran `DATABASE_URL is required for server-side database access`. La portada consulta inventario en PostgreSQL para filtrar productos disponibles.

Vercel tiene configurados el secreto de revalidación de Sanity, la URL pública y una variable antigua de WhatsApp. Faltan la conexión a PostgreSQL y las variables de acceso por email. Neon tiene una rama `production`, pero una consulta a `pg_catalog.pg_tables` confirmó que su esquema `public` todavía no contiene tablas.

### Recuperación verificada

Se publicó el commit `a89a87c` en el despliegue
`BfXCyiKi67xsF8XnT5VN7bNaxF48`, con la conexión de Neon `production`, las siete
migraciones aplicadas y las variables de Resend y administración configuradas.
Se eliminó la variable de WhatsApp. La base de producción comenzó con cero
pedidos y cero registros de inventario; no se copiaron datos comerciales de
desarrollo.

La portada respondió 200. Se verificó el flujo completo de acceso administrativo:
entrega del email, enlace HTTPS, confirmación, panel, cierre de sesión y rechazo
al reutilizar el enlace. Sin sesión, la API de pedidos respondió 401.
`CHECKOUT_MODE=disabled` bloqueó la creación de preferencias y pedidos;
`ADMIN_DEMO_MODE=0` impidió mostrar fixtures en producción.

El catálogo y el carrito están publicados, pero la apertura comercial sigue
pendiente de inventario real, logística y pagos. Resend envía el enlace de acceso
al panel; todavía no hay emails transaccionales de pedidos o envíos.

## Configuración del despliegue

### Mantenimiento de la tienda

En Vercel → Canela → Environment Variables → **Production**, establecer
`SITE_MAINTENANCE_MODE=1` y redesplegar para pausar la tienda. Los visitantes
reciben la pantalla de mantenimiento y las APIs públicas responden `503`.
El panel sigue en `https://www.canela-store.com/admin/ingresar`, con el mismo
acceso por correo. Los callbacks de Mercado Pago y Sanity mantienen sus propias
validaciones. No hay acceso alternativo al catálogo durante la pausa.

Para volver a mostrar la tienda, cambiar la flag a `0` y redesplegar. Esto no
habilita cobros: `CHECKOUT_MODE=disabled` permanece independiente. En local la
flag se deja en `0` o ausente; se puede probar con
`SITE_MAINTENANCE_MODE=1 pnpm dev`.

Configurar estas variables exclusivamente en el entorno **Production** del proyecto de Vercel:

| Variable | Valor o fuente |
| --- | --- |
| `DATABASE_URL` | Conexión con pooling de la rama `production` de Neon. Secreto de servidor. |
| `RESEND_API_KEY` | Clave existente con permiso de envío para el dominio verificado. Secreto de servidor. |
| `ADMIN_EMAIL_FROM` | `Canela <ingreso@canela-store.com>` |
| `ADMIN_ALLOWED_EMAILS` | Correo autorizado para la prueba; agregar el del dueño cuando lo confirme. |
| `NEXT_PUBLIC_SITE_URL` | `https://www.canela-store.com` (ya configurada). |
| `CHECKOUT_MODE` | `disabled` hasta completar cotización y habilitación de pagos reales. |
| `ADMIN_DEMO_MODE` | `0`; el código también impide usar fixtures en producción. |
| `SITE_MAINTENANCE_MODE` | `1` mientras se prepara la apertura de la tienda pública; `0` para mostrarla. |

No publicar credenciales en Git, logs ni capturas. No importar `.env.local` completo: contiene configuración de desarrollo y pruebas de Mercado Pago. La conexión sin pooling se usa solo para ejecutar migraciones desde un entorno seguro; no hace falta guardarla en Vercel.

## Secuencia de recuperación

1. Confirmar la rama `production` al obtener ambas conexiones de Neon.
2. Ejecutar `pnpm db:migrate` con `DATABASE_URL_UNPOOLED` de esa rama. El runner aplica las migraciones `0001` a `0007` en una transacción y valida sus checksums en ejecuciones posteriores.
3. Configurar las variables de producción de la tabla anterior y publicar la revisión verificada que incluye el panel, Resend y la corrección del POST de acceso.
4. Verificar respuesta HTTP 200 en la portada, carga de imágenes, acceso a `/admin/ingresar` y redirección de usuarios sin sesión. `/api/admin/orders` debe rechazar solicitudes sin sesión.
5. Solicitar un enlace con el correo autorizado. Confirmar entrega, URL HTTPS del sitio, acceso único, sesión y cierre de sesión.
6. Comprobar que el checkout continúa deshabilitado y revisar los logs del nuevo despliegue.
7. Eliminar `NEXT_PUBLIC_WHATSAPP_NUMBER` de Vercel una vez publicado el código que ya no la utiliza.

La base comienza sin pedidos ni inventario. El catálogo oculta los productos de venta directa sin stock registrado, de acuerdo con la spec. La carga de cantidades reales debe acordarse con el dueño; las cantidades de desarrollo no son una fuente válida.

## Verificación local previa

El 10 de octubre de 2026, sobre la revisión local preparada para publicar:

- `pnpm test`: 204 pruebas aprobadas; las suites que requieren servicios externos se ejecutan por separado.
- `pnpm test:db`: 28 pruebas aprobadas en PostgreSQL 17 temporal y aislado. Incluyen migraciones desde una base vacía, reservas, confirmación de pagos, enlaces de acceso y preparación de pedidos. El contenedor se eliminó al finalizar.
- `pnpm lint`: aprobado.
- `NEXT_PUBLIC_SITE_URL=https://www.canela-store.com CHECKOUT_MODE=disabled pnpm build`: aprobado, incluida la validación de TypeScript. Esta compilación utilizó el entorno local; no verifica las variables ausentes de Vercel.

## Reversión

Conservar el identificador de la revisión y despliegue publicados. Las migraciones agregan tablas, columnas e índices y son compatibles con el código previo; no borrar datos para revertir una publicación. Antes de promover un despliegue anterior, comprobar que contiene una configuración válida de `DATABASE_URL`: el despliegue público diagnosticado fallaba precisamente por esa ausencia.

## Verificación del modo de mantenimiento

- 35 pruebas focalizadas aprobadas: intercepción de rutas, APIs públicas, excepciones de administración, autenticación y configuración del checkout.
- Lint y build de producción aprobados con `SITE_MAINTENANCE_MODE=1`.
- Dos servidores locales de producción verificaron la flag activa e inactiva: páginas y APIs públicas en 503 durante la pausa, login 200, API administrativa sin sesión 401, assets disponibles y solicitudes RSC bloqueadas. Al desactivar la flag, volvió la portada 200 y el checkout siguió deshabilitado.
- Pantalla revisada en escritorio y móvil de 390 px.
- Para esta verificación local, usar `--hostname localhost` y URLs `http://localhost:<puerto>`: Next.js normaliza el host de las reescrituras locales y mezclarlo con un servidor ligado únicamente a `127.0.0.1` provoca una conexión interna fallida.
