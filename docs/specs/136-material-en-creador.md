# PER-136 — Material simulado en el creador

2026-10-27 · Rama `codex/creador-cuadros-personalizados`.
Extiende PER-133/134/135. El usuario pide quitar la representación plana del cuadro.
Estado: implementado y verificado localmente. [Evidencia](../evidence/PER-136.md).

## Alcance y experiencia

- Una única representación de las venecitas: bisel, brillo suave desde arriba a
  la izquierda y grano sutil. El componente compartido mantiene ese aspecto en
  creador, editor, galería y resumen de compra. Sin selector plano/material.
- Mantener las 62 referencias Murvi, el algoritmo, matriz, geometría, retoques,
  cantidades y precio. El recorte original sigue disponible para encuadrar la foto.
- Paleta de selección y leyenda conservan las muestras de color identificables.
- Mantener la composición y tipografía actuales (Mulish, marco #72523c,
  junta #e8dfcc, selección blanca/marrón). El relieve pertenece a la imagen,
  sin nuevos controles que distraigan del zoom o de la edición.
- Avisar de que acabado y colores son orientativos. El efecto es genérico:
  no garantiza color físico, transparencia Vitro ni acabado de una partida.

## Rendimiento y navegación

- Definiciones SVG compartidas por instancia y una capa repetida sobre la matriz;
  el número de nodos decorativos no crece por venecita. Sin filtros por pieza,
  imágenes remotas, fotos incrustadas en las piezas ni nuevas dependencias.
- IDs únicos entre cuadros para evitar colisiones de gradientes/patrones.
- La decoración no recibe eventos y no cambia coordenadas de selección.
- Mantener SVG memoizado y gestos agrupados por animation frame. Pan, zoom y
  selección no reescriben la matriz. Pintar modifica solo la celda correspondiente.
- Zoom 1–8×, pan, pellizco, cancelación, deshacer/rehacer/restaurar, foco y controles
  táctiles continúan funcionando. Se conserva nitidez al ampliar.

## Criterios y pruebas

1. Vista material por defecto, mismos colores/posiciones para todas las celdas;
   ausencia de filtros y carga de imágenes, nodos decorativos acotados a 45×45.
2. Varias instancias resuelven sus propios recursos, también al renderizar HTML.
3. Edición de una pieza Murvi, undo/redo/restaurar, cierre/reapertura y resumen
   conservan matriz y aspecto; sin alteraciones de precio ni cobros reales.
4. Grilla 45×45: zoom/pan/pinch/cancel no pintan ni seleccionan por accidente;
   selección correcta con zoom, sin mutaciones del SVG durante navegación.
5. QA visual en escritorio y ancho móvil, controles accesibles y sin desborde.
   Registrar límites: emulación de ancho no equivale a rendimiento medido en
   un teléfono físico.
