# Aceptación técnica final antes de abrir ventas

26/10/2026. Continúa las specs 080, 090, 100 y 110.

## Alcance

Cerrar los pendientes técnicos y preparar el despliegue para compradores reales.
Mariela carga productos, cantidades, medidas y cajas con la guía PDF. Zipnova
permanece en sandbox hasta el último paso coordinado con Bruno. La tienda pública
conserva mantenimiento y checkout deshabilitado durante esta iteración.

## Criterios comprobables

- **FIN-01:** una compra nueva con MP test confirma mediante un webhook automático
  auténtico antes de cualquier reconciliación por retorno. Verificar pago, reserva
  consumida, descuento único y aviso al taller; eventos repetidos no duplican efectos.
- **FIN-02 (sustituido el 26/10):** Bruno descarta cron y adopta recuperación
  manual según la [spec 121](121-recuperacion-manual-sin-cron.md). Retirar schedule
  y el requisito de actividad periódica; mantener cola, reintentos inmediatos,
  acciones manuales y controles basados en pendientes reales. La decisión no se
  presenta como una validación de la cadencia anterior.
- **FIN-03:** comprobar el presupuesto del endpoint frente al límite del disparador;
  probar errores, concurrencia e idempotencia de los reintentos que se modifiquen.
- **FIN-04:** comprobar las clasificaciones publicadas por Zipnova y ofrecer una
  selección explícita en Sanity. Según su referencia oficial: vidrio/espejos `6`,
  cerámica decorativa/cuadros sin vidrio `1` (cuando ninguna categoría específica
  aplica); `4` se reserva para pisos/revestimientos. No asignar valores por defecto.
  Una caja que combine General y vidrio debe conservar `6` porque contiene vidrio;
  combinaciones distintas siguen cerradas hasta definir su clasificación. Probar
  ambas órdenes de los ítems, un único bulto y conservación de peso/stock/precio.
- **FIN-05:** regresión completa (unitarias/HTTP/interacción, PostgreSQL descartable,
  contratos sandbox necesarios, lint, tipos y build), revisión del diff y publicación
  cerrada. Verificar seguridad de acceso, webhooks y ausencia de cobros públicos.
- **FIN-06:** revisar que el PDF entregable explique el stock autoritativo en Sanity,
  productos, medidas y cajas; comprobar contenido y legibilidad visual.
- **FIN-07:** registrar configuración productiva verificada y un procedimiento de
  compra real controlada. Distinguir preparación de ejecución: no declarar pago real
  probado sin cobro real, ni iniciar ese cobro sin intervención/autorización concreta.

## Evidencia y límites

Guardar resultados en `docs/evidence/FIN-120.md`, capturas y datos privados en
`tmp/final-120/`. Ningún dato sintético entra en Sanity production. Una prueba
sandbox no acredita que Zipnova esté operativo ni sustituye el pago real final.
La consulta comercial de embalaje/cobertura fue retirada por Bruno; no constituye
una dependencia de esta iteración. No se promete ausencia absoluta de fallos.
