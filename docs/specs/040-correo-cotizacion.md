# Cotización de Correo Argentino y plan de bultos

> Actualización 16/10/2026: la [spec 090](090-apertura-caja-compartida.md)
> reemplaza la estrategia de bultos por unidad y agrega caja compartida, inventario,
> aprobación de costo real y gestión de avisos. La [spec 121](121-recuperacion-manual-sin-cron.md)
> establece recuperación manual sin cron desde el 26/10/2026.

## Estado

En revisión. Deriva de DEC-014, DEC-015, ADR-002 y la investigación oficial de
API MiCorreo del 2026-09-25. No habilita todavía checkout productivo.

La iteración interna autorizada el 2026-09-27 cubre perfiles embalados, plan de
bultos, suma de tarifas normalizadas y token firmado ligado a carrito, destino,
servicio y vencimiento. Usa un puerto de tarifas simulado en pruebas. La conexión
con Correo, el endpoint público y el checkout quedan pendientes del contrato QA.

Actualización 2026-10-13: se validaron autenticación y cotizaciones con Zipnova
como alternativa. Ver [evidencia y diferencias de contrato](../research/003-zipnova-validacion.md).
El retiro en origen y el alta de envíos siguen pendientes. El contrato de tarifas
de esta spec queda reemplazado por [spec 060](060-zipnova-cotizacion.md) para la
iteración Zipnova autorizada; las reglas de embalaje se conservan.

## Contexto y problema

Canela necesita cobrar el costo real de entrega antes de crear una order de
Mercado Pago. La tarifa depende del código postal de destino y de los bultos
exteriores que el taller enviará, no solamente de los productos del carrito.

El checkout actual usa un monto controlado de pruebas firmado. Ese token evita
que el navegador cambie el importe, pero no representa una cotización de Correo
ni está ligado al destino, al carrito o al plan de bultos.

## Objetivo

Permitir que un comprador ingrese su código postal, vea una tarifa domiciliaria
vigente de Correo Argentino para su carrito y use esa misma cotización al iniciar
el pago, sin confiar en precios, medidas o disponibilidad enviados por el
navegador.

## Actores

- **Comprador:** necesita conocer envío y total antes de ir a Mercado Pago.
- **Dueño de Canela:** necesita que el importe se base en un embalaje fabricable y
  que no prometa combinaciones inseguras.
- **Canela backend:** debe construir el plan de bultos, consultar Correo y emitir
  una prueba de cotización verificable.
- **Correo Argentino:** calcula tarifas para los bultos y servicios habilitados.

## Alcance

- Entrega a domicilio dentro de Argentina.
- Código postal de destino.
- Perfiles internos de peso y dimensiones ya embalados por unidad.
- Uno o varios bultos exteriores.
- Consulta de `/rates` por bulto y suma controlada de sus tarifas.
- Cotización firmada y ligada al carrito, destino y plan de bultos.
- Recotización explícita al cambiar carrito/destino o vencer la tarifa.

## Fuera de alcance

- Entrega a sucursal o locker.
- Cálculo de tiempo de entrega si Correo no lo devuelve en el contrato validado.
- Alta del envío, pago del porte, TN, rótulo, pickup y tracking.
- Optimización geométrica automática de cajas.
- Peso o medidas inventados cuando falta un perfil.
- Corrección automática posterior si el bulto real cambia de rango tarifario.
- Pedidos personalizados y productos por encargo.

## Requisitos funcionales

- **RF-SHP-001:** El comprador debe poder solicitar una cotización ingresando un
  código postal de destino y usando el contenido actual del carrito.
- **RF-SHP-002:** El backend debe releer del catálogo cada producto, su condición
  de venta y su perfil de envío; el navegador solo aporta identificadores,
  cantidades y código postal.
- **RF-SHP-003:** Cada unidad debe tener un perfil de peso y dimensiones que ya
  contemple su protección individual.
- **RF-SHP-004:** El backend debe construir un plan determinista de uno o más
  bultos exteriores. Solo puede agrupar unidades mediante una regla explícita
  aprobada por el dueño.
- **RF-SHP-005:** Cuando no exista una regla de agrupación, cada unidad protegida
  debe tratarse como un bulto exterior separado; nunca se debe adivinar una caja
  conjunta.
- **RF-SHP-006:** El backend debe consultar una tarifa domiciliaria de Correo por
  cada bulto y sumar sus importes en centavos sin usar aritmética monetaria de
  punto flotante para el total interno.
- **RF-SHP-007:** La respuesta debe mostrar costo total de envío, servicio
  seleccionado y vencimiento de la cotización.
- **RF-SHP-008:** El backend debe emitir un token opaco firmado que quede ligado a
  código postal, productos, cantidades, plan de bultos, servicio, importe y
  vencimiento.
- **RF-SHP-009:** Al iniciar el pago, el backend debe releer productos y rechazar
  el token si no corresponde exactamente al carrito solicitado.
- **RF-SHP-010:** Cambiar código postal, productos o cantidades debe invalidar la
  cotización visible y exigir una nueva.
- **RF-SHP-011:** Si se necesita más de un bulto, la interfaz debe comunicar la
  cantidad sin exponer complejidad interna de la API.
- **RF-SHP-012:** Si falta un perfil, una regla necesaria o una tarifa para algún
  bulto, no se debe reservar stock ni crear una order de Mercado Pago.

## Requisitos no funcionales

- **RNF-SHP-001 — Seguridad:** credenciales y JWT de Correo existen únicamente en
  backend y nunca forman parte del token de cotización, HTML, logs o respuestas.
- **RNF-SHP-002 — Privacidad:** cotizar no requiere nombre, email ni domicilio
  completo; solo código postal y carrito. No se persiste el código postal antes de
  iniciar una orden salvo registro técnico redactado.
- **RNF-SHP-003 — Integridad:** el token usa firma autenticada, comparación segura
  y versión explícita de payload.
- **RNF-SHP-004 — Disponibilidad:** un timeout, `429` o `50x` de Correo produce un
  error recuperable y no inicia pago.
- **RNF-SHP-005 — Observabilidad:** se registran proveedor, operación, duración,
  resultado normalizado y cantidad de bultos; nunca credenciales, JWT o dirección.
- **RNF-SHP-006 — Accesibilidad:** el formulario y los errores pueden usarse con
  teclado, tienen labels visibles y anuncian cambios de estado.

## Reglas de negocio

- **RN-SHP-001:** En el primer lanzamiento solo se ofrece entrega a domicilio.
- **RN-SHP-002:** Peso y dimensiones representan el bulto embalado, no la pieza
  desnuda.
- **RN-SHP-003:** Un envoltorio individual dentro de una caja común no constituye
  un bulto postal adicional.
- **RN-SHP-004:** Si una combinación no tiene regla segura de caja común, se
  cotiza como varios bultos exteriores.
- **RN-SHP-005:** Cada bulto debe cumplir los límites efectivos confirmados en QA.
- **RN-SHP-006:** Solo se eligen `productType` y modalidad habilitados para la
  cuenta de Canela; no se selecciona una tarifa por posición en el array.
- **RN-SHP-007:** La cotización debe seguir vigente durante los diez minutos del
  checkout. Si `validTo` no cubre la ventana completa al comenzar el pago, se
  rechaza como vencida y se recotiza.
- **RN-SHP-008:** Una diferencia entre perfil estimado y bulto real se resuelve en
  fulfillment; nunca se vuelve a cobrar automáticamente al comprador.
- **RN-SHP-009:** Una tarifa cero solo es válida si Correo la devuelve para el
  servicio habilitado o una promoción de envío gratuito está especificada por
  separado. Un error no se convierte en costo cero.

## Flujo observable

```text
carrito actual
  -> comprador ingresa código postal
  -> backend relee productos y perfiles
  -> backend construye bulto(s)
  -> Correo cotiza cada bulto a domicilio
  -> Canela suma tarifas y firma el snapshot
  -> comprador ve productos + envío + total + vigencia
  -> inicia pago con ese mismo carrito y token
  -> backend verifica firma, vigencia y coincidencia exacta
  -> recién entonces reserva stock y crea la order de Mercado Pago
```

## Datos internos mínimos

### Perfil de producto embalado

- identificador estable del producto;
- peso entero en gramos;
- alto, ancho y largo enteros en centímetros;
- regla de agrupación o indicación de envío individual;
- versión del perfil para invalidar cotizaciones emitidas con datos anteriores.

### Cotización normalizada

- proveedor y ambiente;
- código postal de origen y destino;
- modalidad domiciliaria;
- producto/servicio de Correo;
- bultos con peso y dimensiones;
- importe total en centavos;
- `validTo` normalizado con zona horaria;
- huella canónica de productos y cantidades;
- versión de reglas de embalaje;
- versión del payload firmado.

La respuesta del proveedor puede conservarse redactada como evidencia técnica,
pero el checkout consume solamente el modelo normalizado.

## Contrato HTTP propuesto de Canela

### Solicitar cotización

`POST /api/shipping/quotes`

```json
{
  "postalCode": "7600",
  "items": [
    { "productId": "sanity-id", "quantity": 1 }
  ]
}
```

Respuesta exitosa:

```json
{
  "shippingCents": 450000,
  "serviceName": "Servicio confirmado en QA",
  "parcelCount": 1,
  "expiresAt": "2026-09-25T18:30:00.000-03:00",
  "quoteToken": "opaque-signed-token"
}
```

Los nombres y códigos externos quedan encapsulados en infraestructura. El cliente
no puede elegir `customerId`, `productType`, pesos, dimensiones ni precio.

## Errores normalizados

| Código de Canela | Situación | Comportamiento visible |
| --- | --- | --- |
| `INVALID_POSTAL_CODE` | Formato inválido | Pedir corrección sin llamar a Correo. |
| `UNSHIPPABLE_ITEM` | Producto no vendible o sin perfil | Impedir pago e indicar qué pieza requiere consulta. |
| `PACKAGE_LIMIT_EXCEEDED` | Un bulto excede límites | Impedir pago; no alterar el paquete silenciosamente. |
| `SHIPPING_NOT_AVAILABLE` | Correo no ofrece domicilio/servicio | Informar que no hay entrega disponible para ese CP. |
| `SHIPPING_QUOTE_EXPIRED` | `validTo` no cubre checkout | Solicitar una nueva cotización. |
| `SHIPPING_PROVIDER_UNAVAILABLE` | Timeout, `429` o `50x` | Permitir reintentar sin reservar stock. |
| `SHIPPING_QUOTE_MISMATCH` | Token válido para otro carrito/destino | Invalidar y recotizar. |

Los códigos reales de Correo se mapearán después de la matriz QA de INT-00.

## Escenarios y criterios de aceptación

- **CA-SHP-001 — Cotización simple:** dado un producto vendible con perfil y un
  CP cubierto, al cotizar se devuelve tarifa domiciliaria firmada, bultos y
  vencimiento.
- **CA-SHP-002 — Autoridad backend:** alterar peso, medidas o precio en el
  navegador no cambia la solicitud enviada a Correo.
- **CA-SHP-003 — Carrito manipulado:** un token emitido para A no inicia el pago de
  B ni de A con otra cantidad.
- **CA-SHP-004 — Destino manipulado:** un token emitido para un CP no puede usarse
  para otro.
- **CA-SHP-005 — Perfil faltante:** la cotización falla antes de llamar a Correo y
  no crea reserva ni order MP.
- **CA-SHP-006 — Agrupación explícita:** dos unidades solo forman una caja común si
  una regla activa describe esa combinación; en caso contrario producen dos
  bultos cotizados.
- **CA-SHP-007 — Suma multibulto:** si Correo devuelve una tarifa válida para cada
  bulto, el costo visible y el de la order son la suma exacta en centavos.
- **CA-SHP-008 — Fallo parcial:** si uno de varios bultos no obtiene tarifa, no se
  emite una cotización parcial.
- **CA-SHP-009 — Vigencia insuficiente:** una tarifa que vence antes de terminar la
  ventana de pago no permite reservar stock.
- **CA-SHP-010 — Recotización:** al cambiar CP o carrito, el total anterior deja de
  mostrarse como vigente hasta recibir la nueva respuesta.
- **CA-SHP-011 — Proveedor caído:** timeout, `429` o `50x` deja carrito intacto y
  ofrece reintento; no crea efectos transaccionales.
- **CA-SHP-012 — Firma alterada:** cambiar un byte del token devuelve error y no
  consulta catálogo, reserva stock ni llama a Mercado Pago.
- **CA-SHP-013 — Tarifa cero inesperada:** una respuesta vacía, inválida o sin
  servicio no se presenta como envío gratis.
- **CA-SHP-014 — Datos personales:** una cotización no guarda ni registra nombre,
  email o domicilio completo.

## Estrategia de pruebas

1. **Dominio:** perfiles, límites, reglas explícitas de agrupación, huella canónica
   y suma multibulto.
2. **Aplicación:** cotización completa, fallo parcial, expiración y coincidencia
   entre token y carrito.
3. **Contrato QA:** autenticación y matriz `/rates` documentada en research 002.
4. **HTTP:** validación de body, errores normalizados y ausencia de secretos.
5. **Integración checkout:** ninguna reserva/MP order ante cotización inválida,
   vencida o ajena al carrito.
6. **UI:** cambio de CP/carrito invalida la vista; loading, error, éxito y teclado.

## Dependencias y bloqueos

- Confirmación de API/producto y credenciales QA de Canela.
- Perfiles de peso y dimensiones embaladas suministrados por el dueño.
- Reglas de caja común para combinaciones frecuentes.
- Servicio domiciliario y `productType` habilitados.
- Semántica de `validTo`, moneda y precisión confirmadas en QA.

## Preguntas abiertas que no bloquean el modelo interno

- Texto comercial definitivo del plazo de entrega.
- Promociones futuras de envío gratis o subsidiado.
- Orden en que se agregarán sucursales.
- Optimización futura de cajas más allá de reglas explícitas.

## Trazabilidad

- Decisiones: DEC-014, DEC-015 y DEC-016.
- Arquitectura: ADR-002.
- Investigación: [`docs/research/002-correo-argentino-micorreo.md`](../research/002-correo-argentino-micorreo.md).
- Secuencia: [`docs/plans/001-secuencia-correo-mercado-pago.md`](../plans/001-secuencia-correo-mercado-pago.md).
