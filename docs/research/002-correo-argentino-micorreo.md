# Investigación: API MiCorreo de Correo Argentino

## Estado y alcance

Investigación actualizada el 2026-09-25 usando exclusivamente fuentes oficiales
de Correo Argentino y probes no autenticados contra el ambiente QA publicado.

Este documento fija lo que puede usarse para diseñar INT-00. No autoriza todavía
la implementación del adaptador ni el checkout productivo: el contrato ejecutable
debe validarse con las credenciales QA y la habilitación comercial de Canela.

## Conclusión ejecutiva

API MiCorreo sigue siendo el único contrato público encontrado que incluye
cotización previa al pago mediante `POST /rates`. El portal actual también enlaza
el manual oficial de PAQ.AR API 2.0, pero ese contrato cubre autenticación, alta,
cancelación, rótulos, tracking y sucursales sin publicar cotización.

Es posible que Canela necesite API MiCorreo para cotizar y MiCorreo o PAQ.AR 2.0
para fulfillment, pero no se puede asumir esa combinación: Correo debe confirmar
qué producto y operaciones habilitará para la cuenta.

El 2026-09-25 se comprobó que las rutas QA publicadas de `/token` y `/rates`
responden por HTTPS. Ambas devolvieron `401` en menos de 300 ms al llamarlas sin
credenciales, que es el comportamiento esperado para recursos protegidos. Esto
confirma disponibilidad y autenticación obligatoria, pero no valida credenciales,
payloads, tarifas ni servicios de la cuenta.

## Fuentes oficiales consultadas

| Fuente | Consulta | Hallazgo útil | Límite |
| --- | --- | --- | --- |
| [Portal de integración](https://www.correoargentino.com.ar/MiCorreo/public/mi-correo) | 2026-09-25 | Presenta MiCorreo y APIs de PAQ.AR; las credenciales se gestionan con un ejecutivo comercial. | No publica un contrato OpenAPI ni identifica el producto habilitado por cuenta. |
| [Manual API MiCorreo](https://www.correoargentino.com.ar/MiCorreo/public/img/pag/apiMiCorreo.pdf) | 2026-09-25 | Define QA, producción, JWT, `/rates` y `/shipping/import`. | El propio documento está fechado el 2022-08-08. |
| [Manual PAQ.AR API 2.0](https://www.correoargentino.com.ar/MiCorreo/public/img/pag/apiPaqAr-v2.pdf) | 2026-09-25 | Define agreement/API key, alta, cancelación, rótulo, tracking y sucursales. | Está fechado en abril de 2023, contiene inconsistencias y no publica cotización. |
| [Manual oficial del plugin WooCommerce v3.0.8](https://www.correoargentino.com.ar/MiCorreo/public/files/manual-usuario-plugin-para-woocommerce-v3.0.8.pdf) | 2026-09-25 | El plugin actual distingue API MiCorreo y PAQ.AR API 2.0, y requiere peso/dimensiones por producto. | Describe un plugin; no es el contrato de una integración propia. |
| [Preguntas frecuentes de MiCorreo](https://www.correoargentino.com.ar/MiCorreo/public/faqs) | 2026-09-25 | Contexto operativo de MiCorreo. | No resuelve idempotencia, rótulos ni contrato de QA. |
| [Condiciones de embalaje](https://www.correoargentino.com.ar/servicios/paqueteria/condiciones-de-embalaje) | 2026-09-25 | Admite contenido frágil con acondicionamiento adecuado y responsabilidad del remitente. | No confirma cobertura comercial por rotura para la cuenta de Canela. |

La copia `apiPaqAr-v2.pdf` entregada por el cliente no se utilizó como evidencia.

## Contrato público de API MiCorreo

### Ambientes y autenticación

- QA: `https://apitest.correoargentino.com.ar/micorreo/v1`.
- Producción: `https://api.correoargentino.com.ar/micorreo/v1`.
- `POST /token` usa HTTP Basic con usuario y contraseña específicos por ambiente.
- La respuesta documentada contiene un JWT `token` y su `expires`.
- Las demás operaciones usan `Authorization: Bearer <token>`.

El token debe obtenerse y almacenarse únicamente en backend. Canela deberá
renovarlo según `expires`; nunca se enviará al navegador.

### Cotización: `POST /rates`

Solicitud pública documentada:

- `customerId`;
- `postalCodeOrigin`;
- `postalCodeDestination`;
- `deliveredType`: `D` para domicilio o `S` para sucursal;
- `dimensions.weight`: entero en gramos, de 1 a 25000;
- `dimensions.height`, `width` y `length`: enteros en centímetros, hasta 150.

Respuesta pública documentada:

- `customerId`;
- `validTo`;
- `rates[]` con `deliveredType`, `productType`, `productName` y `price`.

Para el primer lanzamiento Canela enviará `deliveredType = D` y seleccionará
solamente un `productType` confirmado como habilitado para la cuenta. No se
elegirá el primer elemento del array por posición.

`validTo` debe persistirse con el snapshot de precio. Antes de bloquear stock y
crear la order de Mercado Pago, la tarifa debe cubrir toda la ventana de checkout
o volver a cotizarse.

### Importación posterior al pago: `POST /shipping/import`

El contrato público requiere, entre otros datos:

- `customerId` y `extOrderId`;
- remitente y destinatario;
- modalidad y producto;
- dirección o agencia según modalidad;
- peso, valor declarado, alto, largo y ancho.

El ejemplo público exitoso solo devuelve `createdAt`. No publica en esa respuesta
un TN, rótulo ni URL de seguimiento. El plugin actual demuestra que el producto
operativo puede cubrir importación, preimposición, etiqueta, cancelación y
seguimiento, pero no demuestra qué endpoints puede consumir una integración
propia de Canela.

Por esta razón INT-04 no puede diseñar todavía la obtención de TN/rótulo a partir
del PDF público. Debe confirmarse con Correo y probarse en QA.

### Errores y repetición

El manual enumera `400`, `401`, `402`, `403`, `404`, `409`, `429` y `50x`.
Menciona una posible clave idempotente para `409` y recomienda retroceso
exponencial para `429`, pero no documenta:

- nombre o formato del header de idempotencia;
- endpoints que lo soportan;
- cuánto tiempo conserva Correo la clave;
- semántica de reintento ante timeout o `50x`;
- límites de solicitudes.

`extOrderId` y el error documentado de orden ya importada pueden ayudar a evitar
duplicados, pero no reemplazan una prueba de repetición segura. Canela no debe
reintentar automáticamente `/shipping/import` después de un resultado ambiguo
hasta fijar este contrato.

## Evidencia de conectividad QA

Pruebas realizadas el 2026-09-25 sin enviar credenciales ni datos comerciales:

| Operación | Resultado | Interpretación permitida |
| --- | --- | --- |
| `POST /token` sin Basic Auth | `401`, JSON `Header List is null or empty`, 278 ms | Ruta activa y protegida. |
| `POST /rates` con `{}` y sin Bearer | `401`, JSON `Header List is null or empty`, 224 ms | Ruta activa y valida autenticación antes del payload. |

Estas pruebas no forman todavía evidencia de contrato de la cuenta de Canela.

## Contrato público de PAQ.AR API 2.0

La versión descargada desde el portal oficial el 2026-09-25 está fechada en abril
de 2023 y publica:

- QA `https://apitest.correoargentino.com.ar/paqar/v1`;
- producción `https://api.correoargentino.com.ar/paqar/v1`;
- `agreement` y `Authorization: Apikey <key>`;
- `GET /auth`;
- `POST /orders`;
- `PATCH /orders/{trackingNumber}/cancel`;
- `POST /labels`;
- `GET /tracking`;
- `GET /agencies`.

No incluye un endpoint de tarifa ni precio. Por sí sola no puede resolver el costo
que Canela debe mostrar antes de Mercado Pago. Sí ofrece las capacidades públicas
más completas para el fulfillment posterior, incluido TN y rótulo, sujeto a
confirmación y contrato QA de la cuenta.

El PDF contiene nombres y ejemplos inconsistentes (`sellerId`/`idSeller`,
`order`, rutas singulares/plurales y un array de `parcels` del que el texto dice
que solo se procesa el primero). No se copiará ningún payload sin una prueba QA.

## Contradicción de límites publicada

El manual API MiCorreo de 2022 documenta para `/rates` un máximo de 25000 g y
150 cm por dimensión. La [FAQ actual de MiCorreo](https://www.correoargentino.com.ar/MiCorreo/public/faqs)
publica para PAQ.AR hasta 50 kg, 300 cm sumando largo, ancho y alto, y ningún lado
mayor a 200 cm.

Esto puede reflejar productos o contratos distintos. Hasta que Correo confirme el
límite de la API habilitada para Canela y QA lo demuestre, el dominio no fijará
ninguna de las dos cifras como regla productiva.

## Matriz de contrato pendiente con credenciales QA

| Caso | Evidencia necesaria para cerrar INT-00 |
| --- | --- |
| Autenticación válida | `200`, token no registrado en logs y vencimiento interpretable. |
| Autenticación inválida | Error estable y sin filtración de credenciales. |
| Cotización domiciliaria válida | `200`, tarifa habilitada, moneda y precisión confirmadas. |
| Código postal inválido/no cubierto | Código y cuerpo reales normalizados por el adaptador. |
| Peso de 0, 25000 y 25001 g | Límites efectivos de QA. |
| Dimensión límite y excedida | Límites efectivos de QA. |
| Tarifa y `validTo` | Zona horaria, vigencia y política de recotización. |
| Token vencido | Renovación única y repetición segura de `/rates`. |
| `429` | Header de espera si existe y backoff permitido. |
| Timeout/`50x` de `/rates` | Fallo del checkout sin reservar stock ni cobrar. |
| Repetición de `/shipping/import` | Idempotencia real o procedimiento seguro de consulta/recuperación. |
| Alta exitosa | Forma real de obtener TN, rótulo y estado de pago del porte. |

Los cuerpos de evidencia deben redactar tokens, contraseñas, direcciones y datos
personales.

## Datos que debe proveer o confirmar Correo

1. API o combinación de APIs habilitada para Canela: API MiCorreo, PAQ.AR API 2.0
   o ambas con responsabilidades distintas.
2. Contrato vigente para una integración propia, idealmente OpenAPI o manual
   versionado.
3. Usuario, contraseña y `customerId` de QA si corresponde MiCorreo, o
   `agreement` y API key de QA si corresponde PAQ.AR 2.0; producción se gestiona
   por separado.
4. Productos y modalidad domiciliaria habilitados para la cuenta.
5. Código postal y domicilio remitente registrados, incluida sucursal cabecera si
   corresponde.
6. Disponibilidad de pickup en el domicilio del taller.
7. Forma de pago del porte y momento en que quedan disponibles TN y rótulo.
8. Estrategia oficial de idempotencia o recuperación para importar un envío.
9. Admisión, valor declarado y cobertura por rotura de cerámica, vidrio, espejos
   y cuadros.
10. Canal técnico/comercial para escalar contradicciones de QA.
11. Límites efectivos de peso y dimensiones del servicio/API habilitado, debido a
    la diferencia entre el manual MiCorreo de 2022 y la FAQ actual.

Las credenciales no deben enviarse por email o chat. El dueño puede ingresarlas
directamente en el entorno local/hosting, o compartirlas mediante un canal seguro.

## Decisión de implementación

Hasta completar la matriz QA:

- no se implementa un adaptador que finja tarifas;
- no se habilita checkout productivo con un costo fijo presentado como Correo;
- sí se puede definir la spec interna de paquetes y el puerto de cotización sin
  acoplarlo al payload externo;
- el siguiente paso operativo es pedir la habilitación/contrato a Correo y cargar
  credenciales QA de forma segura.
