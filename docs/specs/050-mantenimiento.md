# Pausa de la tienda pública

## Objetivo

Evitar que visitantes usen una tienda que todavía no puede vender con envío real. El dueño y el desarrollador necesitan seguir usando el panel protegido.

## Alcance

- Flag de servidor `SITE_MAINTENANCE_MODE`: `1` activa mantenimiento; `0` o ausente deja el comportamiento habitual.
- Pantalla propia de Canela con aviso de pausa y enlace al Instagram existente, sin catálogo, carrito ni promesas de fecha de apertura.
- Intercepción de las páginas públicas, rutas directas de checkout y APIs públicas antes de ejecutar sus operaciones.
- `/admin` y `/api/admin/*` conservan sus controles de acceso. No hay bypass público por cookie, query string o usuario administrador.
- Los callbacks `/api/webhooks/mercado-pago` y `/api/revalidate` conservan su validación original.
- Assets necesarios para renderizar la interfaz y `robots.txt` permanecen accesibles.
- Respuestas de mantenimiento con HTTP 503, `Retry-After`, `no-store` y `noindex`.
- Desactivar mantenimiento no cambia `CHECKOUT_MODE`; las ventas siguen bloqueadas mientras falte la integración logística.

## Criterios de aceptación

1. Con la flag activa, `/`, `/checkout`, una URL de resultado y cualquier ruta pública muestran mantenimiento sin consultar catálogo ni inventario.
2. Las APIs públicas rechazan operaciones con `503 SITE_MAINTENANCE`, incluso desde una pestaña abierta antes de la pausa.
3. El acceso por email al panel y su API continúan sujetos a autenticación; las fixtures siguen deshabilitadas en producción.
4. La pantalla se puede leer y operar en móvil y escritorio, con foco de teclado visible.
5. Al desactivar la flag y redesplegar, vuelve la tienda anterior; la flag no modifica pedidos, inventario ni configuración de Mercado Pago.

## Implementación

`src/proxy.ts` intercepta solicitudes mediante [Proxy de Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/proxy). La ruta `/mantenimiento` se renderiza fuera del layout comercial. La pausa se configura por entorno y requiere un nuevo deployment de Vercel para aplicar cambios de variables.
