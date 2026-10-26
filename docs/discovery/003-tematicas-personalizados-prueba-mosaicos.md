# Investigación de temáticas y prueba del creador

Fecha: 2026-10-26. Rama `codex/creador-cuadros-personalizados`.
Pedido: investigar tres temáticas comerciales relevantes de personalizados y
probar imágenes representativas en el creador existente (PER-130).

## Qué permite concluir la evidencia

No se encontró un ranking público comparable de ventas por temática para todo el
mercado de personalizados, ni uno específico de Argentina/cuadros de venecitas.
Por lo tanto, las siguientes son **tres hipótesis comerciales para Canela**, no
los puestos 1–3 de un ranking verificado. Se priorizan temas compatibles con
personalizar un cuadro a partir de una foto. Tazas, ropa o adornos son formatos
de producto, no temáticas, y sus volúmenes no se trasladan a mosaicos.

| Tema elegido | Evidencia pública | Qué no demuestra |
| --- | --- | --- |
| Mascotas | Etsy informa que se duplicaron las búsquedas relacionadas con regalos para mascotas en su informe otoño/invierno 2026. | Crecimiento de búsquedas no es cuota ni cantidad de ventas. |
| Parejas, aniversarios y compromisos | El informe San Valentín 2025 de Etsy identifica retratos personalizados de momentos especiales, como compromisos, entre los más vendidos de 2024. | No publica unidades ni posición exacta, y el dato corresponde a ese marketplace/período. |
| Familia y recuerdos | Teeinblue incluye retratos familiares entre los temas populares de arte de pared personalizado, y familias junto con mascotas entre los montajes más solicitados. | Es evidencia de su propia base comercial; no una clasificación mundial de temas. |

Fuentes primarias consultadas:

1. [Etsy — Fall and Winter 2026](https://www.etsy.com/seller-handbook/article/1521255894814),
   publicado 14/10/2026, datos al 14/09/2026. La propia fuente distingue búsquedas,
   ventas y favoritos; no convertir todos sus porcentajes en ventas.
2. [Etsy — Valentine's Day 2025](https://www.etsy.com/seller-handbook/article/1344222785000),
   publicado 16/01/2025, apartado Couples' portraits.
3. [Teeinblue — Products Selling With Personalized AI-Generated Art](https://teeinblue.com/blogs/en/best-products-to-sell-with-personalized-ai-generated-art),
   publicado 16/09/2026. Describe los temas anteriores dentro de posters/arte de
   pared. El 18,7% que cita corresponde a diseños personalizados con IA de su
   plataforma, no a participación del mercado de cuadros ni a unidades vendidas.
4. [Teeinblue — Product Personalization Statistics 2025–2026](https://teeinblue.com/pages/product-personalization-statistics-2026):
   declara una base de 8,4 millones de artículos personalizados y US$259,3 millones
   de GMV. Es contexto de actividad en su plataforma, sin desglose público completo
   por los tres temas. No se completaron formularios ni suscripciones para acceder
   a datos adicionales.

## Método de prueba

- Tres fotografías ficticias generadas para esta prueba: un border collie de
  frente, una pareja adulta y una familia de tres personas. No son clientes,
  trabajos vendidos ni fotografías testimoniales.
- Los originales se generaron con color continuo y detalle fotográfico. No fueron
  preparados como mosaicos ni adaptados a los diez colores de prueba.
- Cada PNG se seleccionó desde el navegador integrado en `/crear-cuadro`.
- Se mantuvo imagen completa, zoom 1×, paleta original sin sustituciones y se
  operó el control de tamaño a 15, 30 y 45 piezas por lado.
- Se capturó el SVG visible del creador en cada caso y el texto de sus conteos.
  La comparación usa esas nueve salidas; no imágenes de mosaicos generadas por IA.
- Se verificaron 225, 900 y 2025 celdas respectivamente, además de los dos
  rectángulos de marco/fondo. Los nueve casos utilizaron los diez colores de la
  configuración provisional `canela-demo / 2026-10-26.1`.

| Cuadrícula | Venecitas | Exterior con marco, solo configuración de ejemplo |
| --- | ---: | ---: |
| 15×15 | 225 | 33,4×33,4 cm |
| 30×30 | 900 | 64,9×64,9 cm |
| 45×45 | 2025 | 96,4×96,4 cm |

## Evaluación visual

Observaciones de estas tres imágenes, no umbrales universales ni una prueba de
preferencias de compradores:

| Tema | 15×15 | 30×30 | 45×45 |
| --- | --- | --- | --- |
| Mascota | Silueta reconocible; ojos y textura se pierden. | Mejor lectura de orejas, hocico y lengua. | Más contorno, pero ojos oscuros se funden con pelaje. |
| Pareja | Dos figuras, escaso parecido individual. | Rostros legibles con poca expresión. | Mejor lectura de sonrisas y ojos; sombras de piel siguen alteradas. |
| Familia | Exceso de pérdida de rasgos con tres caras. | Se distingue la composición, expresiones poco fieles. | Más información, aunque fondo y piel producen bastante ruido cromático. |

La paleta de ejemplo carece de una escala de grises y una gama de marrones/tonos
de piel suficiente. El color más próximo disponible puede ser verde o azul; se
observa en sombras, pelo y áreas claras del perro. Aumentar la cuadrícula no
resuelve esa limitación cromática.

## Próximos pasos sugeridos

1. Validar primero mascotas en primer plano y composiciones simples; son las más
   legibles de esta muestra. Para retratos, mostrar comparaciones honestas antes
   de pedir confirmación de compra.
2. Repetir las mismas imágenes con la paleta real cuando Mariela confirme códigos
   y muestras. Revisar si existen grises, marrones y tonos claros/oscuros apropiados.
   No agregar colores presentados como fabricables sin esa confirmación.
3. Orientar con consejos de encuadre (pocas caras, sujetos grandes, fondo simple).
   No rechazar automáticamente por parecido o estética: se conserva PER-DEC-005
   y la aceptación visual del comprador definida en discovery.
4. Si persisten pérdidas importantes con materiales reales, comparar alternativas
   de cuantización/preprocesamiento con este corpus y otras imágenes. No afirmar
   que la cantidad de colores o el tamaño resuelven todos los retratos.

## Artefactos locales

En `output/cuadros-research/` (ignorado por Git):

- `mascota.png`, `pareja.png`, `familia.png`: originales para repetir la prueba.
- `<tema>-15.svg`, `<tema>-30.svg`, `<tema>-45.svg`: salidas reales del creador.
- `resultados.json`: texto visible y conteos de las nueve pruebas.
- `index.html`: comparación de originales y cuadrículas.
- `comparacion.jpg`: captura de la comparación.

Vista local durante la sesión: `http://127.0.0.1:3005/`.
No se modificó el código del creador, su configuración ni la galería pública.
