# PER-131 — Paleta ampliada y estimación del cuadro

2026-10-26 · Rama `codex/creador-cuadros-personalizados`.
Extiende y reemplaza los puntos de PER-130 sobre paleta, guía pública y ausencia de precio.

## Problema y alcance

La paleta de diez colores desplaza grises y pieles hacia verdes/azules. El creador
expone una guía de fabricación que corresponde al taller y no permite evaluar el
precio del cuadro. Bruno solicita una paleta más amplia, repetir las mismas fotos,
una estimación con referencia de Mercado Libre y evaluar cómo comprar personalizados.

1. Paleta provisional de 32 colores: conservar los diez IDs/hex anteriores y sumar
   grises, claros, oscuros y tonos de piel. No modificar el algoritmo de conversión.
2. Repetir mascota, pareja y familia a 15, 30 y 45 celdas, conservando originales,
   recorte centrado y resultados anteriores. Comparación antes/después local.
3. Retirar el generador/exportador de guía del código público y los conteos por
   color. La vista del cuadro sigue siendo visible: no se promete protección contra
   capturas o copia. La futura guía se genera exclusivamente desde el pedido pagado,
   detrás de autenticación/autorización de Mariela, nunca desde datos enviados sin validar.
4. Precio estimado visible y actualizado al cambiar tamaño, incluso sin imagen.
   Configuración de precios recibida del repositorio de servidor, separada de la
   geometría. Cálculo puro en centavos; redondeo final hacia arriba al millar de ARS.
5. Referencia provisional: publicación MLA-1135539551, 225 piezas por ARS 13.917,50
   (resultado indexado consultado el 26/10/2026; apertura directa devuelve 403).
   No es una cotización de compra vigente ni confirma los 32 colores del taller.
6. Supuestos para UI: mano de obra ARS 20.000/60.000/120.000 y base, marco e insumos
   ARS 8.000/16.000/26.000 para 15/30/45 celdas. Interpolación por cantidad de piezas
   entre anclas. Referencias reemplazables; no tarifas aprobadas por Mariela.
7. No incluir envío ni inventar peso/espesor embalado. Sin pagos, reservas,
   persistencia de imágenes/diseños ni cambios en stock o producción.
8. Recorrido de compra separado recomendado; decisión consultada a Bruno. El
   resumen previo puede funcionar en memoria, indicando que no crea un pedido.
   Confirmar diseño, precio final, plazo/cupo, paquete y envío antes de habilitar cobro.

## Criterios verificables

| ID | Dado / cuando / entonces |
| --- | --- |
| 131-01 | Dadas las plantillas anteriores, ampliar la paleta mantiene todos sus colores y permite reutilizarlas. Grises y pieles exactos se convierten sin sustitución cromática. |
| 131-02 | Dado un tamaño válido, la estimación usa N² piezas, mano de obra e insumos configurados. Los límites y tamaños intermedios son deterministas y el total no disminuye al aumentar el tamaño. |
| 131-03 | Configuración inválida, negativa, sin cobertura, con límites inconsistentes o importes inseguros falla explícitamente; nunca ofrece total cero ni envío gratis. |
| 131-04 | Cambiar imagen/colores no modifica el precio para un mismo tamaño; cambiar tamaño actualiza precio. La interfaz comunica ARS, carácter provisional y envío pendiente. |
| 131-05 | En el creador no existen guía, impresión, descarga ni detalle de cantidad por color; no queda código exportador en el paquete público. |
| 131-06 | Resumen de prueba conserva diseño y precio al volver a editar; al reiniciar/salir se descarta. No escribe en carrito ni llama pagos, envío o creación de pedidos. |
| 131-07 | Las 9 conversiones se inspeccionan en navegador; se conserva comparación anterior y no se presenta una mejora subjetiva como porcentaje de calidad. |
| 131-08 | Creador/resumen utilizables en escritorio y móvil, teclado, sin desborde; producción sigue bloqueada. |

## Recorrido comercial recomendado

Diseño → revisar cuadro → cotización de envío → pago de este cuadro → fabricación
→ despacho. Antes del pago, guardar una especificación inmutable validada en servidor
(matriz/paleta/geometría/versiones/precio) y reservar capacidad con vencimiento. El
webhook de pago confirmado habilita fabricación una sola vez. La guía pertenece al
panel autenticado del taller. No guardar el original ni borradores entre sesiones.

Un carrito mixto requiere decidir si se retiene el stock una semana o se separan
envíos con sus cargos/estados. El checkout actual solo resuelve IDs de productos
Sanity y reservas de stock; un personalizado no debe fingir ser un SKU disponible.
Reutilizar infraestructura de Mercado Pago/Zipnova y pedidos es posible, pero requiere
un tipo de línea personalizada y un ciclo de fabricación explícito.

Referencias (patrones, no reglas obligatorias para Canela):
- [Etsy: artículos personalizados](https://help.etsy.com/hc/en-us/articles/115015663107-How-to-Offer-Custom-Items): acordar diseño/costo antes de una publicación privada comprable.
- [Shopify: preventas](https://help.shopify.com/en/manual/products/purchase-options/pre-orders/setup): condiciones/plazos visibles y aceptación en checkout; mezclar fechas exige reglas adicionales.
- [Mercado Libre: plancha de 225](https://articulo.mercadolibre.com.ar/MLA-1135539551-plancha-de-venecitas-colores-2-x-2cm-x-225-u-mosaiquismo-_JM).

Pendiente de taller: paleta/medidas, precios finales (incluidos margen/comisiones),
embalaje, disponibilidad y plazo. No usar los importes de demostración para cobrar.
