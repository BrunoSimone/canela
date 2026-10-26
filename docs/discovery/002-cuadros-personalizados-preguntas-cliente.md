# Cuadros personalizados: decisiones y preguntas pendientes

## Estado

Descubrimiento actualizado el 2026-10-26. Bruno reactivó el trabajo del creador de cuadros en la rama `codex/creador-cuadros-personalizados`, separada de `main`. Se recibieron datos iniciales de Mariela; la geometría presenta una contradicción pendiente de aclaración. El precio se definirá en una etapa posterior, antes de habilitar ventas.

## Objetivo del producto

Automatizar el pedido de cuadros de mosaico personalizados sin presupuesto ni aprobación manual previa:

```text
El comprador carga una imagen
  -> el sistema la convierte a una cuadrícula fabricable
  -> el comprador ajusta el tamaño y observa el resultado
  -> las reglas automáticas impiden configuraciones no fabricables
  -> el comprador acepta la previsualización y paga
  -> se crea directamente la orden de producción
```

## Decisiones confirmadas

- **PER-DEC-001 — Técnica:** el producto inicial será un cuadro de mosaico regular con venecitas.
- **PER-DEC-002 — Tamaño variable:** no habrá un único tamaño predeterminado. El comprador podrá modificarlo dentro del mínimo y máximo que defina el taller.
- **PER-DEC-003 — Detalle controlado por el comprador:** una imagen que necesite más detalle requerirá una cuadrícula y, por tanto, un cuadro más grande. La previsualización se recalculará mientras el comprador ajusta el tamaño hasta quedar conforme.
- **PER-DEC-004 — Fabricabilidad automática:** el checkout solo permitirá diseños construidos con la cuadrícula, los tamaños y la paleta que el taller declaró fabricables. Una configuración fuera de esos límites no podrá pagarse.
- **PER-DEC-005 — Calidad visual subjetiva:** el sistema no decidirá si una imagen es lo bastante reconocible o estética. Si el diseño es físicamente válido, el comprador decide si la previsualización le satisface.
- **PER-DEC-006 — Sin aprobación manual previa:** no habrá revisión del artesano entre diseño y pago. La confirmación explícita de la previsualización por el comprador habilitará el checkout.
- **PER-DEC-007 — Orden automática:** un pago aprobado y verificado creará la orden de producción con un snapshot inmutable del diseño.
- **PER-DEC-008 — Precio postergado:** el precio comercial definitivo sigue pendiente. PER-131 autoriza una estimación de prueba con referencia de Mercado Libre y mano de obra/insumos supuestos; no habilita cobros. La aprobación del precio real sigue siendo obligatoria antes del checkout de personalizados.
- **PER-DEC-009 — Plazo y capacidad iniciales (2026-10-26):** Mariela informó una semana de fabricación y capacidad para cinco cuadros simultáneos. Antes de prometer una fecha, confirmar si el plazo aplica a todos los tamaños y definir cómo se manejan los pedidos cuando esos cinco lugares están ocupados. No interpretar este dato como aceptación ilimitada ni como cinco cuadros terminados por semana garantizados.
- **PER-DEC-010 — Diseño durante el uso del creador (2026-10-26):** el comprador selecciona su imagen y crea el cuadro en ese momento. No se guardan borradores entre sesiones ni se sincronizan entre dispositivos. La imagen original y el diseño en edición permanecen en memoria del navegador; no se suben a Sanity ni a un servicio de archivos y no se persisten en localStorage/IndexedDB. Recargar o cerrar el creador descarta ese trabajo. No se necesita contratar almacenamiento privado de imágenes.
- **PER-DEC-011 — Especificación del pedido:** al integrar ventas, el backend validará y guardará en la base de pedidos la cuadrícula aceptada, códigos y valores de color, medidas y copia/versiones de la configuración y del algoritmo. Se conservará antes de redirigir al pago para permitir su recuperación por el webhook; la fabricación se habilitará únicamente con pago verificado. Esa especificación inmutable permitirá reconstruir la previsualización y la guía de fabricación sin conservar la foto original ni depender de la configuración actual de Sanity. No constituye un servicio de borradores recuperables.
- **PER-DEC-012 — Configuración desacoplada (2026-10-26):** las medidas, límites y paleta son datos configurables del taller, independientes del motor. Bruno confirmó que se puede construir el creador con parámetros provisionales y ajustarlos después. La discrepancia física pendiente bloquea la aceptación para fabricación/venta, pero no el desarrollo ni las pruebas con configuraciones coherentes de ejemplo. Los centímetros se derivan de las piezas y juntas; no se fuerza una equivalencia con las medidas contradictorias informadas.
- **PER-DEC-013 — Galería de diseños comprados (2026-10-26):** incorporar una sección de la tienda que muestre diseños de cuadros comprados para que otros visitantes puedan partir de ellos y crear uno similar. Se reutiliza la cuadrícula guardada, sin exigir conservar la fotografía original ni guardar borradores entre sesiones.

## Galería de inspiración y reutilización

### Experiencia prevista

- Sección en la tienda con una selección de diseños publicados y acceso a la galería completa.
- Cada diseño muestra su mosaico, un título editorial y las medidas de referencia. La previsualización se reconstruye desde la cuadrícula y la paleta publicadas.
- La acción **Crear uno similar** abre el creador con una copia independiente de ese diseño. No exige volver a cargar la imagen original.
- Las variaciones usan las reglas actuales del taller. Cambiar la cuadrícula de una plantilla reutiliza el mosaico disponible como fuente; no recupera ni inventa detalle de la fotografía original.
- Antes de una nueva compra se validan materiales, medidas, plazo y precio vigentes. No se reutilizan precios ni condiciones de envío del pedido anterior, ni se modifica su especificación.
- Si una plantilla ya no puede fabricarse con la paleta/configuración vigente, se explica y se solicita una variante válida; nunca se sustituye un material silenciosamente para permitir el pago.

### Publicación propuesta

- El comprador puede autorizar que su mosaico se muestre y se ofrezca como base para nuevos cuadros mediante una opción explícita, desmarcada por defecto. No condiciona la compra.
- Los diseños con pago verificado y autorización quedan disponibles para selección editorial. Mariela decide cuáles publicar, su título y su orden desde Sanity; el pago no publica automáticamente el diseño.
- Sanity contiene únicamente la copia pública necesaria para mostrar/reutilizar el mosaico y sus campos editoriales. El vínculo al pedido y la evidencia de autorización permanecen en la base privada de pedidos; no se incluyen en el documento público ni en su respuesta al navegador.
- No se publican nombre, email, dirección, número de pedido, fotografía original ni otros datos del comprador. Una cuadrícula que represente una foto personal también requiere autorización para publicación/reutilización.
- Ocultar un diseño de la galería no altera pedidos ya realizados ni sus guías.
- Esta copia pública seleccionada es independiente del estado temporal del creador: se mantiene la decisión de no guardar borradores ni contratar almacenamiento de imágenes.

### Primera iteración

Construir y probar galería y apertura del creador con plantillas de demostración entregadas por el backend. Identificarlas como ejemplos durante las pruebas; no presentarlas como compras reales. La carga de pedidos reales, autorización y publicación editorial se conectarán al integrar ventas. Una galería pública sin diseños publicados se oculta o muestra un estado vacío útil, sin datos ficticios.

## Datos recibidos de Mariela — 2026-10-26

Fuente: datos transmitidos por Bruno en el chat. Se conservan las medidas informadas sin corregirlas por inferencia.

| Concepto | Dato recibido | Estado |
| --- | --- | --- |
| Venecita | 2,2 × 2,2 cm | Informado; pendiente reconciliar con cuadrícula y tamaños. |
| Junta entre venecitas | 1 mm | Informada. |
| Mínimo sin marco | 32 × 32 cm, 15 × 15 píxeles | Incompatible con venecitas de 2,2 cm y juntas de 1 mm. |
| Máximo sin marco | 96 × 96 cm, 45 × 45 píxeles | Incompatible con venecitas de 2,2 cm y juntas de 1 mm. |
| Marco | 1 cm | Los exteriores informados suman 2 cm por eje, consistente con 1 cm por lado. Falta confirmar si es fijo o elegible. |
| Exterior mínimo / máximo | 34 × 34 / 98 × 98 cm | Informados; dependen de resolver la medida útil del mosaico. |
| Cortes | Las venecitas van siempre enteras | Confirmado. |
| Fabricación | Una semana | Referencia inicial; alcance por tamaño y espera en cola pendientes. |
| Capacidad | Cinco cuadros a la vez | Capacidad simultánea informada. |

### Geometría pendiente de resolver

Para una fila de `N` venecitas enteras, con junta solamente entre piezas:

```text
ancho del mosaico = N × 22 mm + (N − 1) × 1 mm
```

| Cuadrícula | Lado informado sin marco | Lado calculado sin marco | Exterior calculado con marco de 1 cm por lado |
| --- | --- | --- | --- |
| 15 × 15 | 32 cm | 34,4 cm | 36,4 cm |
| 45 × 45 | 96 cm | 103,4 cm | 105,4 cm |

Estos cálculos son una comprobación, no nuevos tamaños aprobados. Incluso sin juntas, 15 piezas de 2,2 cm suman 33 cm y no entran en 32 cm. Debe confirmarse qué dato cambia: medida real de la venecita, cantidad de piezas por fila o lado útil del cuadro. Una fila medida o un cuadro terminado con regla y conteo permitiría resolverlo. No recortar, comprimir ni estirar venecitas para forzar la coincidencia; no habilitar diseños fabricables ni pagos sobre esta contradicción.

### Referencias de peso y tamaño del cuadro terminado

Bruno confirmó expresamente que los siguientes datos corresponden al cuadro terminado, **sin embalaje**:

| Tamaño | Ancho × alto informado | Peso informado |
| --- | --- | --- |
| Chico | 34 × 34 cm | 1,2 kg |
| Mediano | 66 × 66 cm | 4,8 kg |
| Grande | 98 × 98 cm | 10,8 kg |

No se informó la cuadrícula del mediano ni el espesor de ninguno. Estos pesos no son perfiles de envío. Antes de cotizar con Zipnova se necesitan las tres dimensiones exteriores y el peso total de los paquetes protegidos, más una regla validada para los tamaños intermedios. No interpolar los pesos ni reutilizarlos como peso embalado sin confirmación. El margen de seguridad del checkout se aplica después de estimar el paquete completo; no sustituye el peso de caja/protección ni las dimensiones faltantes.

## Regla central

La aplicación debe separar dos conceptos:

- **Fabricabilidad objetiva:** tamaño dentro de límites, cuadrícula válida, venecitas permitidas y colores disponibles. Si falla, se bloquea el checkout.
- **Satisfacción subjetiva:** semejanza, nivel de detalle y gusto del comprador. Se resuelve mediante la previsualización, no mediante aprobación manual ni una puntuación inventada por el sistema.

## Información que todavía necesitamos del cliente

### A. Cuadrícula y tamaños

1. Reconciliar las venecitas de 2,2 cm y junta de 1 mm con los tamaños y cantidades recibidos. Ver cálculo anterior.
2. Confirmar los mínimos/máximos fabricables después de resolver esa contradicción; no pedir nuevamente los valores ya recibidos como si faltaran.
3. ¿El taller acepta cualquier combinación dentro de esos límites o el tamaño debe avanzar en incrementos determinados por la venecita y la junta?
4. Venecitas enteras confirmado. Falta confirmar que se disponen siempre alineadas en la cuadrícula regular prevista.
5. Marco informado de 1 cm por lado. ¿Es fijo o elegible? La distinción entre mosaico útil y exterior está registrada arriba.

### B. Paleta fabricable

6. Entregar la lista cerrada de colores que el diseñador puede usar, con un nombre o código estable para cada uno.
7. Entregar una foto o muestra digital de cada color bajo iluminación semejante. Se usará para aproximar la previsualización, sabiendo que una pantalla no reproduce exactamente el vidrio.
8. ¿Todos los colores de esa lista pueden reponerse de forma estable? Si uno se agota, ¿cómo y quién lo deshabilita para impedir nuevas órdenes que lo utilicen?
9. Confirmar que, dentro de esa lista, no existen combinaciones incompatibles por espesor, textura o técnica. Si existen, indicar únicamente esas restricciones.

### C. Producción automatizada

10. Plazo informado: una semana. Confirmar si aplica a todos los tamaños y desde qué momento empieza a contar.
11. Capacidad informada: cinco cuadros simultáneos. Definir si, al llenarse, se pausa la venta o se acepta una cola con una fecha posterior explícita.
12. ¿Qué archivo necesita el artesano para producir sin reinterpretar el pedido: cuadrícula numerada, leyenda de colores, conteo de venecitas y/o impresión a escala?
13. ¿Quién recibe la orden de producción y por qué canal operativo?
14. ¿Qué variaciones manuales respecto de la previsualización son normales y deben explicarse al comprador antes de pagar?

### D. Datos necesarios antes de vender y enviar

15. Para cotizar mediante Zipnova, obtener peso total y tres dimensiones exteriores del paquete protegido según el cuadro. Los datos recibidos son del cuadro terminado; faltan embalaje, espesor y regla para tamaños intermedios. Puede ser una fórmula o una tabla por rangos validada por el taller.
16. ¿Existe algún tamaño que requiera embalaje, seguro o modalidad de entrega diferente?
17. ¿Desde qué momento no se puede cancelar una orden personalizada y qué sucede ante rotura, defecto o error de fabricación?

## Información postergada deliberadamente

No se pedirá todavía:

- fórmula o tabla de precios;
- precio por complejidad, urgencia o cantidad de colores;
- reglas para espejos, vitrales u otras técnicas;
- decisión sobre imágenes con marcas, personajes o derechos de terceros.

Estos puntos no son necesarios para validar el diseñador físico inicial. Precio, políticas de contenido y condiciones de venta deberán resolverse antes de aceptar pagos reales.
La publicación y reutilización de mosaicos se incorpora ahora al alcance de la galería descrita arriba; la autorización correspondiente deberá existir antes de publicar diseños de compradores.

## Evidencia mínima solicitada

Para evitar preguntas abstractas, pedir:

- una venecita medida junto a una regla y una muestra de la junta habitual;
- la paleta completa con nombres o códigos estables;
- un ejemplo de cuadro terminado con ancho, alto y cantidad de filas/columnas;
- si están disponibles, dos o tres imágenes originales junto con los cuadros resultantes para calibrar la previsualización.

Los datos físicos y de paleta permiten validar la configuración real del taller. Su ausencia no bloquea el desarrollo con fixtures identificados como provisionales. Los ejemplos adicionales mejoran la calibración.

## Datos mínimos para comenzar el spike técnico

El experimento puede comenzar con configuraciones de prueba coherentes y parametrizadas. Antes de considerar el resultado listo para fabricar, se reemplazarán por datos reales validados:

1. medida de venecita y junta coherentes con una cuadrícula física comprobada;
2. área mínima y máxima de mosaico reconciliadas con esa cuadrícula;
3. regla de celda entera/cortes (enteras confirmado; alineación pendiente);
4. paleta cerrada y muestras de color;
5. confirmación de restricciones entre colores/materiales;
6. formato de salida que necesita el artesano.

El spike debe demostrar conversión de imagen, cambio de tamaño, reducción a la paleta permitida y generación del archivo de producción. No incluirá precio, pago ni creación real de órdenes.

## Datos mínimos antes de activar ventas

Además de validar el spike, serán obligatorios:

- fórmula de precio aprobada;
- plazo y capacidad de producción;
- peso y dimensiones de embalaje;
- términos de aceptación de la previsualización y variación artesanal;
- política de cancelación, defecto y rotura;
- prueba de que el snapshot pagado produce exactamente el archivo recibido por el taller.

## Criterios preliminares de aceptación

- **CA-PER-001:** Dada una imagen y un tamaño permitido, la previsualización usa solamente celdas y colores incluidos en las reglas del taller.
- **CA-PER-002:** Cuando el comprador cambia el tamaño, el sistema recalcula la cuadrícula, las dimensiones físicas y la previsualización antes de permitir la confirmación.
- **CA-PER-003:** Dado un tamaño, color o combinación no fabricable, el sistema impide confirmar y pagar el diseño.
- **CA-PER-004:** Dado un diseño físicamente válido, el sistema no lo rechaza por una valoración subjetiva de semejanza o estética.
- **CA-PER-005:** Antes del pago, el comprador ve y acepta la previsualización que identifica la orden.
- **CA-PER-006:** Tras un pago aprobado y verificado, se crea una sola orden de producción con el diseño, tamaño, paleta y archivo de fabricación inmutables.
- **CA-PER-007:** Seleccionar, recortar y previsualizar una imagen no transmite su contenido ni persiste un borrador. Al recargar o cerrar el creador, el trabajo en edición se descarta.
- **CA-PER-008:** En la etapa de ventas, la especificación validada del pedido sobrevive a la redirección al proveedor de pago. La previsualización y guía se reconstruyen desde esa especificación sin la foto original, incluso si luego cambian los parámetros o colores del taller.
- **CA-PER-009:** El mismo motor funciona con distintas medidas de venecita, juntas, marco, límites y paletas, sin modificar su código. Una configuración provisional no habilita compras ni guías autorizadas para fabricación.
- **CA-PER-010:** La galería pública contiene únicamente diseños publicados, con pago verificado y autorización para exhibir/reutilizar. No expone datos del comprador, referencias privadas del pedido ni originales.
- **CA-PER-011:** Crear uno similar abre una copia del mosaico publicado sin requerir la foto original. Editarla no modifica la plantilla ni el pedido fuente; comprarla exige validación y cotización vigentes.
- **CA-PER-012:** Los ejemplos usados durante el desarrollo se identifican como demostración y no se presentan como compras reales. Un diseño oculto deja de aparecer en la galería pública.

## Iteración de paleta y precio de prueba (2026-10-26)

[PER-131](../specs/131-cuadros-paleta-cotizacion.md) amplía los colores de ejemplo a 32,
retira la guía de fabricación del creador público y agrega una estimación de precio
configurable y un resumen en memoria. Ningún importe de demostración puede cobrarse.
La futura guía corresponde exclusivamente al taller autenticado y al diseño pagado.
La previsualización pública no es una protección contra capturas/copias.
Compra separada recomendada por plazos/capacidad/envíos; propuesta consultada a Bruno.
