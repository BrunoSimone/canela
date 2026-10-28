# PER-148 — Cuadros listos para producción bajo mantenimiento

2026-10-28. Autorizado por Bruno, en `codex/creador-cuadros-personalizados`.
Extiende PER-146 y OPS-147: reemplaza el bloqueo permanente de producción por
habilitación explícita y validación del taller. Mantener mantenimiento activo.

## Alcance

- Completar la compra separada real sobre el circuito persistente existente.
- Configuración privada del taller en PostgreSQL y edición en el panel, migraciones y despliegue.
  Bruno aprobó esta alternativa tras confirmar que Sanity Free no admite datasets privados.
  Catálogo, stock y galería siguen en Sanity. Guild no se borra: su cuota es independiente.
- Conservar editor, zoom, guía privada, fabricación, avisos y galería consentida.
- No confirmar datos comerciales por Mariela ni realizar cobros/envíos reales
  durante esta iteración. Probar proveedores con dobles en una base local aislada.
- No agregar cron. Los casos pendientes se recuperan desde el panel y callbacks.

## Criterios de aceptación

1. Producción requiere flags coherentes de MP/Zipnova, fuente PostgreSQL privada,
   configuración válida y todas las confirmaciones del taller. Nunca fixtures.
   Datos incompletos bloquean antes de cotizar, reservar capacidad o pedir un pago.
2. Cotizaciones, pedidos, reintentos y capacidad separan test/production. Rechazar
   cruces de ambiente también en intentos ya cerrados. Concurrencia no excede cupos.
3. Precios y paquetes se calculan en servidor y se revalidan antes de reservar.
   La aceptación congela diseño, materiales, precio, plazo y condiciones.
4. Recuperar un pago existente conserva su idempotencia y ambiente aunque nuevas
   ventas estén deshabilitadas o cambie el taller; no crea otra compra.
5. Webhook duplicado, pago tardío, rechazo, respuesta ambigua y errores externos
   conservan los estados y avisos correctos. Fabricación exige pago confirmado;
   despacho exige cuadro terminado. No tocar stock de productos.
6. Compra/resultado diferencian ensayo de producción. Mostrar precio del cuadro
   y envío sin desglose de costos internos. Guía y referencias siguen privadas.
7. Galería real recibe solo borradores de pedidos productivos pagados consentidos;
   los pedidos de prueba nunca se exportan al catálogo real ni al taller privado.
8. Preparar panel del taller y configuración inicial sin aprobar ni publicar datos de ensayo.
   Producción permanece en mantenimiento y con el creador bloqueado mientras falten
   confirmaciones. La carga final de datos no requiere cambiar código.
9. Ejecutar pruebas de dominio/HTTP/UI y circuito PostgreSQL en ambos ambientes,
   TypeScript, lint, build, revisión visual móvil/escritorio y comprobación HTTPS
   del despliegue protegido. Registrar evidencia y pendientes externos reales.

## Datos del taller pendientes

Geometría reconciliada, paleta disponible, precios finales, paquetes completos por
tamaño (incluido espesor), plazo/capacidad y condiciones de personalización.
La publicación de esta configuración debe ser una decisión consciente del taller.

Evidencia: `docs/evidence/PER-148.md`.
