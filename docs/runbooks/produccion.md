# Producción de Canela

## Entornos

- Sitio: `https://www.canela-store.com`.
- Proyecto de Vercel: `brunosimones-projects/canela`.
- Proyecto de Neon: `canela-store`, región São Paulo.
- La rama `production` corresponde al sitio público. La rama `development` contiene pedidos y stock de prueba; no se debe conectar a producción ni copiar sus datos comerciales.

## Diagnóstico del 10 de octubre de 2026

El despliegue público del commit `7c0fb57` responde HTTP 500. Los logs de Vercel muestran `DATABASE_URL is required for server-side database access`. La portada consulta inventario en PostgreSQL para filtrar productos disponibles.

Vercel tiene configurados el secreto de revalidación de Sanity, la URL pública y una variable antigua de WhatsApp. Faltan la conexión a PostgreSQL y las variables de acceso por email. Neon tiene una rama `production`, pero una consulta a `pg_catalog.pg_tables` confirmó que su esquema `public` todavía no contiene tablas.

Este diagnóstico no implica que la recuperación ya esté desplegada.

## Configuración del despliegue

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
