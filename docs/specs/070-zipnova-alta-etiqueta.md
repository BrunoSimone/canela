# Alta de envío y etiqueta desde preparación confirmada

> Actualización 16/10/2026: la [spec 090](090-apertura-caja-compartida.md)
> reemplaza la estrategia de bultos por unidad y agrega caja compartida, inventario,
> aprobación de costo real y gestión de avisos. La [spec 121](121-recuperacion-manual-sin-cron.md)
> establece recuperación manual sin cron desde el 26/10/2026.

## Estado y alcance

Iteración autorizada el 2026-10-13. Continúa INT-04 y spec 060 con Zipnova sandbox
confirmado por soporte. Implementar el tramo desde el pedido pagado y embalado
hasta su etiqueta. Producción sigue cerrada. No inicia al recibir el webhook de
pago: el dueño debe confirmar primero los bultos reales, como define INT-04.

Implementado y validado localmente el mismo día. Evidencia y límites de la
prueba: [ZIP-02](../evidence/ZIP-02.md).

## Requisitos y aceptación

- **FUL-01:** Checkout Zipnova exige documento y teléfono del destinatario,
  validados y persistidos con la dirección. Pedidos antiguos conservan datos
  nulos; no se inventan ni exponen en la consulta pública del pedido.
- **FUL-02:** Solo sesión administrativa válida y solicitud del mismo origen
  pueden confirmar la preparación y crear un envío. Exigir pedido pagado,
  preparación vigente y snapshot Zipnova de la misma cuenta/origen/modo.
  Demo, pedidos sin pagar y modo operativo rechazan el alta en esta iteración.
- **FUL-03:** Primera validación comercial con un bulto. Bloquear cotizaciones
  y altas de más de un bulto en la configuración actual, conservando el
  planificador multibulto para futuras habilitaciones. No juntar piezas sin
  una regla de embalaje aprobada.
- **FUL-04:** Comparar preparación real con bultos cotizados y recotizar antes
  del alta. Una diferencia en embalaje, clasificación, transporte o importes
  pasa a revisión sin crear envío ni volver a cobrar. No cambiar transporte
  automáticamente. Persistir snapshot confirmado.
- **FUL-05:** Registrar intento y referencia externa estable antes del POST.
  Serializar confirmaciones concurrentes. Un resultado incierto se recupera
  buscando esa referencia; nunca repetir automáticamente el POST. Si la
  búsqueda todavía no encuentra el envío, conservar el estado de revisión.
  Errores previos al POST permiten reintentar con la misma preparación.
- **FUL-06:** Guardar ID remoto, estado y referencias de seguimiento. Después
  de crear, consultar automáticamente la etiqueta; si no está lista, mostrar
  espera y permitir volver a consultar sin crear otro envío. No interpretar
  etiqueta disponible como paquete despachado.
- **FUL-07:** PDF exclusivamente administrativo, sin caché pública, con tamaño
  máximo y formato comprobados. Descargar con `no_status_change=1`; no cambiar
  el estado remoto para previsualizar. No seguir URLs arbitrarias del proveedor.
- **FUL-08:** Preparación queda bloqueada mientras haya un intento de alta o
  envío creado. Errores y estados de revisión son visibles en la ficha. La
  operación logística no modifica pago ni inventario ni llama a Mercado Pago.

## Flujo y datos

Guardar medidas → «Confirmar embalaje y generar etiqueta» → validación y
recotización → intento persistido → alta → etiqueta automática o pendiente.

`order_shipment` conserva un registro por pedido: referencia externa única,
versión de preparación, snapshot de solicitud, estado local, identificador y
resumen remoto, PDF cuando esté disponible, error redactado, actor y fechas.
El detalle administrativo recibe estado/referencias; el PDF usa su propia ruta.
La lista no recibe documento del destinatario ni PDF.

Activación explícita `ZIPNOVA_FULFILLMENT_MODE=sandbox` junto con
`ZIPNOVA_ACCOUNT_MODE=sandbox`; ausente o `disabled` mantiene la operación cerrada.
Ninguna variable activa por sí misma el sandbox remoto.

## Verificación

Pruebas de rechazo antes del alta, pago/preparación/contexto/destino incorrectos,
duplicados concurrentes, timeout posterior al POST, recuperación por referencia,
errores de etiqueta y autenticación. Migraciones y concurrencia sobre PostgreSQL
local descartable. Contrato real opt-in sandbox con un destinatario sintético;
no usar datos de compradores ni comunicar a transportes. Verificar UI y PDF.

## Límites

No habilita producción, reembolsos, cancelaciones remotas, cambio automático de
tarifa ni cobros adicionales. No replica la cronología del transporte ni envía
emails de despacho. La aceptación de mercadería frágil, perfiles reales,
multibulto OCA y viabilidad de ir a sucursal siguen pendientes comerciales.

Fuentes: [confirmación sandbox](../research/004-zipnova-sandbox.md),
[secuencia INT-04](../plans/001-secuencia-correo-mercado-pago.md),
[API de alta](https://docs.zipnova.com/envios/recursos-api/envios/crear-envios),
[etiquetas](https://docs.zipnova.com/envios/recursos-api/envios/descargar-guias-y-etiquetas).

## Continuación 2026-10-14

La [spec 080](080-despacho-avisos-apertura.md) extiende este incremento con
registro de despacho, avisos y un modo operativo protegido por gates explícitos.
Las restricciones sandbox descritas arriba corresponden al alcance original 070.
Producción permanece sin activar; el contrato productivo externo no fue ejecutado.
