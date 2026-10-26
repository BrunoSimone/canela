# Zipnova: desarrollo y habilitación

## Estado

Cotización e integración local del checkout: [spec 060](../specs/060-zipnova-cotizacion.md).
Soporte confirmó el sandbox para Canela el 2026-10-13, según la respuesta
compartida por Bruno. Se mantienen URL y credenciales; los envíos de prueba no se
comunican a los transportes y las etiquetas son de prueba. Alta, recuperación y
descarga privada de etiqueta están implementadas y validadas localmente:
[spec 070](../specs/070-zipnova-alta-etiqueta.md),
[evidencia ZIP-02](../evidence/ZIP-02.md). El seguimiento se enlaza al proveedor;
el registro de despacho y ambos avisos están implementados localmente según
[spec 080](../specs/080-despacho-avisos-apertura.md). Ver
[operación de despacho y correos](despacho-avisos-apertura.md).

**Seguimiento del 26/10/2026:** soporte confirmó que volver a producción requiere
solicitud expresa y no depende del cierre del ticket. Estima que el cambio será
inmediato cuando atienda la solicitud; no confirmó un plazo de atención. Mantener
sandbox hasta coordinar el cambio y recibir confirmación antes de ajustar las
flags. Para admisión, embalaje y cobertura de piezas frágiles derivó a
`comercial@zipnova.com`. Ver [respuesta y alcance](../research/004-zipnova-sandbox.md#seguimiento-de-soporte--26102026)
y [borrador comercial retirado](../drafts/consulta-zipnova-condiciones.md).
Bruno decidió continuar con las condiciones oficiales de embalaje de OCA/Correo
ya revisadas y no esperar una respuesta comercial ni consultar cobertura.

**Verificación en el panel del 26/10:** Canela muestra Starter gratuito, sin
adicionales y sin vencimiento; API incluida. El aviso **Modo de Pruebas** y su
modal confirman el entorno remoto. El portal indica que desaparecerá al habilitar
la cuenta. Para preparar el paquete se toman como referencia las condiciones
oficiales de OCA/Correo revisadas. La consulta sobre las diferencias entre guías
de Zipnova fue retirada y no se mantiene como bloqueo de apertura. Ver
[cuenta, recargas y condiciones](../research/006-zipnova-cuenta-condiciones.md).

## Configuración

1. Aplicar `0008_shipping_quote.sql`, `0009_order_shipment.sql` y `0010_dispatch_notifications.sql` mediante `pnpm db:migrate` **antes** de ejecutar
   esta versión sobre una base. Primero usar una base de desarrollo independiente;
   comprobar el destino de `DATABASE_URL_UNPOOLED` además de `DATABASE_URL`.
2. Conservar `CHECKOUT_MODE=test` y las credenciales `MP_TEST_ACCESS_TOKEN`.
   Producción exige los gates de la spec 080 y permanece desactivada. `CHECKOUT_MODE=disabled` desactiva también
   la ruta de cotización. `SITE_MAINTENANCE_MODE=1` mantiene el sitio pausado.
3. Configurar `SHIPPING_PROVIDER=zipnova`, `ZIPNOVA_API_TOKEN`, `ZIPNOVA_API_SECRET`,
   `ZIPNOVA_ACCOUNT_ID`, `ZIPNOVA_ORIGIN_ID`, `CHECKOUT_SIGNING_SECRET` (32+ caracteres).
4. Para el origen actual en Mar del Plata configurar
   `ZIPNOVA_DISPATCH_TYPE=carrier_dropoff`: soporte confirmó OCA y Correo Argentino
   con despacho en sucursal. El retiro requiere un contrato propio con recolección;
   no está habilitado por el acceso al sandbox. La viabilidad de ir a sucursal
   necesita acuerdo del taller. Mantener `ZIPNOVA_MAX_PARCELS=1`; el alcance del límite
   para OCA está pendiente de aclaración.
5. Configurar `ZIPNOVA_ACCOUNT_MODE=operational` o `sandbox` según el modo confirmado
   por soporte. **Esta variable no cambia la cuenta remota.** Localhost tampoco
   activa sandbox. **Estado confirmado de Canela: `sandbox`.** Se conservan la
   URL y credenciales actuales. Volver a solicitar modo operativo al terminar
   las pruebas, coordinando la apertura comercial.
6. En Sanity completar peso (mínimo 10 g) y medidas de UNA unidad protegida,
   sin caja exterior. Cargar aparte las cajas compartidas. Seleccionar explícitamente
   clasificación según la [referencia oficial](https://docs.zipnova.com/envios/referencia/clasificaciones-de-producto):
   `6` vidrio, espejos o cuadros con vidrio; `1` cerámica decorativa/cuadros sin
   vidrio cuando no aplica otra clasificación; `4` solo pisos/revestimientos y
   `3` bachas. La lista publicada en Studio no asigna valores por defecto.
   La caja mixta General + vidrio conserva clasificación `6`; otras mezclas
   siguen bloqueadas. La clasificación no sustituye un embalaje adecuado.
7. Solo en el entorno aislado de pruebas, activar `ZIPNOVA_FULFILLMENT_MODE=sandbox`.
   Sin esta flag el alta permanece cerrada. Exige cuenta sandbox y despacho en
   sucursal; el código rechaza cuenta operativa. La flag no fue activada en el
   `.env.local` compartido ni en Vercel durante la validación. Las migraciones se
   aplicaron exclusivamente a PostgreSQL local descartable.

`CHECKOUT_TEST_SHIPPING_CENTS` se utiliza exclusivamente cuando
`SHIPPING_PROVIDER=controlled_test`; nunca es fallback de un fallo de Zipnova.
Los límites numéricos del adaptador son límites del esquema API, no condiciones
comerciales de un transporte: se ofrecen solo sus opciones seleccionables.

### Margen de embalaje

[Spec 125](../specs/125-margen-embalaje.md): valores opcionales de servidor
`SHIPPING_MARGIN_WEIGHT_PERCENT=5`, `SHIPPING_MARGIN_MAX_WEIGHT_GRAMS=200`,
`SHIPPING_MARGIN_DIMENSION_CM=1`. Aplicados al paquete completo después de la tara.
Se cotiza base y margen y se comparan ambos importes por transporte/servicio/despacho.
Solo se elige margen si los dos importes coinciden. Puede haber hasta dos consultas
iniciales (ambas consumen el límite de 60/min), y una revalidación al pagar.
Si falla únicamente la consulta adicional se conserva la base; el panel muestra
que no se pudo confirmar margen. La consulta base nunca tiene una tarifa inventada.

Poner los tres valores en `0` desactiva el margen. Los cambios invalidan cotizaciones
sin pagar; no cambian el contexto usado para despachar pedidos ya pagados. No se
modifica Sanity ni se requiere migración SQL. Preparación/etiqueta siempre recotizan
mediciones reales, sin agregar margen. El importe final sigue sujeto a confirmación.

## Pruebas

```sh
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
# Definir TEST_DATABASE_URL hacia PostgreSQL local descartable antes de ejecutar:
pnpm test:db
# Opt-in: consulta a la API con un bulto sintético; no crea envíos ni etiquetas.
RUN_ZIPNOVA_QUOTE_CONTRACT=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run src/modules/shipping/infrastructure/zipnova/client.contract.test.ts
```

El contrato opt-in consulta despacho en sucursal con bultos sintéticos de
clasificación General (`1`) y Cristales y vidrio (`6`),
respetando `ZIPNOVA_ACCOUNT_MODE` sin forzar modo operativo;
no debe interpretarse como aceptación comercial de vidrio, cerámica o espejos.
No imprimir las credenciales ni respuestas remotas completas.

## Comportamiento esperado

- En checkout: completar localidad, provincia y CP → calcular → seleccionar
  transporte → confirmar datos, documento y teléfono del destinatario → continuar
  a MP de pruebas.
- El total usa precios publicados releídos. Un cambio de carrito/destino elimina
  la selección visible. Un perfil faltante bloquea antes de cotizar.
- Cada selección vence a los diez minutos según política de Canela. Al pagar se
  recotiza y compara servicio, modalidad e importes al comprador y al vendedor.
  Un cambio exige nueva confirmación sin reservar stock.
- El snapshot queda en `orders.shipping_quote_snapshot`. Incluye bultos,
  clasificación, transporte, destino y contexto de cuenta; nunca el token API ni
  el token firmado. El panel muestra el transporte elegido en Modalidad.
- La tarifa no garantiza el precio de un futuro despacho. Una diferencia posterior
  debe resolverse operativamente; no se cobra automáticamente al comprador.
- La tabla `shipping_quote_rate_limit` mantiene un presupuesto compartido de 60
  llamadas/minuto. Ante 429, esperar el `Retry-After` de Canela. El límite aplica
  también a la recotización del checkout y funciona entre instancias del servidor.

## Preparar, confirmar y descargar

1. Abrir un pedido pagado con snapshot Zipnova sandbox y datos de destinatario
   completos. Los pedidos anteriores sin documento requieren revisión; no se
   inventan datos ni se completan con fixtures.
2. Guardar peso y medidas reales del paquete. Si difieren de lo cotizado al comprar,
   se consulta una tarifa nueva para ese embalaje; nunca falsear las mediciones.
   La diferencia de costo queda a cargo de Canela y no se cobra al comprador.
3. Consultar el costo, revisar el importe y aceptarlo explícitamente antes de
   pulsar **Generar etiqueta con este costo**. Canela recotiza y registra un intento
   único antes de crear el envío. Cambiar la preparación invalida la aceptación
   anterior. El paquete queda bloqueado para edición al iniciar el alta; doble
   clic o solicitudes concurrentes reutilizan el mismo registro.
4. Al obtener el alta, Canela solicita el PDF automáticamente. Si demora, usar
   **Consultar envío y etiqueta**. Si se perdió la respuesta del alta, la misma
   acción busca por la referencia externa guardada y consulta su detalle.
   Nunca repite el POST de alta, aunque no encuentre todavía el envío. Revisar
   el caso en Zipnova/soporte antes de cualquier intervención manual; no borrar
   `order_shipment` para forzar un nuevo intento.
5. **Descargar etiqueta PDF** entrega el archivo guardado, con sesión administrativa,
   sin caché pública. El PDF de sandbox dice que es de prueba. Obtenerlo no marca
   el paquete como despachado. Un resultado remoto incompatible queda en revisión.

El POST administrativo está en `/api/admin/orders/:id/shipment`; el PDF en
`/api/admin/orders/:id/shipment/label`. La consulta no expone documento ni snapshot
de solicitud al frontend. El aviso se encola al confirmar despacho explícito según la spec 080.

### Contrato de alta opt-in

Con soporte confirmando que la cuenta sigue en sandbox:

```sh
RUN_ZIPNOVA_FULFILLMENT_CONTRACT=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run src/modules/shipping/infrastructure/zipnova/fulfillment.contract.test.ts
```

Este test **sí crea un envío de prueba** en su primera ejecución. Guarda primero
`tmp/zipnova-fulfillment-contract.json`; ejecuciones siguientes recuperan esa
misma referencia y descargan su etiqueta. Conservar ese archivo: eliminarlo
habilita la creación de otra fixture. Usa destinatario y producto sintéticos.
El PDF generado queda en `tmp/zipnova-etiqueta-sandbox.pdf` y contiene datos del
origen de la cuenta: mantenerlo fuera del repositorio y de publicaciones públicas.

## Apertura pendiente

Confirmar despacho viable desde el taller, perfiles reales y plazo de preparación.
El alcance implementado conserva un bulto por pedido; la clasificación se elige
de la referencia oficial publicada en Sanity.
Preparar el embalaje según las condiciones oficiales del transporte. No esperar
el borrador retirado de Comercial como paso de este runbook.
Completar la aceptación externa integral y los pasos del [runbook de apertura](despacho-avisos-apertura.md) antes de
quitar mantenimiento o permitir cobros productivos.
