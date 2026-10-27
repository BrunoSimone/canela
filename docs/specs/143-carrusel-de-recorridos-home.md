# PER-143 — Ambos recorridos en el carrusel de apertura

2026-10-27. Sustituye los banners apilados de la home de PER-142. No cambia
tienda, galería, creador, footer ni habilitación de cobros.

**Implementado.** [Evidencia](../evidence/PER-143.md).

## Diseño

- Una apertura de ancho completo alterna fotografía de productos y un cuadro
  de ejemplo. El cuadro aparece primero, con una copia ampliada y desenfocada
  de su imagen como fondo de ancho completo. No hay selectores inferiores.
- Se conservan el mensaje aprobado y los dos accesos fijos. Solo los enlaces
  «Crear mi cuadro» y «Explorar la tienda» navegan; sus destinos no cambian
  cuando avanza el carrusel.
- Canela mantiene crema `#fbf7ee`, marrón `#4a3527`, oliva `#59603e`, arena
  `#e7dfcb` y fondo cálido `#f1e2c6`. Mulish para bienvenida y controles.
  Ambas escenas usan texto crema y una capa oscura para mantener el contraste.
  El cuadro conserva el marco completo y las venecitas nítidas en primer plano.
  El fondo desenfocado es decorativo y queda fuera del árbol accesible.
- Composición centrada: mensaje → acciones → cuadro completo.
  La foto ocupa el fondo completo. Las dos acciones se apilan en móvil pequeño.
  Cuadro y botones caben desde 320 × 568 px; el contenido puede
  crecer con ampliación de texto sin superposición.
- Desvanecimiento de 700 ms; cambio automático cada 6 s. Hover en escritorio
  amplía la foto o inclina/eleva suavemente el cuadro. El cuadro conserva su
  flotación. No hay un botón de pausa.
- La rotación sigue aunque el cursor o el foco estén en la apertura. Solo
  espera durante un gesto táctil o cuando la pestaña está oculta. Con movimiento
  reducido no hay avance automático, flotación, zoom ni transición; los dos
  accesos permanecen visibles y el gesto horizontal sigue disponible.
- Gestos horizontales de una mano cambian de imagen; desplazamiento vertical
  y los enlaces conservan su función. Enlaces de al menos 44 px con nombres
  accesibles y foco visible. La imagen oculta queda fuera
  del árbol accesible y no captura interacción.
- Si el creador está deshabilitado solo se muestra la tienda, sin carrusel ni
  accesos a cuadros. Sin diseños publicados, el creador mantiene su acceso y
  presenta una invitación a usar una foto, sin inventar un cuadro disponible.

## Verificación

1. Estado inicial y avance automático muestran la imagen correcta; destinos
   constantes en todos los estados. No hay enlace envolviendo la escena.
2. Avance temporizado incluso con hover/foco; gesto táctil y visibilidad
   limpian/reanudan el timer. Movimiento reducido conserva ambos accesos. Desmontar limpia listeners.
3. Deslizar horizontal cambia; gesto vertical, multitouch y toques en acciones
   no cambian la imagen.
4. Gate y ausencia de imágenes/diseños tienen salida útil. Regresión de carrito
   y recorridos. Inspección visual móvil/escritorio, encuadre y hover.

Trabajo local en `codex/creador-cuadros-personalizados`, sin despliegue.
