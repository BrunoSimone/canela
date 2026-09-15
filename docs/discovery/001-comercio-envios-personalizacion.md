# Descubrimiento: checkout, envíos y personalización

## Estado

Borrador de descubrimiento. No constituye una especificación aprobada ni autoriza implementación o cambios en producción.

**Fecha:** 2026-09-09

## Decisiones confirmadas

- **DEC-001 — Pago directo sin medios offline:** el comprador pagará durante Checkout Pro, se excluirán medios con acreditación offline y se usará `capture_mode = automatic_async`. Un estado `processing` se maneja solamente en backend.
- **DEC-002 — Stock interno numérico:** cada producto vendible tendrá una cantidad interna. El número no se mostrará al comprador.
- **DEC-003 — Ocultar agotados:** un producto sin disponibilidad no aparecerá en el catálogo público.
- **DEC-004 — Base autoritativa:** antes de iniciar el pago, el backend contrastará precio y disponibilidad con la base privada mediante una operación atómica. La caché del frontend nunca autoriza una compra.
- **DEC-005 — Personalización enfocada:** se explorarán tres familias distintas: cuadros de mosaico derivados de una imagen pixelada, marcos de espejo en vitromosaico y vitrales personalizados.
- **DEC-006 — Bloqueo temporal aprobado:** al comenzar el checkout, la disponibilidad se retiene durante una ventana corta. Para el comprador el producto solo se presenta como disponible o no disponible; el estado transitorio es exclusivamente técnico.
- **DEC-007 — Personalización postergada:** cuadros de mosaico, espejos y vitrales personalizados quedan fuera del roadmap activo hasta recibir del dueño las restricciones reales del taller.
- **DEC-008 — Orden de integración (resuelta el 2026-09-14):** se conserva MP-01, ya implementado; primero se prueba cotización de Correo, luego Mercado Pago cobra el total final y el fulfillment se prepara después del pago.
- **DEC-009 — Duración del bloqueo:** el bloqueo de checkout durará 10 minutos y continuará siendo un valor configurable para poder ajustarlo con evidencia del embudo.
- **DEC-010 — Secuencia dividida:** aprobada. Resolver primero contrato y cotización de Correo; luego cobrar el total con Mercado Pago; después del pago, el dueño embala y confirma medidas antes de importar/pagar el envío y obtener el rótulo.
- **DEC-011 — Fuente de Correo:** aceptada el 2026-09-14. La documentación entregada por el cliente deja de ser fuente normativa. El diseño se basa en documentación publicada en dominios oficiales de Correo y cada supuesto se valida con pruebas de contrato en QA. Una contradicción entre documentación y QA bloquea el incremento hasta obtener confirmación de Correo. Ver ADR-002.
- **DEC-012 — Pedido personalizado automatizado:** para cuadros de mosaico regular con venecitas, el comprador ajustará el tamaño dentro de límites fabricables, aceptará una previsualización construida exclusivamente con la paleta y cuadrícula del taller y pagará sin aprobación manual previa. El pago verificado generará directamente la orden de producción. Precio, plazo y capacidad siguen pendientes.
- **DEC-013 — Administración por email:** el panel del dueño será desktop-first, con acceso mediante email autorizado y sin registro ni contraseñas gestionadas por Canela. Mobile será responsive, pero secundario.
- **DEC-014 — Entrega inicial:** Canela habilitará solamente entrega a domicilio en el primer lanzamiento. El comercio decide qué modalidades ofrece y el comprador elige únicamente entre las habilitadas.
- **DEC-015 — Embalaje multiproducto:** cada producto se protege individualmente, pero Correo recibe un solo bulto exterior cuando la combinación sea segura y entre en los límites previstos. Si la compra requiere más de un bulto exterior, se cotiza cada bulto y se suma el costo antes del pago.
- **DEC-016 — Tracking delegado:** Canela confirma compra y despacho, guarda el TN y enlaza al seguimiento oficial. Correo Argentino es responsable de comunicar y mostrar los estados de tránsito; Canela no replicará el tracking en el MVP.
- **DEC-017 — Orders API (aceptada el 2026-09-14):** Checkout Pro se integrará mediante Orders API con idempotencia, Webhooks de order y consulta autoritativa. Preferences queda solo como antecedente. Ver ADR-003.
- **DEC-018 — Bandeja de pedidos (borrador):** el panel desktop-first tendrá una lista ordenada inicialmente de más nuevo a más viejo, búsqueda server-side, selector ascendente/descendente y una vista previa por pedido. Ver spec 030.

Estas decisiones permiten continuar las specs ejecutables de Mercado Pago, cotización y operación administrativa. Neon ya fue aprobado; siguen abiertas la interfaz de reposición, las credenciales externas y algunos datos operativos del dueño.

**Spec derivada:** [`docs/specs/010-checkout-inventario.md`](../specs/010-checkout-inventario.md)

**Spec de integración:** [`docs/specs/020-mercado-pago-checkout-pro.md`](../specs/020-mercado-pago-checkout-pro.md)

**Spec de administración:** [`docs/specs/030-bandeja-pedidos.md`](../specs/030-bandeja-pedidos.md)

**Investigación de Mercado Pago:** [`docs/research/001-mercado-pago-orders-api.md`](../research/001-mercado-pago-orders-api.md)

**Plan de secuencia propuesto:** [`docs/plans/001-secuencia-correo-mercado-pago.md`](../plans/001-secuencia-correo-mercado-pago.md)

**Plan de Mercado Pago:** [`docs/plans/002-mercado-pago-orders-api.md`](../plans/002-mercado-pago-orders-api.md)

**Cuestionario de cuadros personalizados:** [`docs/discovery/002-cuadros-personalizados-preguntas-cliente.md`](002-cuadros-personalizados-preguntas-cliente.md)

## Objetivo de esta etapa

Determinar qué capacidades necesita Canela Store para convertir el catálogo actual en una tienda que pueda cobrar, reservar stock y gestionar envíos sin perder el flujo humano necesario para piezas artesanales y encargos personalizados.

## Resumen ejecutivo

- La copia `apiPaqAr-v2.pdf` entregada por el cliente no es fiable y queda solo como antecedente histórico; no define la integración.
- La documentación oficial pública de MiCorreo describe `/rates` para cotizar antes del pago y `/shipping/import` para importar un envío después de cobrar. Es el objetivo inicial, sujeto a pruebas de contrato en QA y a la habilitación real de la cuenta.
- La integración de pagos recomendada para un primer checkout es Mercado Pago Checkout Pro: mantiene la captura de datos de pago fuera de Canela y reduce complejidad frente a Checkout API/Bricks.
- El precio, el stock y el total nunca deben confiarse al navegador ni a Sanity en el momento del cobro. Sanity puede seguir siendo el catálogo editorial; pedidos, reservas, pagos y datos personales necesitan una base transaccional privada.
- Los tres tipos actuales de disponibilidad no representan la misma regla: una pieza única requiere stock duro de una unidad; un producto en stock requiere cantidad; un encargo requiere capacidad y plazo de producción, no solo cantidad.
- La personalización por imagen es viable como flujo de pedido asistido con previsualización y aprobación. No es responsable prometer un diseñador completamente automático hasta conocer la técnica productiva, las plantillas y tolerancias reales del taller.
- Antes de asumir que el problema es solamente el checkout, hay que instrumentar el embudo. Sin datos no podemos distinguir falta de tráfico, falta de intención, abandono al pasar a WhatsApp o fricción en el cierre manual.

## Contexto verificado en el repositorio

### Producto actual

- Next.js 16, React 19 y TypeScript.
- Home estática con datos de Sanity y revalidación.
- Catálogo en una sola página; el detalle se abre en un modal y no tiene URL propia.
- La “consulta” vive únicamente en memoria del navegador y deriva a WhatsApp.
- El precio se toma directamente del catálogo y no existe una orden persistida.
- No hay integración de pagos, cálculo de envío, reserva de stock ni tracking de conversión.
- No hay suite de testing configurada en `package.json`.
- Sanity usa el dataset `production`, configurado como público para lectura.

### Modelo actual de producto

El producto contiene nombre, descripción, precio, categoría, subcategoría, estado (`unica`, `stock`, `encargo`), una nota libre, medidas de exhibición, material e imágenes.

Faltan datos necesarios para vender y enviar:

- SKU o identificador comercial estable;
- slug para una página compartible;
- cantidad disponible;
- política de reserva;
- peso y dimensiones del paquete, estructurados y numéricos;
- posibilidad de agrupar productos en una caja;
- tiempo de preparación;
- variantes y opciones personalizables;
- costo y plazo de fabricación por encargo;
- estado vendible independiente de la etiqueta visual.

### Hallazgos visibles en el catálogo cargado

- Una pieza marcada como única puede agregarse e incrementarse más de una vez.
- Hay al menos un producto de prueba visible (`producto`, descripción `producto lorem ipsum`, precio `$123`).
- La categoría Espejos muestra cero productos mientras la sección sigue expuesta.
- Algunas etiquetas de disponibilidad no están normalizadas (`En stock`, `Disponible`, `5 días`).
- El comprador no ve total del carrito, costo de envío, plazo estimado, políticas, reseñas ni un camino de pago directo.

Estos puntos dañan confianza y conversión aunque el checkout técnico sea correcto.

## Antecedente descartado como contrato: PDF de PAQ.AR

Esta sección conserva el análisis realizado para mantener trazabilidad, pero **ninguno de sus endpoints o comportamientos constituye un requisito vigente**. La copia del cliente no se usará para implementar ni aceptar la integración.

El manual fechado en abril de 2023 describe:

| Capacidad | Endpoint documentado | Utilidad para Canela |
| --- | --- | --- |
| Validar credenciales | `GET /v1/auth` | Comprobar `agreement` y API key desde backend. |
| Alta de orden | `POST /v1/orders` | Crear la preimposición/orden de un paquete después de confirmar la venta. |
| Cancelación | `PATCH /v1/orders/{trackingNumber}/cancel` | Cancelar una orden que todavía no fue impuesta. |
| Rótulo | `POST /v1/labels` | Obtener uno o más rótulos PDF codificados en base64. |
| Historial | `GET /v1/tracking` | Consultar eventos del envío por tracking number. |
| Sucursales | `GET /v1/agencies` | Mostrar sucursales o lockers habilitados para el acuerdo. |

### Datos que exige para crear un envío

- Remitente y destinatario.
- Dirección y código de provincia.
- Un paquete con peso en gramos y alto, ancho y largo.
- Valor declarado.
- Tipo de entrega: domicilio, sucursal o locker.
- Sucursal cuando corresponda.
- Fecha de venta y tipo de servicio.

### Particularidades relevantes

- Las credenciales son secretas y deben usarse exclusivamente desde el backend.
- `trackingNumber` puede generarlo Correo si no se envía.
- Aunque `parcels` es un array, el manual afirma que solo procesa el primer elemento y descarta los demás. Un carrito no equivale a varios parcels: antes hay que decidir cómo se embala el conjunto o dividirlo en varios envíos.
- Las sucursales disponibles dependen del acuerdo comercial; no conviene mantener una lista fija.
- El resultado de rótulos es por elemento, por lo que una llamada puede tener éxito parcial.
- Los ejemplos tienen errores e inconsistencias de nombres (`sellerId`/`idSeller`, `order` presente o ausente, `status`/`result`, GET con body para tracking, rutas singulares y plurales).
- El encabezado dice “API 2.0”, pero las URLs y endpoints expuestos son `/v1`.
- No se documentan idempotencia, rate limits, timeouts, reintentos, webhooks de tracking, cotización, pago del porte ni SLA técnico.

### Conclusión histórica sobre su utilidad

Solo permite entender qué clase de operaciones esperaba cubrir aquel contrato. No es una fuente de diseño ni de prueba para Canela.

La documentación oficial pública de [API MiCorreo](https://www.correoargentino.com.ar/MiCorreo/public/img/pag/apiMiCorreo.pdf) describe autenticación Basic + JWT, `/rates` para cotización y `/shipping/import` para importar el envío. El PDF oficial visible está fechado en 2022, así que su publicación en el dominio oficial tampoco reemplaza la validación en QA. Correo indica que las credenciales se tramitan con un ejecutivo: [portal de integración](https://www.correoargentino.com.ar/MiCorreo/public/mi-correo) y [preguntas frecuentes](https://www.correoargentino.com.ar/MiCorreo/public/faqs).

### Spike obligatorio con Correo

Antes de cerrar la spec de envíos:

1. Pedir la habilitación de API MiCorreo para Canela y confirmar por escrito que es el producto vigente de la cuenta; evaluar PAQ.AR solo si Correo lo exige expresamente.
2. Registrar URLs y versión/fecha de la documentación oficial, URL QA, credenciales QA, identificador de cliente y servicios habilitados.
3. Ejecutar una prueba de contrato de `/rates` y comprobar cuánto dura una tarifa.
4. Confirmar cómo se paga el porte al operar por API y cuándo se habilita el rótulo.
5. Probar en QA autenticación, cotización, sucursales, alta, repetición segura de alta y las operaciones de rótulo/tracking que confirme el contrato vigente.
6. Obtener límites, timeouts, política de reintentos y canal de soporte.
7. Confirmar si vidrio y cerámica tienen cobertura/seguro, tratamiento de roturas y valor declarado máximo.

La política completa de fuentes y discrepancias está aceptada en [`docs/adr/002-fuente-contrato-correo.md`](../adr/002-fuente-contrato-correo.md).

Correo admite objetos frágiles si tienen acondicionamiento adecuado, pero responsabiliza al remitente. Su guía recomienda inmovilizar las piezas y mantener material amortiguador también respecto de la caja exterior: [condiciones de embalaje](https://www.correoargentino.com.ar/servicios/paqueteria/condiciones-de-embalaje).

## Alternativas de pago

| Alternativa | Ventaja | Costo/riesgo | Evaluación |
| --- | --- | --- | --- |
| Continuar con link manual por WhatsApp | Casi sin desarrollo; conserva conversación. | Abandono no medible, precio y stock manuales, no existe orden fiable. | Mantener como canal secundario. |
| Mercado Pago Checkout Pro | Checkout alojado por Mercado Pago, order por pedido y retorno al sitio. | Redirección fuera del sitio; exige backend, webhooks y persistencia. | **Seleccionado para el primer checkout.** |
| Mercado Pago Checkout API/Bricks | Mayor control visual y pago embebido. | Más superficie de integración, seguridad y pruebas. | Evaluar solo si Checkout Pro demuestra una fricción real. |

Mercado Pago recomienda que las integraciones nuevas de Checkout Pro usen Orders API y clasifica Preferences como legado: [referencia general](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro-orders/overview). El backend crea `POST /v1/orders` con idempotencia y recibe `checkout_url`; el Webhook de order se valida y luego se consulta `GET /v1/orders/{id}`: [notificaciones](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/payment-notifications).

## Flujo objetivo provisional para productos vendibles

```text
Catálogo Sanity
  -> carrito local
  -> checkout pide contacto + entrega
  -> backend relee productos y precios
  -> cotiza envío
  -> transacción descuenta disponibilidad + crea reserva corta
  -> backend crea order de Mercado Pago con idempotencia
  -> comprador paga en Checkout Pro
  -> webhook firmado + consulta de order
  -> transacción confirma pago y convierte la reserva en venta
  -> alta/importación del envío (reintentable)
  -> rótulo + tracking
  -> notificación al comprador
```

Reglas de seguridad y consistencia:

- El navegador envía identificadores y cantidades, no precios confiables.
- El backend relee precio, disponibilidad y perfil de envío.
- La reserva usa una actualización condicional atómica; si no quedan unidades, devuelve conflicto y no crea una order MP.
- El total se guarda como snapshot antes de crear la order MP.
- Cada orden usa una referencia externa única en Mercado Pago.
- Aunque el pago sea inmediato, la reserva existe durante la redirección para que dos compradores no puedan pagar la misma última unidad.
- Si Mercado Pago rechaza, cancela o no permite crear la order de forma definitiva, se libera la reserva de manera idempotente.
- Webhooks duplicados o fuera de orden no pueden duplicar el cobro, el consumo de stock ni el envío.
- La vuelta del navegador desde Mercado Pago solo muestra estado; no confirma la venta.
- Si Correo falla después del pago, la orden queda pagada con fulfillment pendiente y se reintenta. No se pierde la venta ni se cobra de nuevo.
- Un proceso de reconciliación consulta pagos que quedaron sin webhook o en estado incierto.

## Stock: decisión y modelo

### Modos de disponibilidad

| Modo | Invariante | Al iniciar/pagar |
| --- | --- | --- |
| Pieza única | Stock inicial normalmente igual a 1. | Cantidad máxima 1; reserva atómica. |
| En stock | `disponible >= 0` y nunca vender más que la cantidad cargada. | Descontar disponibilidad al reservar; convertir la reserva al aprobar. |
| Por encargo | Limitado por capacidad y plazo, no por unidades físicas actuales. | Crear solicitud/orden de producción con fecha prometida. |

Para el primer checkout, solo las piezas únicas y los productos con stock numérico participarán del pago directo. Los encargos y personalizados usarán un flujo separado hasta definir capacidad y aprobación.

La disponibilidad efectiva será `stock físico - reservas activas`. Una consulta pública solo incluirá productos con disponibilidad mayor que cero; este filtrado mejora la experiencia, pero no es el control de seguridad.

El control autoritativo será equivalente a una actualización condicional dentro de una transacción:

```sql
UPDATE inventory
SET reserved = reserved + :quantity
WHERE product_id = :product_id
  AND stock_on_hand - reserved >= :quantity;
```

Si no se actualiza exactamente una fila, el backend responde “sin stock” y no crea la order MP. Esto resuelve tanto una vista cacheada como dos compras paralelas.

### Estados mínimos

```text
draft
  -> reserved
  -> payment_pending
  -> paid
  -> fulfillment_pending
  -> shipped
  -> delivered

payment_pending -> rejected | expired | cancelled
paid -> refund_pending -> refunded
paid personalizado -> awaiting_production -> in_production -> ready_to_ship
```

La reserva debe realizarse en una base con transacciones/condiciones atómicas. Una base PostgreSQL privada es la opción de referencia; el proveedor se decide después de conocer presupuesto y operación. Sanity permanece como dueño del contenido de catálogo, no de saldos ni pedidos.

### Edge cases que la spec debe resolver

- Dos compradores intentan pagar la última pieza.
- Mercado Pago no puede producir un resultado inmediato para el medio elegido.
- El usuario abandona Mercado Pago y vuelve a intentar.
- Llega el webhook dos veces, tarde o fuera de orden.
- El webhook dice `approved`, pero la consulta autenticada no coincide con monto, moneda o referencia.
- Cambian precio o stock mientras el carrito está abierto.
- La notificación de un pago aprobado llega después del vencimiento técnico de la reserva.
- El comprador paga y Correo no responde.
- El envío necesita dos cajas, pero la API procesa un solo parcel.
- El peso real difiere y genera costo adicional o rechazo.
- Hay reembolso total/parcial, contracargo, devolución o rotura.
- Un encargo consume más capacidad de taller de la estimada.

Orders API ofrece `capture_mode = automatic` para forzar aprobado/rechazado, pero Mercado Pago advierte que puede reducir la aprobación. Canela aprobó `automatic_async`: acepta un estado técnico `processing` y preserva el bloqueo hasta resolverlo. La ventana objetivo es `PT10M`, pendiente de prueba de contrato: [investigación](../research/001-mercado-pago-orders-api.md).

## Diseño técnico provisional

### Responsabilidades

- **Sanity:** contenido público, imágenes de producto, estado editorial y opciones configurables.
- **PostgreSQL privado:** inventario transaccional, reservas, órdenes, ítems, pagos, envíos, personalizaciones y auditoría.
- **Next.js server:** cálculo confiable de totales, endpoints de checkout, webhooks, panel protegido y adaptadores externos.
- **Mercado Pago:** experiencia y procesamiento del pago.
- **Correo Argentino:** tarifa, sucursales, orden logística, rótulo y tracking según contrato confirmado.
- **Storage privado de objetos:** originales y pruebas de personalización; no el dataset/CDN público actual de Sanity.

### Entidades mínimas

- `inventory_item`: product id, modo, on-hand, reservado y versión.
- `stock_reservation`: orden, producto, cantidad, vencimiento y estado.
- `order`: estado, moneda, importes, contacto, dirección, snapshots y timestamps.
- `order_item`: producto, nombre/precio snapshot, cantidad y referencia de personalización.
- `payment_attempt`: provider id, preference id, estado verificado e idempotencia.
- `shipping_quote`: tarifa, vencimiento, paquete y modalidad.
- `shipment`: referencia externa, tracking, rótulo y estado de sincronización.
- `customization_request`: especificación, archivos, prueba aprobada, revisiones y estado productivo.

No se propone todavía un proveedor de PostgreSQL ni de storage: es una decisión de costo, privacidad y operación pendiente.

## Personalización por familia de producto

> **Estado:** exploración archivada temporalmente por DEC-007. Esta sección conserva lo aprendido y las preguntas para el dueño, pero no forma parte de los próximos incrementos.

### Evaluación de factibilidad

| Familia | Experiencia posible | Factibilidad de automatización | Recomendación |
| --- | --- | --- | --- |
| Cuadro de mosaico “8 bits” | Subir imagen, recortar, elegir tamaño/cuadrícula y previsualizar con la paleta real de venecitas. | Alta si se usan teselas regulares, grilla y paleta finita. | **Primer MVP de personalización.** |
| Espejo en vitromosaico | Elegir forma/tamaño del espejo, ancho del marco, paleta y uno de varios patrones de borde. | Media; la imagen subida no es el insumo principal. | Configurador paramétrico después del cuadro. |
| Vitral personalizado | Subir una referencia y obtener una propuesta segmentada. | Baja-media: cada pieza necesita estructura, cortes viables, uniones y revisión del artesano. | Flujo asistido con presupuesto, no fabricación automática. |

### MVP recomendado: imagen a cuadro de mosaico

1. El cliente elige una medida de cuadro disponible.
2. El sistema deriva la cantidad de filas/columnas a partir del tamaño de cada venecita y la junta.
3. El cliente sube una imagen y selecciona el recorte.
4. El sistema reduce la imagen a la cuadrícula física.
5. Cada celda se asigna al color disponible más cercano de una paleta real del taller.
6. Se muestra una previsualización con teselas y juntas, no solo píxeles planos.
7. El cliente puede comparar pocas variantes: más/menos colores y dos estrategias de contraste.
8. El sistema genera una lista de materiales con cantidad por color y una guía numerada para el taller.
9. El dueño revisa factibilidad, corrige si hace falta y confirma precio/plazo.
10. El cliente aprueba la prueba versionada y recién entonces paga.

La referencia del cuadro de palmera demuestra que el producto ya usa una cuadrícula discreta de venecitas. Eso vuelve posible mapear una imagen a unidades físicas y producir además una lista de materiales. La calidad no depende principalmente de “subir resolución”, sino de elegir bien el recorte, la cantidad de celdas y la paleta.

### Espejos

Las referencias muestran espejos circular y rectangular con un marco compuesto por piezas geométricas, vidrio texturado y venecitas. Aquí conviene un configurador de opciones controladas:

- forma y tamaño del espejo;
- ancho del marco;
- patrón de borde aprobado por el taller;
- paleta de vidrios disponibles;
- densidad y distribución aproximada;
- color de junta y sistema de colgado.

La previsualización será representativa, no una promesa de posición idéntica de cada fragmento artesanal.

### Vitrales

Una imagen puede convertirse en una primera segmentación de áreas de color, pero el resultado no es automáticamente fabricable. El artesano deberá validar tamaño mínimo de pieza, líneas estructurales, radios de corte, tipo de unión, vidrio disponible, peso y montaje. Para esta familia, el sistema puede reducir el trabajo de discovery y generar un boceto, pero no omitir la aprobación humana.

### Qué no debemos prometer

- Que “mejorar resolución” recupera detalle que no existe. Un upscale puede suavizar o inventar información; no sustituye una imagen fuente adecuada.
- Una representación exacta de color, textura o reflejo respecto del vidrio físico.
- Que cualquier celda o segmento generado por software puede cortarse y montarse.
- Producción automática a partir de cualquier imagen.

### Controles de archivos

- Subida directa a storage privado mediante URL firmada.
- Lista permitida de formatos y límite de bytes/píxeles.
- Detección por contenido, no solo por extensión.
- Protección contra archivos maliciosos y bombas de descompresión.
- Eliminación de EXIF/metadatos en derivados.
- Original privado, miniatura separada y acceso temporal.
- Consentimiento, declaración de derechos sobre la imagen y política de retención/borrado.
- Hash y versión de la prueba que el comprador aprobó.

Si la imagen identifica a una persona, puede ser un dato personal. La Ley 25.326 exige controles de seguridad/confidencialidad y eliminación cuando deja de ser necesaria: [texto actualizado](https://www.argentina.gob.ar/normativa/nacional/64790/actualizacion). Además, la política de compra personalizada debe revisarse legalmente: los productos hechos según indicaciones del consumidor aparecen entre las excepciones al arrepentimiento, pero el sitio seguirá vendiendo también productos no personalizados: [contratos de consumo](https://www.argentina.gob.ar/node/159428) y [Disposición 954/2025 vigente](https://www.argentina.gob.ar/normativa/nacional/disposici%C3%B3n-954-2025-417152/texto). Esto es una alerta de revisión profesional, no asesoramiento legal.

## Información necesaria del dueño para personalización

### Cuadros de mosaico

1. Medida exacta de cada venecita/tesela y separación de junta.
2. Medidas estándar de cuadro y dimensiones útiles dentro del marco.
3. Si todas las piezas forman una grilla regular o se permiten cortes/fragmentos.
4. Paleta realmente disponible: muestra física, nombre/SKU, foto calibrada y cantidad.
5. Cantidad máxima de colores por cuadro y reglas para transparencias, brillos o texturas.
6. Preferencias para retratos, fondos y nivel mínimo de detalle reconocible.
7. Si el taller quiere una guía por coordenadas, numerada o por capas.

### Espejos y vitrales

8. Formas y medidas estándar; ancho mínimo/máximo del marco.
9. Patrones de vitromosaico que el dueño acepta repetir.
10. Catálogo de vidrios, texturas, colores y disponibilidad.
11. Para vitrales: técnica de unión, ancho estructural, tamaño mínimo de pieza, curvas/cortes imposibles y límites de peso/montaje.
12. Qué parte puede decidir el cliente y qué parte siempre decide el artesano.

### Archivo de entrada

13. Formatos aceptados: JPG, PNG u otros.
14. Tamaño máximo y si se aceptan fotografías, rostros, texto o logos.
15. ¿El taller necesita el original, la grilla/propuesta procesada o ambos?

### Operación comercial

16. Precio base y modificadores por tamaño, colores, complejidad y urgencia.
17. Anticipo o pago total; momento a partir del cual comienza la producción.
18. Plazo por familia y capacidad semanal/mensual.
19. Cantidad de revisiones incluidas y costo de revisiones adicionales.
20. Quién aprueba la factibilidad y cuánto tarda en responder.
21. Política ante rechazo técnico, cancelación, error del cliente o diferencia con la prueba.
22. ¿Se puede publicar luego la pieza terminada y su imagen como ejemplo? Debe ser opt-in.
23. Tiempo durante el cual deben conservarse originales y pruebas.

## Mejoras para generar ventas

### Prioridad 0: medir y corregir confianza

- Instrumentar `view_product`, `add_to_inquiry`, `begin_checkout`, `shipping_quote`, `payment_redirect`, `payment_approved` y errores.
- Registrar fuente/campaña con consentimiento y mínima retención.
- Vincular consultas de WhatsApp con una referencia para que el dueño marque si terminaron en venta.
- Quitar productos de prueba, normalizar estados y ocultar filtros vacíos.
- Definir métricas base: sesiones calificadas, vista de producto, intención, checkout, pago y tiempo de respuesta por WhatsApp.

Sin esta capa, “cero ventas” no permite saber dónde está el problema.

### Prioridad 1: hacer comprable el catálogo

- URL propia y compartible por producto.
- CTA “Comprar ahora” para piezas con precio y disponibilidad definidos.
- Total, entrega estimada y costo de envío antes de salir a pagar.
- Retiro en taller como alternativa, si el dueño lo ofrece.
- Información consistente: medidas, material, cuidado, aptitud alimentaria solo si está validada, plazo y stock.
- Políticas visibles de envío, rotura, cambios, devolución y producción por encargo.
- Mantener “Consultar por WhatsApp” como ayuda y para piezas no estandarizadas.

### Prioridad 2: reforzar deseo y confianza

- Fotos consistentes y contextualizadas en un ambiente real.
- Video corto del proceso y de la persona que fabrica.
- Reseñas verificables y fotos de clientes, con autorización.
- Colecciones por ocasión: regalos, mesa, jardín, piezas únicas.
- Packaging de regalo y mensaje personalizado si el taller puede cumplirlo.
- Fechas de entrega realistas y señal de escasez solo cuando provenga del stock verdadero.

### Prioridad 3: diferenciación

- Configurador asistido de encargos.
- Galería de personalizaciones reales y variantes que el taller sí puede reproducir.
- Lista de espera para piezas agotadas y notificación con consentimiento.
- Tarjetas regalo, si se define contabilidad, vencimiento y reembolsos.

## Secuencia aprobada de incrementos

La integración técnica sigue este orden. Los incrementos de Mercado Pago pueden probarse en sandbox sin envío; la habilitación pública requiere conocer y cobrar una modalidad de entrega válida.

1. **INC-000 — Saneamiento mínimo del catálogo.** Retirar contenido de prueba y normalizar qué productos pueden venderse.
2. **INC-001 — Autoridad transaccional.** PostgreSQL, esquema de órdenes/inventario, stock inicial y operación atómica de bloqueo.
3. **INC-002 — Mercado Pago en pruebas.** Checkout Pro vía Orders API, idempotencia, `PT10M`, retorno de estado y compra de prueba.
4. **INC-003 — Confirmación robusta.** Webhook de order firmado, consulta autoritativa, expiración segura y reconciliación.
5. **SPIKE-001 — Contrato real de Correo.** Ejecutar pruebas QA y decidir entre PAQ.AR y MiCorreo/adaptador.
6. **INC-004 — Cotización y selección de entrega.** Perfiles de paquete, tarifa server-side, domicilio/sucursal y total final.
7. **INC-005 — Fulfillment.** Alta/importación posterior al pago, rótulo, tracking, reintentos y operación manual de respaldo.
8. **INC-006 — Activación comercial.** Prueba extremo a extremo, observabilidad, políticas visibles y habilitación gradual del CTA de compra.
9. **BACKLOG — Personalización.** Retomar cuadros, espejos y vitrales cuando estén las respuestas del dueño.

## Preguntas críticas para Bruno

1. ¿Retiro en taller existe como modalidad real o la activación pública debe esperar a Correo?
2. ¿Qué presupuesto mensual aceptable hay para base privada, correo transaccional y observabilidad?
3. ¿El dueño necesita un panel propio o podemos iniciar con una vista administrativa mínima?
4. ¿Qué herramienta de analítica se acepta y qué nivel de consentimiento/privacidad queremos?

## Preguntas críticas para el dueño

### Venta y stock

- ¿Cuántas unidades reales hay y con qué frecuencia se actualizan?
- ¿Quién puede reponer/corregir la cantidad y desde qué interfaz?
- ¿Los encargos quedan fuera del checkout inicial y continúan por consulta?
- ¿Qué política usa para cancelaciones, devoluciones, contracargos y roturas?

### Pago

- ¿La cuenta de Mercado Pago está a nombre del negocio y puede crear una aplicación con credenciales de prueba/producción?
- ¿Qué medios de pago y cantidad de cuotas quiere ofrecer?
- ¿Quién absorbe comisión, cuotas y eventuales descuentos?
- ¿Cómo factura la venta y qué datos necesita antes/después del pago?

### Envíos

- ¿Ya tiene cuenta/acuerdo PAQ.AR o MiCorreo, ejecutivo asignado y credenciales QA?
- ¿Cuál es el código postal exacto de origen operativo?
- ¿Ofrecerá domicilio, sucursal, locker, retiro en taller o una combinación?
- ¿El cliente paga el costo real, una tarifa plana o Canela subsidia una parte?
- Para cada producto: peso y dimensiones **ya embalado**, no solo de la pieza.
- ¿Qué combinaciones caben juntas y cuándo hacen falta dos cajas?
- ¿Cuánto tarda en preparar/despachar y qué días trabaja?
- ¿Cómo embala vidrio/cerámica y qué tasa histórica de rotura tiene?

### Personalización

Responder la sección “Información necesaria del dueño para personalización”. Sin esas respuestas solo puede especificarse un flujo de consulta, no un archivo listo para fabricar.

## Puerta de salida del descubrimiento

Esta fase estará lista para redactar specs cuando:

- conozcamos el volumen/tráfico de referencia y la definición de éxito;
- esté definida la duración de la reserva y las reglas de reposición/reembolso;
- el dueño responda las preguntas operativas de envíos;
- Correo confirme contrato/API y acceso QA;
- se elija el alcance del primer flujo vendible;
- para reactivar personalización, el dueño confirme cuadrícula, paleta, medidas y precio de un primer cuadro de mosaico.

Después se crearán specs separadas para:

- `checkout-y-ordenes`;
- `inventario-y-reservas`;
- `envios-correo-argentino`;
- `personalizacion-asistida`;
- `analitica-de-conversion`;
- y ADRs para persistencia privada, estrategia de pagos pendientes y almacenamiento de archivos.
