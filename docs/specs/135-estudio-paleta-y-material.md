# PER-135 — Estudio de ampliación de paleta y material

27/10/2026 · Rama `codex/creador-cuadros-personalizados`.

## Objetivo

Comparar las mismas fotos ficticias de mascota, pareja y familia de PER-134 con
la paleta Murvi actual y una ampliación experimental. Evaluar por separado una
representación del relieve de la venecita para conversar con Mariela.

## Alcance y límites

- Herramienta local de investigación en `scripts/research/`; resultados en
  `output/cuadros-research/`. No modifica el catálogo del creador ni sus pedidos.
- Mismos PNG, carga y reducción del creador (`loadLocalImage`), encuadre centrado,
  algoritmo `renderMosaic`, geometría y tamaños 15/30/45. Sin retoques individuales.
- Base: 62 referencias Murvi sin alterar. Ampliación: siete objetivos digitales
  de beige, durazno, salmón, marrones claro/medio y grises claro/oscuro.
- Los HEX nuevos son hipótesis elegidas para estudiar huecos cromáticos. Los
  códigos comerciales V55/S82/M186/M55/M54/S22/S21 son candidatos para buscar
  muestras, **no una medición de esos productos** ni confirmación de stock.
- Posibles colores fabricados por Mariela requieren consulta y muestras; no
  se añaden como materiales disponibles.
- Vista plana para comparar color y vista de material para simular bisel,
  microtextura, juntas y luz. La segunda conserva la misma matriz de piezas,
  códigos y geometría; iluminación y textura son sintéticas, no calibradas.
- No promete simular transmisión real de Vitro ni el aspecto de un lote físico.

## Presentación

Comparaciones grandes y alineadas con original accesible, controles comunes de
tamaño y textura, ampliación con teclado/táctil y colores propuestos visibles.
Fondo neutral `#f5f5f3`, superficies `#ffffff`, texto `#292c29`, secundario `#62665e`,
acento Canela `#78593b`. Tipografía de sistema para controles, títulos sobrios.
La imagen es el contenido principal. Evitar tarjetas decorativas y animaciones.
En móvil, originales compactos y dos resultados alineados; detalle en diálogo
con zoom y desplazamiento nativo. Avisos junto al resultado, también al imprimir.

## Aceptación

| ID | Comprobación |
| --- | --- |
| 135-01 | La paleta base y la configuración de la app no se mutan; los siete colores se identifican como hipótesis con procedencia explícita. |
| 135-02 | Las nueve conversiones base reproducen exactamente los colores y posiciones de los SVG Murvi anteriores. |
| 135-03 | La ampliación usa solo IDs autorizados del experimento y preserva geometría/encuadre; se registra uso de colores nuevos. |
| 135-04 | El error medio de cuantización en OKLab se calcula contra las mismas muestras 4×4 del algoritmo y se rotula como métrica digital, no calidad física. |
| 135-05 | Activar textura/luz/zoom no cambia asignaciones de piezas; el render es determinista y no incorpora partes de la foto original como textura. |
| 135-06 | Comparador, controles y ampliación se verifican en escritorio y ancho móvil; evidencia reproducible con hashes de originales. |

La recomendación de compra debe supeditarse a comparar muestras reales de color,
tamaño, espesor, opacidad y acabado. La simulación revela qué familias cromáticas
pueden ayudar; no asegura que los códigos sugeridos produzcan esos resultados.
