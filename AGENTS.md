# Instrucciones de trabajo de Canela

## Seguridad y escalabilidad (regla permanente del usuario)

En cada cambio, auditar el código afectado y sus límites de confianza para evitar
vulnerabilidades y problemas de crecimiento previsibles. Revisar también los
flujos relacionados cuando el impacto alcance otras partes del sistema.

- Validar entradas en el servidor, autorización por recurso, origen de las
  mutaciones y privacidad de respuestas, archivos, tokens y registros.
- No exponer secretos en logs, respuestas, frontend, capturas ni documentación.
- Acotar tamaños, consultas, procesamiento, reintentos y llamadas a proveedores.
  Considerar índices, paginación, caché, concurrencia e idempotencia.
- Mantener una fuente de verdad por dato y preservar consistencia entre pagos,
  reservas, stock y envíos ante fallos o eventos repetidos.
- Trabajar desde la spec y escribir pruebas de los flujos importantes, incluidos
  límites, permisos, fallos y concurrencia cuando correspondan.
- Corregir hallazgos concretos; registrar alcance, evidencia y riesgos pendientes.
  No afirmar seguridad absoluta ni escalabilidad ilimitada por pasar tests.
- Las auditorías no autorizan cobros, envíos, cambios de plan, borrados ni retirar
  el mantenimiento. Respetar las autorizaciones existentes para esas acciones.

## Decisiones vigentes

- Continuar en la rama del creador; no retirar el mantenimiento de producción.
- Desde CAT-154, PostgreSQL es la fuente de catálogo, stock y reservas. El panel
  administra su contenido; Neon Object Storage conserva las imágenes. Sanity
  queda como respaldo de consulta. No reactivar su escritura ni cambiar la
  autoridad sin una conciliación explícita de las escrituras posteriores.
- No reintroducir cron de recuperación: usar los mecanismos de eventos y la
  revisión manual prioritaria ya acordados.
- Las fotos originales de compradores del creador se procesan en el navegador;
  no habilitar almacenamiento ni publicación automática de esas fotos.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
