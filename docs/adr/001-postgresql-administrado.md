# ADR-001: PostgreSQL administrado para órdenes e inventario

## Estado

Aceptado por Bruno el 2026-09-09.

## Fecha

2026-09-09

## Contexto

Canela necesita transacciones y restricciones de integridad para bloquear stock, confirmar ventas y procesar Webhooks idempotentemente. Sanity sigue siendo el catálogo editorial; no debe ser la autoridad de pedidos ni saldos.

La aplicación se ejecuta en Vercel y el objetivo actual es evitar operar una base propia y permanecer en un plan gratuito mientras el volumen sea bajo.

## Criterios

1. PostgreSQL real con transacciones ACID y constraints.
2. Conexiones compatibles con funciones serverless.
3. Suspensión/reactivación automática sin intervención durante un checkout.
4. Costo inicial cero y transición razonable a un plan pago.
5. Integración simple con Vercel y secretos separados por ambiente.
6. Portabilidad mediante SQL y migraciones propias.

## Alternativas

| Criterio vigente | Neon Free | Supabase Free |
| --- | --- | --- |
| Naturaleza | PostgreSQL serverless enfocado en base de datos. | Plataforma con PostgreSQL, Auth, Storage, Realtime y Functions. |
| Base incluida | 0,5 GB por proyecto. | 500 MB por proyecto. |
| Cómputo | 100 CU-horas mensuales por proyecto; escala a cero tras inactividad. | Instancia compartida; requests de API sin límite declarado dentro de fair use. |
| Transferencia | 5 GB mensuales. | 5 GB de egress y 5 GB cacheado. |
| Inactividad | El compute duerme y despierta automáticamente al llegar una consulta. | Un proyecto Free con baja actividad puede pausarse tras 7 días y debe reanudarse. |
| Recuperación gratuita | Ventana de time travel/restauración de hasta 6 horas o límite de cambios. | Sin backups automáticos ni PITR en Free. |
| Proyectos | Hasta 100 según el plan publicado; branches incluidos. | Dos proyectos Free activos. |
| Valor extra para Canela hoy | Pooling/serverless y branching de base. | Auth, archivos y realtime, hoy duplicados o innecesarios porque catálogo/imágenes viven en Sanity y no hay cuentas de cliente. |

Fuentes vigentes consultadas: [precios de Neon](https://neon.com/pricing), [billing de Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase), [pausa de proyectos Free](https://supabase.com/docs/guides/platform/free-project-pausing) y [precios de Supabase](https://supabase.com/pricing).

## Decisión

Usar **Neon PostgreSQL mediante la integración nativa de Vercel**.

No se elige por una diferencia relevante de almacenamiento —ambos ofrecen aproximadamente 500 MB—, sino porque:

- la base puede dormir y despertar automáticamente sin que el dueño tenga que restaurarla;
- Canela solo necesita PostgreSQL y no aprovecharía la mayor parte del paquete Supabase;
- la carga esperada es intermitente, que encaja con cómputo serverless y 100 CU-horas;
- Vercel inyecta las credenciales y Neon ofrece pooling apto para funciones serverless;
- el modelo relacional y las migraciones siguen siendo PostgreSQL portable.

## Consecuencias

### Positivas

- No hay servidor de base que administrar.
- El costo puede mantenerse en cero con el volumen inicial esperado.
- Una base dormida agrega un arranque en frío aproximado de cientos de milisegundos, aceptable al iniciar checkout.
- Branches permiten separar desarrollo/preview sin copiar manualmente producción.

### Riesgos

- El plan Free no debe considerarse un SLA de producción ni una estrategia completa de backup.
- Si Canela supera 100 CU-horas, 0,5 GB o 5 GB de transferencia por proyecto, habrá restricción o necesidad de upgrade.
- La ventana gratuita de restauración es corta; las órdenes deben exportarse/respaldarse y el plan debe revisarse antes de que el volumen sea material.
- Base y funciones deben estar en regiones cercanas para evitar latencia innecesaria.

## Cuándo preferir Supabase

La decisión se revisará si el proyecto incorpora cuentas de clientes, autenticación de administradores, archivos privados o realtime y conviene consolidar esas capacidades en una sola plataforma. Supabase sigue siendo una alternativa válida, pero su pausa por baja actividad es un inconveniente para una tienda con tráfico irregular.

## Validación antes de producción

- Confirmar límites reales mostrados por el plan al provisionar.
- Seleccionar región próxima a las funciones de Vercel.
- Probar despertar en frío y dos bloqueos concurrentes.
- Configurar migraciones reproducibles y un backup/export operativo.
- Definir alerta al 70 % de cómputo, almacenamiento y transferencia.
