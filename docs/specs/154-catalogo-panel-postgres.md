# CAT-154 — Catálogo, archivos e inventario en el panel

2026-10-28 · ADR-007 aprobado · misma rama · mantenimiento activo.

## Alcance

Productos (borrador/publicación/archivo/recuperación/duplicado/orden), fotos,
cantidades, cajas de envío, carrusel y catálogo de cuadros en el panel existente.
PostgreSQL conserva documentos y relaciones; Neon Object Storage los archivos.
La configuración del taller ya reside en PostgreSQL. No cambiar compra separada,
pagos, ausencia de cron ni conservación local de fotos de compradores.

## Integridad y seguridad

- Conservar IDs, borradores separados, orden, crop/hotspot y snapshots históricos.
- Publicar exige campos válidos y assets verificados. Ninguna URL arbitraria
  suministrada por un usuario se descarga en el servidor. Originales privados.
- Borrador incompleto permitido. Stock operativo independiente del documento;
  al guardar contenido nunca se reemplazan cantidades ni reservas.
- Control optimista de versión, auditoría y archivo recuperable. No borrado físico.
- Reserva + pedido y pago + consumo + avisos, cada grupo en una transacción SQL.
  Bloqueos ordenados e idempotencia; nunca revivir saldos SQL históricos retirados.
- Acceso administrativo autenticado, origen verificado, cuerpos/tamaños acotados.
- Importación idempotente desde export verificado, sin sobrescribir ediciones
  posteriores; conciliar reservas con pedidos. No activar autoridad si hay diferencias.
- Una sola fuente activa seleccionada en servidor. Sanity temporalmente conservado
  para export/rollback; tras el corte, su endpoint de ajustes queda sin escritura.
- Caché solo de proyecciones públicas; precio/stock se comprueban sin caché al pagar.
- Respaldo de documentos, DB y originales con manifiesto/hash; ensayo de restauración.

## Criterios y pruebas

| Flujo | Evidencia requerida |
| --- | --- |
| Última unidad / carrito de varios productos | Integración concurrente; todo o nada |
| Pago duplicado, rechazo, tardío y rollback SQL | Un solo consumo; liberación o revisión prioritaria |
| Editor | Guardar incompleto, publicar válido, conflicto, archivo/recuperación, duplicar sin stock |
| Imágenes | Validación, carga/reintento, originales privados, referencias compartidas, recorte |
| Galería | Solo diseños autorizados; sin PII/materiales; publicación editorial |
| Importación | IDs/orden/borradores/hash preservados; reintentos; no pisa edición nueva |
| Accesos | 401/403 antes de escrituras; sin secretos en DTO/errores |
| Interfaz | Formularios y subida utilizables en móvil; estado y errores claros |
| Corte | Conciliación; mantenimiento conservado; reversión solo antes de nuevas escrituras |

No eliminar el proyecto Sanity ni sus archivos. Los datos pendientes de Mariela
siguen pendientes y no se inventan para aprobar la migración.

## Diseño del panel

Se conserva el sistema visual del panel existente: tinta #3e3028, texto secundario
#746458, papel #fbf8f1, líneas #dfd4c1 y confirmación #4d7151. Tipografía sans de
Canela para formularios y encabezados, marca existente en el encabezado.
Listado con miniaturas y estados; ficha de una columna en celular y contenido
principal con resumen lateral en escritorio. Fotos y datos públicos primero,
stock con reservas a la vista y medidas protegidas en una sección distinta de las
medidas que lee el comprador. Las acciones de borrador y publicación son explícitas.
Se evita una nueva estética de dashboard: la jerarquía viene del contenido y las
fotos, sin métricas decorativas ni más datos obligatorios que los necesarios.
