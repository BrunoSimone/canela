# Recuperación manual sin cron

26/10/2026. Decisión explícita de Bruno: retirar la ejecución periódica y atender
manualmente las incidencias. Sustituye OPEN-06 de la spec 090 y FIN-02 de la 120.

## Alcance y aceptación

- **MAN-01:** eliminar `schedule` del workflow de avisos; conservar `workflow_dispatch`
  como herramienta técnica manual autenticada. No crear una cuenta ni un job externo.
- **MAN-02:** conservar intentos inmediatos después de pago/retorno/despacho, cola
  durable y reintento administrativo existente. Mantener permisos, backoff, lease,
  idempotencia, aislamiento de entorno y revisión de resultados inciertos.
- **MAN-03:** el preflight deja de exigir actividad periódica reciente. Consultar
  el estado actual: avisos en revisión, pendientes/en proceso de más de una hora
  e intenciones de reserva vencidas anteriores al alta en MP. Esos pendientes
  bloquean el preflight; la antigüedad o ausencia de una corrida no lo bloquea.
- **MAN-04:** la recuperación técnica manual informa también cuántas intenciones
  vencidas quedan. No presentar una corrida con reservas pendientes como saludable.
  La elegibilidad sigue excluyendo reservas listas y pagos ya creados en MP.
- **MAN-05:** documentar la supervisión humana: el email no es la única fuente de
  pedidos; consultar el panel, abrir «Despacho y avisos» y reintentar cuando
  corresponda. No prometer una alerta independiente, detección inmediata, ejecución
  autónoma ni que la incidencia sea rara sin datos de operación.

## Pruebas

SQL aislado: cola limpia sin historial o con historial antiguo; conteos reales por
entorno; avisos recientes/enviados no bloquean; elegibilidad de reservas vencidas.
HTTP: autenticación y error cuando quedan reservas por recuperar. Reejecutar las
pruebas existentes de reintento manual, idempotencia y recuperación de reservas.

## Límites

Sin operador ni nuevo evento no hay promesa de reintento o detección. La ventana
de idempotencia del proveedor no se amplía por operar manualmente: los resultados
inciertos fuera de ventana requieren revisión técnica. El estado de los correos
es visible en la ficha del pedido, no se agrega una alarma externa.

No cambiar pagos, inventario real, mantenimiento ni modo remoto de Zipnova. No
borrar migraciones, cola ni historial de ejecuciones. Conservar el límite de
duración del worker como protección general, aunque no haya scheduler.
