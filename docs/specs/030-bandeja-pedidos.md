# Bandeja administrativa de pedidos

## Estado

Borrador para evaluación. Define la primera pantalla que verá el dueño al entrar por email; no autoriza implementación hasta su aprobación.

## Objetivo

Permitir que el dueño encuentre rápidamente qué pedidos nuevos debe preparar, consulte una vista previa sin abrir cada uno y llegue al detalle operativo con un clic desde una netbook.

## Decisiones ya confirmadas

- Uso principal desktop/netbook; mobile responsive es secundario.
- Acceso mediante email autorizado, sin registro ni contraseña gestionada por Canela.
- El detalle pertenece al pedido Canela, no al detalle de Mercado Pago.
- Header sticky con acceso a una ayuda breve/FAQ.
- Correo administra el tracking de tránsito; Canela guarda el TN y enlaza al seguimiento oficial.

## Alcance MVP

- Listar pedidos accesibles para la cuenta autorizada.
- Orden inicial de **más nuevo a más viejo**.
- Selector para alternar más nuevo/más viejo.
- Búsqueda por número de pedido, nombre/email del comprador, producto o TN.
- Vista previa por fila.
- Abrir el detalle operativo del pedido.
- Paginación server-side.
- Estado vacío y estado sin coincidencias.

## Fuera de alcance inicial

- Dashboard de métricas.
- Edición masiva.
- Filtros avanzados por fecha, producto o localidad.
- Timeline propio de eventos de Correo.
- Exportaciones CSV/PDF.
- Gestión completa de reembolsos desde la bandeja.

## Composición recomendada

En desktop se propone una vista maestro-detalle:

- columna principal con la lista compacta y sus controles;
- panel derecho con la vista previa ampliada del pedido seleccionado;
- el clic en “Ver pedido” navega al detalle completo cuando haga falta trabajar sobre él.

Esto permite inspeccionar varios pedidos sin ida y vuelta constante y aprovecha la pantalla de una netbook. En mobile la lista ocupa todo el ancho y la vista previa se abre debajo o en una pantalla separada.

## Información visible en cada fila

- número público del pedido;
- fecha y hora;
- nombre del comprador;
- miniatura y nombre del primer producto;
- cantidad total de piezas y `+N` si hay más productos;
- total cobrado;
- estado operativo principal;
- localidad/provincia de destino;
- indicador no cromático de atención cuando existe una excepción.

No se muestra la dirección completa, teléfono, email completo ni ids de Mercado Pago en la lista.

## Estados operativos presentables

La bandeja no expone todos los estados técnicos de pago y logística. Propuesta inicial:

- **Pago en verificación**;
- **Preparar pedido**;
- **Listo para crear envío**;
- **Rótulo listo**;
- **Despachado**;
- **Requiere atención**;
- **Cancelado/reembolsado**.

El estado principal responde “¿qué debe hacer el dueño ahora?”. Los detalles técnicos quedan en la ficha del pedido.

## Búsqueda

### Contrato

`GET /api/admin/orders?q=&sort=created_desc&cursor=&limit=25`

- `q`: se normaliza en servidor, mínimo 2 caracteres para texto libre; un número de pedido exacto puede buscarse desde 1 carácter significativo.
- `sort`: `created_desc` por defecto o `created_asc`.
- `cursor`: paginación estable basada en `(created_at, id)`.
- `limit`: 25 por defecto, con máximo controlado por servidor.

### Comportamiento

- Debounce de 300 ms.
- El cambio de búsqueda u orden reinicia el cursor.
- La URL refleja `q` y `sort`, para poder volver atrás sin perder contexto.
- El backend busca solo columnas/indexes autorizados; no interpola SQL.
- La búsqueda por email se realiza solo dentro del panel autenticado.

## Vista previa seleccionada

Muestra sin abandonar la bandeja:

- número, fecha, estado y total;
- comprador con email parcialmente enmascarado;
- resumen de productos;
- tipo de entrega y destino resumido;
- siguiente acción sugerida;
- botón “Ver pedido”.

No permite cambiar estados ni crear envíos. Las mutaciones quedan en el detalle para reducir errores accidentales.

## Seguridad y caché

- Toda ruta `/admin` exige una sesión derivada de un enlace de email de un solo uso.
- Solo emails en allowlist pueden iniciar sesión.
- Cookie `HttpOnly`, `Secure`, `SameSite=Lax`, con expiración corta/renovable.
- Las respuestas administrativas usan `Cache-Control: private, no-store`.
- Los enlaces de acceso expiran y se consumen una sola vez; la URL final no conserva el token.
- Rate limit y respuesta indistinguible al solicitar acceso para no revelar emails autorizados.
- Auditoría de inicios de sesión y cambios operativos.

## Accesibilidad y responsive

- Filas y acciones accesibles con teclado.
- El estado siempre aparece como texto, no solo color.
- El input tiene label accesible y anuncia cantidad de resultados.
- En anchos pequeños se ocultan columnas secundarias, no datos esenciales.
- Los targets táctiles alcanzan aproximadamente 44 px en mobile.

## Rendimiento

- No cargar todos los pedidos en el navegador.
- Índice por `created_at DESC, id DESC`.
- Índices/búsqueda normalizada para número de pedido, comprador, TN y producto.
- Seleccionar únicamente los campos de preview; dirección e historial se consultan al abrir el detalle.
- Paginación cursor, no offset, para mantener estabilidad mientras entran pedidos nuevos.

## Criterios de aceptación

- **CA-ADM-001:** Al abrir la bandeja, el primer pedido es el más reciente.
- **CA-ADM-002:** Cambiar a “Más antiguos” invierte el orden de forma estable, incluso entre páginas.
- **CA-ADM-003:** Buscar por número, comprador, producto o TN devuelve solo pedidos autorizados que coinciden.
- **CA-ADM-004:** Limpiar la búsqueda restaura la lista y conserva el orden elegido.
- **CA-ADM-005:** Una fila muestra los datos de preview definidos sin dirección completa ni ids del proveedor.
- **CA-ADM-006:** Seleccionar una fila actualiza el panel de preview y “Ver pedido” abre el detalle correcto.
- **CA-ADM-007:** Ninguna respuesta administrativa se sirve desde caché pública.
- **CA-ADM-008:** Una sesión ausente/expirada no puede leer lista, preview ni detalle.
- **CA-ADM-009:** Un resultado vacío diferencia “aún no hay pedidos” de “no encontramos coincidencias”.
- **CA-ADM-010:** La bandeja funciona a 1024 px y conserva las funciones esenciales en 360 px.
- **CA-ADM-011:** Insertar un pedido nuevo mientras se pagina no duplica ni saltea resultados del cursor existente.

## Incrementos

1. **ADM-00 — Acceso:** email allowlist, enlace de un solo uso y sesión.
2. **ADM-01 — Consulta:** endpoint paginado, índices y permisos.
3. **ADM-02 — Bandeja:** lista, búsqueda, orden y estados vacíos.
4. **ADM-03 — Preview:** selección y vista previa no editable.
5. **ADM-04 — Detalle:** datos completos, preparación y pasos de Correo.
6. **ADM-05 — Ayuda:** FAQ contextual en header sticky.
7. **ADM-06 — Verificación:** seguridad, accesibilidad, netbook y mobile.

## Decisiones pendientes

1. Aprobar la composición maestro-detalle o usar lista que navega directamente.
2. Elegir el email proveedor para los enlaces de acceso y notificaciones.
3. Definir cuánto dura una sesión administrativa.
4. Validar con el dueño los nombres de estados operativos.

