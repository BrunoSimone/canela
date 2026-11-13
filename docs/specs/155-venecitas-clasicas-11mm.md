# PER-155 — Venecitas de 11 mm y paleta Clásica

30/10/2026. Rama del creador. Sustituye el formato y selección de colores de
PER-134/PER-153 para diseños nuevos. Mantenimiento permanece activo.

## Definiciones autorizadas

- Venecita de 11 × 11 mm, junta de 1 mm, marco negro incluido de 10 mm por lado.
- Mínimo 15 × 15; máximo confirmado por Bruno 90 × 90; todos los tamaños enteros.
- Clásico del catálogo aportado: 38 muestras menos M.24 y C.50 = 36 colores.
  No agregar las líneas Vitro/Nuevo ni otros tonos ajenos al catálogo aportado.
- IDs públicos estables y nombres habituales; no exponer proveedor/códigos.
- El color sigue siendo una aproximación de las texturas del fabricante; se
  conserva el aviso de diferencias entre partidas y pantallas.

## Integridad y funcionamiento

La selección se define una sola vez en servidor. Generador, reemplazo global,
editor de piezas, galería y resumen reciben esa misma paleta. Versionar el cambio;
rechazar cotizaciones de versiones anteriores. No alterar snapshots de pedidos
ni recolorear pedidos/galería guardados en silencio.

Aplicar al borrador del taller con control de versión y conservar el resto de
sus datos. Desconfirmar precios y embalajes al cambiar el tamaño máximo; no
inventar precios ni paquetes reales, no publicar una configuración incompleta.
Los fixtures locales sí cubren hasta 90 para probar el recorrido simulado.

Con las variables anteriores: 15 = 19,9 cm con marco; 45 = 55,9 cm;
90 = 109,9 cm. Duplicar la cantidad por lado cuadruplica el número de piezas.
Mantener límites de archivos, cuerpos JSON y cuadrículas. Zoom móvil hasta 16×
para seleccionar cómodamente piezas de la grilla más densa; gestos no repintan
la matriz y no modifican colores.

## Evidencia de aceptación

- Paleta activa de 36, solo Clásico; M.24 y C.50 nunca elegibles ni generados.
- Generar/retocar/deshacer y navegación en extremos de la grilla 90 × 90.
- 8.100 celdas; medidas correctas; decoración SVG acotada y matriz inmutable al zoom.
- Cotización simulada válida hasta 90; precios y embalajes reales siguen pendientes.
- Mismas imágenes ficticias de mascota, pareja y familia que estudios anteriores,
  cargadas con `loadLocalImage` y procesadas por `renderMosaic`, render de material
  compartido con el creador. Exportar hashes, matrices, medidas y tiempos.
- Comparador actualizado por pedido de Bruno: cuatro resultados simultáneos por
  foto. Venecita 2 × 2 cm, grillas 30 × 30 y 45 × 45 (62 colores históricos);
  formato 1×1 con medida real 1,1 × 1,1 cm, grillas 45 × 45 y 90 × 90
  (36 colores actuales). Identificar pieza, grilla y medida del cuadro en cada
  resultado, también al ampliarlo. No afirmar mejora de reconocimiento ni fidelidad física por
  aumentar resolución; la reducción de paleta puede perder matices.
- Revisión real de celular/escritorio; mantenimiento productivo sin cambios.
