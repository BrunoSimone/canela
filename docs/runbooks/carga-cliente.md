# Carga de catálogo, embalajes e inventario

## Sanity

Abrir https://canela-artesanal.sanity.studio e ingresar con la cuenta invitada al
proyecto Canela. El catálogo conserva todos los productos y fotos existentes.

1. Abrir el producto en su categoría. En **Datos del producto**, completar nombre,
   categoría, subcategoría, precio, descripción y fotos. La descripción es opcional;
   la primera foto es la portada. La subcategoría alimenta los filtros de la tienda.
2. En **Producto → Envío → Unidad protegida para envío**, pesar UNA pieza con la protección individual
   que realmente se usará (papel, separadores o protección específica), sin la caja
   exterior compartida. Cargar gramos enteros. Medir alto, ancho y largo de esa
   unidad protegida en centímetros enteros, redondeando hacia arriba.
3. Elegir **Contenido del envío** según la pieza: **Vidrio, espejos o cuadros con
   vidrio**, o **Cerámica decorativa o cuadros sin vidrio**. Pisos/revestimientos
   y bachas tienen sus propias opciones. No hay una selección por defecto;
   sin contenido no se puede cotizar. Los códigos del transporte son internos.
4. Abrir **Acomodo de la pieza** solo si hace falta indicar giro, apilado o caja
   exclusiva. Mantener desactivado el apilado si no está comprobado que la
   protección admite otras piezas encima. El giro conserva la pieza vertical.
   Activar caja exclusiva únicamente para piezas que no pueden compartir caja.
5. Pulsar **Publicar**. Guardar un borrador no actualiza la tienda.

### Detalles opcionales

En **Datos del producto → Detalles opcionales** quedan las medidas sin envolver
y el material. No hay modalidad ni etiqueta manual de disponibilidad: las
unidades de la pestaña **Stock** determinan si se puede comprar. Para una pieza
que tiene una sola unidad, cargar 1; para una reposición, cargar la cantidad real.

Las medidas sin envolver son información opcional para el comprador. No copiar
allí las medidas protegidas del envío: describen cosas diferentes.

En **Cajas de envío**, crear cada tamaño que efectivamente usará el taller:

- Nombre fácil de reconocer (por ejemplo, el código del proveedor de cajas).
- Medidas interiores útiles, descontando revestimiento/protección de paredes.
- Medidas exteriores con la caja cerrada.
- Peso de caja, cinta y relleno común SIN productos ni sus protecciones individuales.
- Peso máximo total que la caja soporta y disponibilidad para preparar pedidos.

No introducir valores aproximados para desbloquear el checkout. El sistema
selecciona una caja y calcula posiciones, peso y dimensiones para cotizar. Si no
encuentra una combinación segura, impide iniciar el pago.

## Stock: en la misma ficha de Sanity

1. Abrir el producto y seleccionar la pestaña **Stock**, junto a **Producto**.
2. Cargar **Unidades aún no vendidas**: incluir las que están reservadas por un
   pago pendiente y excluir las de pedidos ya pagados, aunque sigan en el taller.
3. Activar **Habilitar venta** cuando corresponda, escribir un motivo y pulsar
   **Guardar stock**. El cambio es inmediato; no requiere publicar el producto.
4. La ficha muestra **Sin vender**, **Reservadas** y **Disponibles**. Una compra
   reserva unidades; un pago aprobado las descuenta y uno rechazado las libera.
5. Si aparece un conflicto, **Actualizar stock** antes de corregir nuevamente.
   Las reservas no se pueden eliminar mediante un ajuste.
6. La tienda calcula **disponibles = sin vender − reservadas**. Si quedan cero,
   muestra **Agotado** y deshabilita la compra. Si hay unidades, permite agregarlas
   sin una etiqueta manual. **Habilitar venta** permite pausar la oferta de una
   pieza sin falsear sus cantidades; las piezas pausadas no aparecen.
7. **Ver últimos ajustes** muestra quién cambió el stock y por qué.

Sanity almacena las cantidades y reservas. Publicar un borrador de fotos, precio
u otros datos del producto no modifica el stock. El panel de Canela se usa para
pedidos, preparación y despacho. La antigua ruta de inventario redirige a Sanity.

La pantalla administrativa y Sanity siguen accesibles mientras la tienda está en
mantenimiento. Completar datos no abre ventas automáticamente.
