# Validación de acceso y cotización: Zipnova

## Resultado al 2026-10-13

**Actualización posterior:** Bruno recibió confirmación de sandbox habilitado y
restricciones de despacho desde Mar del Plata. La confirmación sustituye el
pendiente de activación que describe esta investigación inicial. Ver
[respuesta de soporte y siguiente alcance](004-zipnova-sandbox.md).

La cuenta Canela permite autenticación y cotización real mediante la API v2.
Se generaron credenciales desde el panel con autorización del usuario y se
guardaron en `.env.local`, excluido de Git y con permisos `0600`.

El acceso a una API de tarifas está resuelto para Zipnova. El retiro en el taller
sigue sin validarse: las tres consultas iniciales y una nueva consulta después
de corregir el domicilio devolvieron `400` y
`No hay tarifarios para el destino asignado` con `carrier_pickup`.

Esta evidencia valida una alternativa de proveedor. El checkout de Canela ahora tiene una integración local según
[spec 060](../specs/060-zipnova-cotizacion.md); no se crearon envíos ni etiquetas.

## Pruebas ejecutadas

- Lectura de cuenta y origen: ambas respondieron `200`, coincidiendo con Canela
  y su origen en Mar del Plata, CP 7600.
- Nueve llamadas a `POST /v2/shipments/quote`: cinco exitosas y cuatro sin tarifas
  de retiro en origen, incluyendo las dos consultas tras corregir el domicilio.
- Entrega al comprador: `standard_delivery`, a domicilio.
- Bulto **sintético**: 1 kg, 20 × 20 × 10 cm, clasificación General.
- Valor declarado **sintético**: ARS 30.000 por envío, también en el caso de dos
  bultos para mantener constante esa variable.
- No se enviaron datos de compradores. Las medidas y valores no representan
  productos reales del catálogo.
- No se ejecutó `POST /shipments`. La consulta de facturación final respondió
  `200`, con saldo, crédito y disponible en cero. No hubo pagos.

### Tarifas observadas

ARS con impuestos, obtenidos en esta prueba. No son tarifas fijas ni precios
para publicar. Coincidieron `price_incl_tax` y `seller_price_incl_tax`.

| Destino | Bultos | OCA | Correo Argentino | Despacho |
| --- | --- | --- | --- | --- |
| Palermo, CABA, 1425 | 1 | 12.600 | 19.797 | Sucursal del transporte |
| Córdoba, Córdoba, 5000 | 1 | 12.600 | 19.797 | Sucursal del transporte |
| Mar del Plata, Buenos Aires, 7600 | 1 | 11.120 | 19.797 | Sucursal del transporte |
| Palermo, CABA, 1425 | 2 | 14.253 | Sin opción devuelta | Sucursal del transporte |

Todas las opciones exitosas fueron seleccionables y sin impedimentos. Las tres
consultas de retiro usaron los mismos destinos con `carrier_pickup`; ninguna
devolvió tarifas. Esto describe la respuesta actual, no demuestra que sea
imposible habilitar retiro después de verificar el origen o revisar cobertura.

Andreani no apareció en las cotizaciones ni en la lista estándar observada del
panel. Figuró como alternativa de contrato propio, que no se configuró.

### Revalidación después de corregir el domicilio

El usuario actualizó el domicilio el 2026-10-13. Una lectura posterior de
`GET /addresses/{origin_id}` confirmó el cambio y mantuvo el origen activo en
Mar del Plata, CP 7600. No se almacena aquí el domicilio exacto.

Se repitió la cotización del bulto sintético a Palermo, CP 1425:

- `carrier_dropoff`: `200`; OCA ARS 12.600 y Correo Argentino ARS 19.797,
  ambas opciones seleccionables y con impuestos incluidos.
- `carrier_pickup`: `400`, sin tarifarios. La corrección del domicilio no resolvió
  la disponibilidad de retiro en esta consulta.

La respuesta de lectura del origen no contiene un estado de verificación;
confirmar el cambio de dirección no prueba que Zipnova la haya verificado.

## Configuración observada

- Origen activo en Mar del Plata. El panel mostraba dirección **no verificada**
  antes de la corrección; no se confirmó el estado de verificación posterior.
- Retiro por transporte habilitado como modalidad, pendiente de tarifa efectiva.
- Despacho predeterminado en sucursal del transporte.
- Programación automática de recolección deshabilitada.
- Preparación: una hora hábil; falta confirmación del taller antes de prometer
  fechas al comprador.

El usuario corrigió el domicilio; no se modificaron las opciones logísticas
durante las pruebas. No se versionan CUIT, teléfono ni domicilio exacto. Los
identificadores de cuenta y origen se guardaron en `.env.local`.

### Variables locales

```dotenv
ZIPNOVA_API_TOKEN=
ZIPNOVA_API_SECRET=
ZIPNOVA_ACCOUNT_ID=
ZIPNOVA_ORIGIN_ID=
```

Base Argentina: `https://api.zipnova.com.ar/v2`. HTTP Basic con token y secret,
`Accept: application/json` y `Content-Type: application/json`. Las cotizaciones
usaron `source: canela_api_validation` y paquetes explícitos. Las variables
son consumidas por la aplicación cuando `SHIPPING_PROVIDER=zipnova`; se requieren
además modo de cuenta y despacho explícitos, según `.env.example`.

## Diferencias detectadas respecto del prototipo anterior

La [spec original](../specs/040-correo-cotizacion.md) describía MiCorreo. Estos
hallazgos motivaron la spec 060 y la implementación local detallada más abajo:

1. `quote-shipping.ts` suma una tarifa por bulto. Zipnova debe cotizar el conjunto
   `packages`: en la prueba, dos bultos no costaron el doble que uno. Sustituir
   solamente `quoteParcel` daría un modelo inadecuado.
2. `courier-quote.ts` fija `provider: correo_argentino`. El snapshot debe guardar
   proveedor, transporte, servicio y modalidad de despacho efectivos.
3. El contrato de destino requiere localidad y provincia, o ID de localidad,
   además del CP. Debe resolverse sin adivinar localidades a partir de CP ambiguos.
4. `delivery_time.estimation_expires_at` vence la estimación de entrega; no se
   comprobó una garantía de precio equivalente a `validTo` de MiCorreo. Hay que
   especificar la recotización previa al pago.
5. Se reutilizan el plan de embalaje, los importes internos en centavos y la
   validación de carrito/destino. Se rechazan opciones no seleccionables.
6. Alta de envíos, etiquetas, conciliación y reintentos necesitan una validación
   propia; las tarifas exitosas no prueban esos flujos.

## Pendientes para continuar

Determinar si el taller puede despachar en sucursal o necesita retiro obligatorio.
Obtener o confirmar medidas embaladas, pesos y
clasificación de las piezas reales, y verificar sus condiciones por fragilidad.
La cotización ya está implementada localmente; estos datos siguen siendo
necesarios para probar carritos con productos reales y habilitar la operación.

### Sandbox

La documentación oficial indica que soporte debe habilitar el modo de pruebas
en una cuenta registrada normalmente. Al finalizar, soporte debe restablecer
el modo operativo para que los transportes puedan recibir los envíos.

El [formulario de integraciones](https://ayuda-envios.zipnova.com/hc/es-419/requests/new?ticket_form_id=47279900592403)
es el canal enlazado por esa documentación. Bruno confirmó que envió el formulario
el 2026-10-13. Todavía no se confirmó la activación del sandbox en Canela. Debe consultarse además cómo
identificar el modo activo y si requiere cambios de URL o credenciales.

Ejecutar Canela en localhost no cambia el modo de la cuenta remota. Hasta que
soporte confirme la activación, no se deben tratar las altas de envíos como
pruebas sin efectos reales. La validación realizada se limita a lecturas y
cotizaciones; no se crearon envíos ni etiquetas. Un envío real requiere saldo
y una prueba coordinada y autorizada, fuera de esta validación.

## Implementación local posterior

Se reemplazó el núcleo experimental por cotización conjunta, firma v3,
revalidación al pagar, persistencia de selección y UI. La prueba de contrato del
adaptador hizo una consulta adicional exitosa de dos bultos sintéticos a Palermo,
sin crear envíos. Total en esta sesión: diez cotizaciones, seis exitosas y cuatro
sin tarifas de retiro. Ver [evidencia de implementación](../evidence/ZIP-01.md).

Auditoría de Sanity de solo lectura: 27 productos publicados, 24 con condición de
venta `unica` o `stock`, cero perfiles embalados y cero clasificaciones cargadas.
Esto no prueba disponibilidad de inventario físico; esa fuente sigue siendo PostgreSQL.

## Fuentes y evidencia

Fuentes oficiales consultadas el 2026-10-13:

- [Autenticación](https://docs.zipnova.com/envios/principios/urls-y-autenticacion).
- [Cotizaciones](https://docs.zipnova.com/envios/recursos-api/envios/cotizar-envios).
- [Cuentas](https://docs.zipnova.com/envios/recursos-api/cuentas-y-origenes/gestion-de-cuentas).
- [Ubicaciones](https://docs.zipnova.com/envios/recursos-api/cuentas-y-origenes/ubicaciones-de-cuenta).
- [Sandbox](https://ayuda-envios.zipnova.com/hc/es-419/articles/45276943102099-C%C3%B3mo-integrar-Zipnova-via-API).

Resúmenes locales redactados (ignorados por Git):

- `tmp/zipnova-first-quote.json`
- `tmp/zipnova-pickup-quotes.json`
- `tmp/zipnova-additional-quotes.json`
- `tmp/zipnova-corrected-origin-quotes.json`
- `tmp/zipnova-credenciales-creadas.png`: confirmación visual sin secretos.
