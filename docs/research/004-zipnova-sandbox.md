# Zipnova: sandbox confirmado y alcance de despacho

## Fuente y estado

El 2026-10-13 Bruno compartió la respuesta de Enzo, soporte de Zipnova, a la
solicitud de integración. Evidencia específica de la cuenta Canela:

- Modo de pruebas habilitado por soporte.
- Se conservan credenciales y URL de API.
- Los envíos generados no se comunican a los transportes; sus etiquetas son de
  prueba.
- Para el origen en Mar del Plata, la modalidad ofrecida es despacho en sucursal
  con OCA y Correo Argentino. Retiro requiere un contrato propio con recolección.
- El mensaje menciona «solo envíos de un único bulto». No aclara inequívocamente
  si modifica solo Correo Argentino o ambos transportes. Hasta aclararlo, validar
  el flujo de alta con un bulto y no prometer multibulto para OCA.

La cotización anterior devolvió una tarifa OCA para dos bultos. Esto prueba esa
respuesta técnica, no garantiza la aceptación comercial ni el despacho multibulto.
Un bulto es un paquete exterior; puede contener varias piezas únicamente si el
taller aprueba una regla real de embalaje conjunto.

El bloqueo de acceso a sandbox está resuelto. La limitación de retiro es
operativa y no se resuelve con código ni por activar el modo de pruebas.

## Configuración local

`ZIPNOVA_ACCOUNT_MODE=sandbox` y `ZIPNOVA_DISPATCH_TYPE=carrier_dropoff` reflejan
la confirmación recibida. La flag no modifica la cuenta remota. No rotar claves
ni cambiar URL para este paso. Producción conserva sus flags actuales.

La prueba opt-in de cotización ahora lee el modo explícito de entorno y usa un
bulto sintético, sin fijar `operational` ni exigir multibulto. El resto de la
aplicación conserva la cotización conjunta, necesaria también para futuros
servicios habilitados. La restricción comercial debe quedar resuelta y aplicada
antes de habilitar ventas; esta actualización no abre el checkout productivo.

## Contrato propio

La [página enlazada por soporte](https://ayuda-envios.zipnova.com/hc/es-419/articles/45276944085779--Qu%C3%A9-es-Contrato-propio)
indica que esta funcionalidad requiere el plan Enterprise, tiene costo por envío
y deja la gestión de incidencias con el transporte. No equivale a habilitar retiro
en la cuenta actual. Evaluar ese camino requiere condiciones comerciales y
aceptación del cliente; no se contrató ni cambió ningún plan.

## Incremento definido: alta y etiqueta desde un pedido pagado

Este alcance se implementó posteriormente en [spec 070](../specs/070-zipnova-alta-etiqueta.md),
con [evidencia ZIP-02](../evidence/ZIP-02.md). La lista conserva el punto de partida:

1. Completar los datos de destinatario que exige el alta. El contrato público
   marca documento y teléfono como obligatorios; Canela todavía no guarda
   documento y permite teléfono vacío. Validar ese contrato en sandbox y adaptar
   checkout/persistencia antes de depender de él.
2. Desde la ficha autenticada, permitir crear un envío de un pedido pagado con
   preparación confirmada, modalidad y transporte explícitos. Comparar bultos y
   costo actualizado con lo cotizado; una diferencia requiere revisión.
3. Persistir intento e identificador externo estable antes de llamar al proveedor.
   No repetir a ciegas un alta con respuesta incierta. La API permite buscar por
   `external_id`; eso no demuestra por sí solo que el POST sea idempotente.
4. Guardar ID, estado y referencias de seguimiento. Obtener etiquetas cuando
   estén disponibles y tolerar que el proveedor tarde en generarlas.
5. Validar con un pedido y destinatario sintéticos, una pieza/paquete de prueba y
   cuenta sandbox. No usar el resultado para afirmar aceptación de mercadería
   frágil ni realizar un cobro productivo.

## Contratos públicos revisados

- [Crear envío](https://docs.zipnova.com/envios/recursos-api/envios/crear-envios):
  `POST /shipments`, origen, destino, paquetes, valor declarado e ID externo de
  hasta 30 caracteres. Especificar transporte y modalidad evita selección
  automática. `process_immediately` requiere validar su efecto en sandbox.
- [Consultar envíos y tracking](https://docs.zipnova.com/envios/recursos-api/envios/ver-envios-y-tracking):
  consulta por ID y búsqueda exacta por ID externo para recuperar un resultado
  incierto.
- [Etiquetas y guías](https://docs.zipnova.com/envios/recursos-api/envios/descargar-guias-y-etiquetas):
  `GET /shipments/{id}/label.pdf`; documentación indica contenido base64,
  indisponibilidad temporal `409` y `no_status_change=1` para descargar sin
  cambiar estado. Validar la respuesta real antes de integrar el visor.
- [Integración y sandbox](https://ayuda-envios.zipnova.com/hc/es-419/articles/45276943102099-C%C3%B3mo-integrar-Zipnova-via-API).

## Pendientes operativos

- Confirmar que el taller puede despachar en sucursal o acordar otro servicio.
- Aclarar el alcance de un bulto para OCA.
- Confirmar aceptación/clasificación de vidrio, cerámica y espejos.
- Completar medidas y pesos embalados, stock real y plazos de preparación.
- Completar el registro y aviso de despacho y la prueba integral de compra antes
  de solicitar el regreso a modo operativo y abrir ventas. Alta y etiqueta sandbox
  ya tienen evidencia en ZIP-02.

## Verificación de esta actualización

El 2026-10-13 se actualizó únicamente el modo de cuenta y la modalidad de despacho
en `.env.local`, preservando el resto de sus valores. El archivo sigue ignorado
por Git. El contrato opt-in de un bulto pasó contra la API con las credenciales
existentes y configuración local sandbox. Log local:
`tmp/zipnova-sandbox-quote-contract.txt`. ESLint del test y `git diff --check`
también pasaron.

Esta consulta demuestra que el adaptador sigue cotizando. La confirmación del
modo remoto proviene del mensaje de soporte: no se deduce de una cotización ni
de la flag local. No se crearon envíos, descargaron etiquetas ni modificaron
producción o planes comerciales durante esta actualización.

La iteración posterior del mismo día creó un único envío sintético y descargó
su etiqueta de prueba. También limitó la cotización a un bulto por defecto.
Ver ZIP-02 para distinguir esa prueba de la consulta inicial documentada arriba.
