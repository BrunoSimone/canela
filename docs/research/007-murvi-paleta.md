# Murvi — referencias digitales para Canela

Consulta y extracción: 27/10/2026. Implementación: [PER-134](../specs/134-paleta-murvi.md).

## Resultado

El PDF `Murvi Catalogo.pdf` aportado por Bruno enlaza 62 muestras: 38 Clásico,
17 Vitro y 7 Nuevo. Se resolvieron las referencias contra el HTML del interactivo
y se descargaron las texturas originales que usa el fabricante: BMP RGB de 90 × 90 px.
El último recuadro no tiene rótulo legible; su enlace `a=63` identifica DI99.

El interactivo contiene otros tres códigos (C.02, N.11 y DI98), ausentes de las
muestras enlazadas en este PDF. No se agregaron a la paleta autorizada. El selector
del fabricante omite de la lista los colores seleccionados para su mezcla; el PDF
es una captura de ese estado, no necesariamente el catálogo completo de Murvi.

## Qué podemos afirmar

- Cada ID del generador identifica una referencia del PDF. La matriz se puede
  relacionar con materiales del fabricante por código, sin nombres inventados.
- Los HEX son estimaciones reproducibles de imágenes publicadas por Murvi.
- **No son valores oficiales medidos de las venecitas.** Ninguna textura consultada
  incluye perfil ICC y no encontramos una tabla oficial RGB/Lab/Pantone que permita
  confirmar colorimetría física. Se asumió sRGB.
- [Murvi advierte variaciones de tono por partida](https://murvi.com.ar/categoriamosaico/mosaicos/colores/clasico/f-20).
- [La línea Vitro es transparente](https://murvi.com.ar/novedad/linea-vitro).
  Un HEX opaco no reproduce cómo interactúa con la base, adhesivo e iluminación.
- La pantalla, luz de observación y textura del material también afectan la comparación.
  No se publica porcentaje de fidelidad ni garantía de igualdad física.

## Método reproducible

1. Extraer del PDF códigos y enlaces; resolver el enlace de cada muestra en el
   [interactivo oficial](http://www.murvi.com.ar/interactivo/?a=0&l=).
2. Conservar imagen original, URL, dimensiones y SHA-256. Se usó HTTP, como los
   enlaces del PDF; no se desactivó la validación TLS. HTTPS presentó un error de certificado.
3. Recortar la región central de 72 × 72 px (`9:81`), evitando el borde de la textura.
4. Convertir los píxeles sRGB a OKLab. Descartar el 10% inferior/superior de luminosidad
   para reducir el efecto de sombras y reflejos. Promediar las muestras restantes.
5. Convertir a sRGB, acotar a gamut y redondear a 8 bits. El resultado representa
   el tono de la imagen, no una medición del vidrio.

Datos versionados: `src/modules/customization/infrastructure/murvi-palette.json`.
Los metadatos incluyen hash del PDF, método, versión, código, línea, URL de muestra,
URL de textura, hash de textura y `calibrated: false`.

Reproducción con Python + Pillow + numpy (solo herramienta de investigación):

```sh
python3 scripts/research/murvi-palette.py output/murvi-research
```

El directorio debe contener `originals/<codigo>.bmp`, descargados de las URLs del
JSON. El script verifica sus hashes antes de recalcular. Exporta JSON, CSV y una
comparativa HTML autónoma. No descarga nada ni cambia el catálogo de la aplicación.
Las texturas y la comparativa permanecen en `output/` local; no son assets públicos
ni dependencias de red del generador.

## Validación física pendiente

Armar un muestrario con los códigos, sobre la misma base/adhesivo que se usarán en
los cuadros. Compararlo bajo luz controlada; para medir fidelidad, obtener una
referencia colorimétrica del fabricante o medir las muestras. Una foto con carta
de color puede ayudar a ajustar, pero no garantiza coincidencia en cualquier pantalla.

Hasta entonces la interfaz indica tonos orientativos y la transparencia de Vitro.
Se mantienen los datos de geometría, precios y compra simulada de la iteración anterior.
Una calibración futura deberá crear otra versión de paleta, preservando los diseños
ya confirmados con su snapshot de materiales.
