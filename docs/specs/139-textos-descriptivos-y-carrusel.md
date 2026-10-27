# PER-139 — Textos descriptivos y carrusel sin pausa manual

2026-10-27 · Rama `codex/creador-cuadros-personalizados`.
Estado: implementado y verificado localmente. [Evidencia](../evidence/PER-139.md).

## Alcance

- Eliminar el accionable de pausa/reanudación y su estado. La rotación automática
  continúa después de seleccionar una diapositiva o enfocar su enlace.
- Conservar los selectores de diapositiva y respetar la preferencia del sistema
  de movimiento reducido. Reiniciar el intervalo al elegir una diapositiva para
  que pueda verse durante el mismo tiempo que las demás.
- Sustituir frases promocionales, metáforas y eslóganes por descripciones e
  instrucciones breves en home, galería, creador, resumen, carrito y mantenimiento.
- Conservar información necesaria para decidir: materiales, ubicación, precio,
  medidas, advertencias de prueba, errores y pasos de compra.
- Los datos editoriales reales de los productos siguen administrándose en Sanity.
  Los ejemplos del creador reciben nombres y descripciones literales.

## Aceptación

1. No hay botón, ícono, etiqueta accesible ni estado manual de pausa del carrusel.
2. Autoplay y selección funcionan; enfocar o seleccionar no detiene la rotación.
3. Los encabezados describen la sección: catálogo, cuadros personalizados,
   galería, creación, resumen o instrucciones de compra. Sin eslóganes emocionales.
4. Móvil y escritorio conservan navegación, imágenes, colores y composición.
5. Spec PER-138 queda corregida en sus requisitos de pausa y tono editorial.
