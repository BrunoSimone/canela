# PER-139 — Textos descriptivos y carrusel sin pausa manual

2026-10-27 · Rama `codex/creador-cuadros-personalizados`.
Estado: implementado y verificado localmente. [Evidencia](../evidence/PER-139.md).

## Alcance

- Eliminar el accionable de pausa/reanudación y su estado. La rotación automática
  continúa después de seleccionar una diapositiva o enfocar su enlace.
- Conservar los selectores de diapositiva y respetar la preferencia del sistema
  de movimiento reducido. Reiniciar el intervalo al elegir una diapositiva para
  que pueda verse durante el mismo tiempo que las demás.
- Retirar clichés, metáforas genéricas y eslóganes vacíos en home, galería,
  creador, resumen, carrito y mantenimiento. Mantener un tono cercano que invite
  a explorar y comprar: quitar frases trilladas no implica escribir como un manual.
- Usar descripciones concretas y verbos cotidianos («elegí», «probá», «subí»).
  Presentar las posibilidades del producto sin promesas exageradas; reservar
  los detalles técnicos para las instrucciones donde sean útiles.
- Conservar información necesaria para decidir: materiales, ubicación, precio,
  medidas, advertencias de prueba, errores y pasos de compra.
- Los datos editoriales reales de los productos siguen administrándose en Sanity.
  Los ejemplos del creador reciben nombres y descripciones literales.

## Aceptación

1. No hay botón, ícono, etiqueta accesible ni estado manual de pausa del carrusel.
2. Autoplay y selección funcionan; enfocar o seleccionar no detiene la rotación.
3. Los encabezados describen la sección: catálogo, cuadros personalizados,
   galería, creación, resumen o instrucciones de compra. Los textos de presentación
   invitan a probar el producto con lenguaje natural, sin clichés ni tono robótico.
4. Móvil y escritorio conservan navegación, imágenes, colores y composición.
5. Spec PER-138 queda corregida en sus requisitos de pausa y tono editorial.
