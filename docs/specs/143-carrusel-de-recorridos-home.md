# PER-143 — Ambos recorridos en el carrusel de apertura

2026-10-27. Sustituye los banners apilados de la home de PER-142. No cambia
tienda, galería, creador, footer ni habilitación de cobros.

**Implementado.** [Evidencia](../evidence/PER-143.md).

## Diseño

- Una apertura de ancho completo alterna fotografía de productos y un cuadro
  de ejemplo. El cuadro aparece primero; las miniaturas de ambos recorridos
  permiten reconocerlos sin esperar ni desplazarse.
- Se conservan el mensaje aprobado y los dos accesos fijos. Solo los enlaces
  «Crear mi cuadro» y «Explorar la tienda» navegan. Los selectores cambian la
  imagen, nunca el destino de los botones.
- Canela mantiene crema `#fbf7ee`, marrón `#4a3527`, oliva `#59603e`, arena
  `#e7dfcb` y fondo cálido `#f1e2c6`. Mulish para bienvenida y controles.
  La escena clara permite ver el marco completo y sus venecitas; la foto usa
  contraste oscuro. No se agrega una segunda presentación del mismo cuadro.
- Composición centrada: mensaje → acciones → cuadro completo → miniaturas.
  La foto ocupa el fondo completo. Las dos acciones se apilan en móvil pequeño.
  Cuadro, botones y selectores caben desde 320 × 568 px; el contenido puede
  crecer con ampliación de texto sin superposición.
- Desvanecimiento de 700 ms; cambio automático cada 6 s. Hover en escritorio
  amplía la foto o inclina/eleva suavemente el cuadro. El cuadro conserva su
  flotación. No hay un botón de pausa.
- La rotación espera mientras hay hover, foco o interacción táctil, y cuando
  la pestaña está oculta. Con movimiento reducido no hay avance automático,
  flotación, zoom ni transición. Los selectores siguen disponibles.
- Gestos horizontales de una mano cambian de imagen; desplazamiento vertical
  y los enlaces conservan su función. Controles de al menos 44 px con nombres
  accesibles, estado seleccionado y foco visible. La imagen oculta queda fuera
  del árbol accesible y no captura interacción.
- Si el creador está deshabilitado solo se muestra la tienda, sin carrusel ni
  accesos a cuadros. Sin diseños publicados, el creador mantiene su acceso y
  presenta una invitación a usar una foto, sin inventar un cuadro disponible.

## Verificación

1. Estado inicial y selección manual muestran la imagen correcta; destinos
   constantes en todos los estados. No hay enlace envolviendo la escena.
2. Avance temporizado, interacción y visibilidad limpian/reanudan el timer;
   movimiento reducido conserva navegación manual. Desmontar limpia listeners.
3. Deslizar horizontal cambia; gesto vertical, multitouch y toques en acciones
   no cambian la imagen.
4. Gate y ausencia de imágenes/diseños tienen salida útil. Regresión de carrito
   y recorridos. Inspección visual móvil/escritorio, encuadre y hover.

Trabajo local en `codex/creador-cuadros-personalizados`, sin despliegue.
