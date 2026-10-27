# PER-138 — Home y paleta pública

2026-10-27 · Rama `codex/creador-cuadros-personalizados`.
Estado: implementado y verificado localmente. [Evidencia](../evidence/PER-138.md).

## Alcance

- Presentar los 62 tonos existentes con nombres descriptivos de Canela. Conservar
  sus valores HEX, orden y correspondencia con los materiales del taller.
- Mantener proveedor, códigos y procedencia en infraestructura: no enviarlos en
  configuración, plantillas, matrices ni respuestas públicas de la compra de prueba.
  Los identificadores públicos son estables y no derivan del código del proveedor.
- Eliminar referencias comerciales del proveedor también de textos, ayudas,
  etiquetas accesibles y atributos del DOM. Informar que los colores y el acabado
  son orientativos y que los tonos transparentes dependen de la base.
- Home: acceso principal al creador desde el hero; presentación visual del mosaico
  antes del catálogo y accesos claros a galería y categorías. Conservar identidad
  cromática, tipografías, carrusel, anillos y animaciones existentes.
- Sustituir el texto visible de pausa/reanudación por un ícono con nombre accesible.
  Mantener control manual, pausa al enfocar y respeto de movimiento reducido.
- Respetar la disponibilidad del feature: no promocionar rutas deshabilitadas ni
  habilitar cobros reales. Los diseños de muestra y la condición de prueba se indican.

## Aceptación

1. Configuración y plantillas públicas no contienen marca, códigos ni URLs del
   proveedor. Cada referencia pública conserva exactamente su HEX y material.
2. Los 62 colores siguen disponibles para generación, reemplazo, retoque, deshacer,
   redimensionado y compra simulada. La versión cambia para rechazar sesiones viejas
   con una indicación de recargar, evitando reinterpretar sus referencias.
3. El hero ofrece creador y catálogo cuando el feature está activo; sin él, la tienda
   conserva su navegación y no enlaza al creador. La galería también es alcanzable.
4. El carrusel se pausa/reanuda con teclado o puntero, sin texto visible de pausa.
5. QA en escritorio, tablet y celular de 375 y 320 px: jerarquía legible, enlaces
   funcionales, objetivos táctiles cómodos y ausencia de desborde horizontal.

## Límite

La generación sigue siendo local: el navegador necesita los tonos y la matriz
del diseño. Este cambio oculta referencias del taller, no promete hacer secreto
un algoritmo que se ejecuta en el dispositivo del comprador.
