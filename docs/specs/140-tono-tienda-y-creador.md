# PER-140 — Tono cercano en tienda y creador

2026-10-27 · Rama `codex/creador-cuadros-personalizados`.
Estado: implementado localmente. [Evidencia](../evidence/PER-140.md).

## Objetivo

Extender el tono aprobado en PER-139 al recorrido público completo. Invitar a
elegir, diseñar y comprar con palabras cotidianas, sin clichés ni explicaciones
de implementación. Mantener instrucciones precisas cuando hay dinero, cambios
que se pierden, datos personales o limitaciones de la versión de prueba.

## Alcance

- Presentación del taller, carrito, categorías vacías, compra y estado del pago.
- Carga y encuadre de fotos, tamaños, colores, editor de venecitas, resumen y
  compra simulada del cuadro, incluidos sus mensajes de error visibles.
- Mantenimiento y descripción general del sitio.
- Revisar también los textos accesibles, sin reemplazar nombres claros por
  frases ingeniosas. Voseo argentino consistente.
- Conservar los textos ya claros. Los nombres y descripciones de productos que
  administra Mariela en Sanity no se reescriben en el CMS en esta iteración.

## Aceptación

1. Las invitaciones hablan de elegir una foto o una pieza y probar el resultado.
2. No se muestran explicaciones sobre servidores, producción o capacidad interna
   cuando basta indicar qué pasó y cómo seguir.
3. Sigue siendo explícito que los cuadros están en prueba, sin cobros, envíos ni
   reservas reales; el diseño se pierde al salir o recargar. No se promete una
   coincidencia exacta de color ni plazos definitivos.
4. Los estados de pago conservan sus diferencias y la advertencia de no pagar
   otra vez cuando el resultado todavía no está confirmado.
5. No cambia la lógica, la paleta, el zoom, el checkout ni la distribución actual.
   La nueva home y la separación del catálogo se documentan como propuesta
   independiente en PER-141.

## Verificación

Ejecutar los tests existentes que cubren los recorridos afectados y actualizar
solo las expectativas de texto que lo necesiten. Lint, TypeScript y revisión
visual en móvil y escritorio. No agregar tests que solo repitan el copy.
