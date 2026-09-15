# Cuadros personalizados: decisiones y preguntas pendientes

## Estado

Descubrimiento actualizado el 2026-09-14. La personalización continúa fuera del roadmap activo hasta terminar pagos y envíos. El precio se definirá en una etapa posterior, antes de habilitar ventas.

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
- **PER-DEC-008 — Precio postergado:** la fórmula de precio no se consulta todavía. Será una puerta obligatoria antes de implementar el checkout de personalizados.
- **PER-DEC-009 — Plazo pendiente:** todavía necesitamos conocer el tiempo de fabricación y la capacidad del taller para poder prometer una fecha.

## Regla central

La aplicación debe separar dos conceptos:

- **Fabricabilidad objetiva:** tamaño dentro de límites, cuadrícula válida, venecitas permitidas y colores disponibles. Si falla, se bloquea el checkout.
- **Satisfacción subjetiva:** semejanza, nivel de detalle y gusto del comprador. Se resuelve mediante la previsualización, no mediante aprobación manual ni una puntuación inventada por el sistema.

## Información que todavía necesitamos del cliente

### A. Cuadrícula y tamaños

1. ¿Cuánto mide una venecita y cuál es la separación de junta utilizada? Necesitamos obtener el paso real de cada celda y convertir filas/columnas a centímetros.
2. ¿Cuál es el ancho y alto mínimo y máximo fabricable del área de mosaico?
3. ¿El taller acepta cualquier combinación dentro de esos límites o el tamaño debe avanzar en incrementos determinados por la venecita y la junta?
4. Para este producto inicial, ¿cada celda representa una venecita entera, alineada y sin cortes? Si no, necesitamos la regla exacta permitida.
5. ¿El marco es fijo o elegible? ¿Qué parte de la medida corresponde al mosaico útil y qué parte al marco?

### B. Paleta fabricable

6. Entregar la lista cerrada de colores que el diseñador puede usar, con un nombre o código estable para cada uno.
7. Entregar una foto o muestra digital de cada color bajo iluminación semejante. Se usará para aproximar la previsualización, sabiendo que una pantalla no reproduce exactamente el vidrio.
8. ¿Todos los colores de esa lista pueden reponerse de forma estable? Si uno se agota, ¿cómo y quién lo deshabilita para impedir nuevas órdenes que lo utilicen?
9. Confirmar que, dentro de esa lista, no existen combinaciones incompatibles por espesor, textura o técnica. Si existen, indicar únicamente esas restricciones.

### C. Producción automatizada

10. ¿Cuánto tarda normalmente la fabricación según el tamaño o la cantidad de celdas?
11. ¿Cuántos cuadros personalizados puede tener el taller simultáneamente o producir por semana? Este límite evita aceptar más pedidos de los que puede cumplir.
12. ¿Qué archivo necesita el artesano para producir sin reinterpretar el pedido: cuadrícula numerada, leyenda de colores, conteo de venecitas y/o impresión a escala?
13. ¿Quién recibe la orden de producción y por qué canal operativo?
14. ¿Qué variaciones manuales respecto de la previsualización son normales y deben explicarse al comprador antes de pagar?

### D. Datos necesarios antes de vender y enviar

15. Para estimar Correo Argentino, ¿cómo se obtienen el peso y las dimensiones del paquete protegido a partir del tamaño del cuadro? Puede ser una fórmula o una tabla por rangos.
16. ¿Existe algún tamaño que requiera embalaje, seguro o modalidad de entrega diferente?
17. ¿Desde qué momento no se puede cancelar una orden personalizada y qué sucede ante rotura, defecto o error de fabricación?

## Información postergada deliberadamente

No se pedirá todavía:

- fórmula o tabla de precios;
- precio por complejidad, urgencia o cantidad de colores;
- reglas para espejos, vitrales u otras técnicas;
- autorización para publicar trabajos terminados;
- decisión sobre imágenes con marcas, personajes o derechos de terceros.

Estos puntos no son necesarios para validar el diseñador físico inicial. Precio, políticas de contenido y condiciones de venta deberán resolverse antes de aceptar pagos reales.

## Evidencia mínima solicitada

Para evitar preguntas abstractas, pedir:

- una venecita medida junto a una regla y una muestra de la junta habitual;
- la paleta completa con nombres o códigos estables;
- un ejemplo de cuadro terminado con ancho, alto y cantidad de filas/columnas;
- si están disponibles, dos o tres imágenes originales junto con los cuadros resultantes para calibrar la previsualización.

Solo los tres primeros elementos bloquean la definición de la cuadrícula fabricable. Los ejemplos adicionales mejoran la calibración, pero no deberían detener el spike.

## Datos mínimos para comenzar el spike técnico

El experimento del diseñador puede comenzar cuando tengamos:

1. medida de venecita y junta;
2. área mínima y máxima de mosaico;
3. regla de celda entera/cortes;
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
