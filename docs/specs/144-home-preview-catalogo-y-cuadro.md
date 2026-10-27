# PER-144 — Fondo de catálogo en el carrusel de inicio

2026-10-27. Ajuste de PER-143 a pedido del usuario: se restaura su composición
con carrusel; se descarta la distribución de dos paneles con productos y cuadro.

## Alcance

- Se mantienen la bienvenida, los dos accesos fijos, la escena del cuadro,
  su movimiento y el carrusel automático de la iteración anterior.
- La escena de tienda usa una preview completamente desenfocada de fotos reales
  del catálogo, ocupando todo el fondo. No hay una pieza nítida en primer plano.
- Grilla de cinco filas: cinco columnas en escritorio, cuatro en tablet y tres
  en móvil. El fondo excede sus bordes para que el desenfoque no deje franjas.
  Una capa oscura preserva la legibilidad de bienvenida y botones.
- Hasta 25 productos disponibles, con imagen y precio válido; se procura variedad
  entre categorías. La home y la tienda comparten las reglas de disponibilidad.
  Si hay menos de 25 fotos se repiten únicamente como textura decorativa.
- No se muestran precios, nombres ni acciones de productos en este fondo; las
  fotos quedan fuera del árbol accesible. Los destinos siguen siendo `/tienda`
  y `/crear-cuadro`, sin añadir piezas al carrito desde la home.
- Se conserva el cambio cada 6 segundos, incluso con hover/foco; espera durante
  gestos táctiles y cuando la pestaña está oculta. Swipe horizontal disponible.
  Sin selector inferior ni control de pausa. Movimiento reducido desactiva
  avance automático, flotación y zoom. Hover amplía levemente la grilla.
- Si no se puede cargar el catálogo, la navegación sigue disponible sobre el
  fondo de marca. El gate del creador y la ausencia de diseños conservan las
  salidas descritas en PER-143. Sin cambios en tienda, galería, checkout o footer.

## Verificación

1. Selección de fotos reales: stock disponible, precio/foto válidos, límite de
   25 productos, variedad y ausencia de duplicados en la selección.
2. El fondo decorativo se completa sin enlaces ni productos inventados; si no
   hay fotos, los accesos siguen disponibles. No aparecen códigos de proveedores.
3. Se conservan las pruebas de rotación, foco, gestos, pestaña oculta, movimiento
   reducido y gate; navegación a ambos recorridos y persistencia del carrito.
4. Inspección en escritorio y móviles, incluyendo 320 px: grilla adaptada,
   sin desbordes; texto, botones y cuadro conservan su composición anterior.

Verificado: 37 tests en cinco suites de home/navegación, TypeScript y lint.
Revisión visual a 1440 × 900, 375 × 812 y 320 × 568; sin desbordes.

Trabajo local en `codex/creador-cuadros-personalizados`, sin despliegue.
