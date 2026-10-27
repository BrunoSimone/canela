# PER-137 — Vista del cuadro durante los ajustes y precio único

2026-10-27 · Rama `codex/creador-cuadros-personalizados`.
Estado: implementado y verificado localmente. [Evidencia](../evidence/PER-137.md).

## Alcance

- Mantener a la vista el mosaico completo mientras se cambia tamaño o encuadre.
  En escritorio/tablet ancho, controles y cuadro conviven en dos columnas con
  vista previa sticky. En celular vertical, cuadro compacto sticky sobre los
  controles. En horizontal bajo, dos columnas para aprovechar el ancho.
- Separar estadísticas, leyenda, precio y paso al resumen del área de ajustes,
  para que no empujen la imagen fuera de pantalla. Mantener el acceso a retoques.
- Adaptar la altura de cuadro y recortador a la ventana y respetar la barra de
  navegación. Sin duplicar matriz/SVG ni introducir listeners de scroll.
- Ajustar tamaño, recorte o zoom de la foto vuelve a mostrar el mosaico si estaba
  seleccionada la comparación con el original. Mantener guardas de retoques.
- Resumen: mostrar solo el precio del cuadro con marco, sin importes de venecitas,
  mano de obra, insumos o redondeo. Conservar el envío y total cuando corresponden.
  El cálculo interno y los precios totales siguen iguales.

## Diseño

Conservar Mulish, colores y controles de Canela; el mosaico con material Murvi
sigue siendo la referencia visual. Evitar que el panel sticky cubra los controles
activos o reduzca la imagen a una miniatura. El resumen comercial queda debajo.

## Aceptación

1. Cambiar tamaño, arrastrar encuadre y acercar la foto mantiene mosaico y control
   activo visibles: escritorio, tablet, 375/320 px vertical y celular horizontal.
2. Imagen sin deformación, completa y sin desborde horizontal; ventanas bajas
   disponen de scroll para alcanzar todos los controles. Sin alterar el editor modal.
3. Recorte → ajuste devuelve vista al mosaico. Retoques/confirmación, reinicio,
   carga, precio y compra simulada siguen funcionando.
4. Revisar cuadro y resultado de compra no muestran costos internos; importes
   finales y envío coinciden con los cálculos existentes.
5. Tests de flujos y QA visual con límites y evidencia documentados.
