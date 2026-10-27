# PER-134 — Comparación Murvi con el corpus anterior

27/10/2026 · Solicitada por Bruno después de incorporar la paleta Murvi.

## Condiciones

- Mismos archivos `mascota.png`, `pareja.png`, `familia.png` de
  `output/cuadros-research/`. Son imágenes ficticias, no trabajos de clientes.
- Cargados por el selector del creador local en el navegador integrado.
  Zoom 1×, encuadre centrado, sin sustituciones ni retoques individuales.
- 15×15, 30×30 y 45×45; se capturaron los nueve SVG visibles del creador.
- Comparación con las nueve capturas conservadas de PER-131: paleta de **32**
  colores sintéticos. No se usó la primera paleta de diez como referencia inmediata.
- Configuración `canela-demo / 2026-10-27.murvi-1`, 62 códigos Murvi.
  Algoritmo OKLab y geometría sin cambios.

## Comprobaciones de los artefactos

Los 18 SVG se analizaron como XML. Cada pareja anterior/Murvi conserva el mismo
viewBox y las mismas posiciones y dimensiones de las piezas, con exactamente
225, 900 o 2025 venecitas. Todos los colores nuevos pertenecen a la paleta Murvi.
Se guardaron SHA-256 de originales y resultados en
`output/cuadros-research/paleta-murvi/stats.json`.

| Imagen | 15×15 anterior → Murvi | 30×30 anterior → Murvi | 45×45 anterior → Murvi |
| --- | --- | --- | --- |
| Mascota | 18 → 23 | 23 → 27 | 24 → 29 |
| Pareja | 22 → 20 | 24 → 23 | 24 → 26 |
| Familia | 27 → 26 | 29 → 37 | 32 → 40 |

La tabla expresa cantidad de colores usados; no mide parecido ni calidad.

## Evaluación visual de los nueve pares

| Imagen | Observación con Murvi frente a la paleta anterior |
| --- | --- |
| Mascota | Silueta y distribución de luces se mantienen. Pelaje claro adquiere grises verdosos y algunos parches rosados/violetas. Se pierde neutralidad. |
| Pareja | Las pieles pierden calidez y pasan a grises/olivas, con algunas sombras ocres. A 45×45 hay detalle de rasgos, pero la deriva cromática persiste. La paleta anterior reproduce mejor estos tonos de piel. |
| Familia | Mismo problema en las tres caras, con más fragmentación cromática en fondo y ropa. El aumento de colores usados no mejora la naturalidad de las pieles. |

15×15 sigue ofreciendo poco detalle para varios rostros; 30×30 y 45×45 mejoran
la forma, pero no eliminan la limitación cromática de estas referencias digitales.

Conclusión: **Murvi no mejora automáticamente el parecido de estas fotos**.
Los códigos identificables resuelven trazabilidad, pero no garantizan una
previsualización natural. La combinación actual de paleta estimada y cuantización
necesita evaluación adicional para retratos. No se puede deducir de estas capturas
cómo lucirán las muestras físicas ni atribuir el problema exclusivamente a la
extracción de color o al algoritmo sin un experimento que los separe.

Próximas opciones a evaluar, no implementadas en esta comparación: contrastar
referencias con muestras físicas y ensayar asignaciones cromáticas que eviten
desvíos de tono usando solo códigos disponibles. No agregar tonos de piel ficticios
ni prometer que un algoritmo resuelve la ausencia de un material adecuado.

## Entrega

- `output/cuadros-research/comparacion-murvi.html`: original, paleta de 32 y Murvi,
  con selector 15/30/45. Los tres estados se inspeccionaron en navegador.
- `output/cuadros-research/paleta-murvi/`: 9 SVG, `resultados.json`, `stats.json`,
  constructor local y capturas completas `comparacion-15.png`, `comparacion-30.png`,
  `comparacion-45.png`.
- Vista local: `http://127.0.0.1:3005/comparacion-murvi.html`.
- Resultados previos conservados. Sin cambios en la aplicación, despliegues,
  pagos, stock o contenido de Sanity en esta prueba.
