# PER-130 — Creador y galería de cuadros: primera versión

## Alcance autorizado

2026-10-26, rama `codex/creador-cuadros-personalizados`. Bruno autorizó construir
`/crear-cuadro` y `/cuadros`, con medidas/paleta provisionales y pruebas de flujos.
Fuente: [discovery actualizado](../discovery/002-cuadros-personalizados-preguntas-cliente.md).

- Carga local de JPEG, PNG y WebP, recorte cuadrado, movimiento y zoom.
- Conversión a venecitas enteras de una paleta cerrada; tamaño por filas/columnas.
- Galería de ejemplos y apertura mediante `/crear-cuadro?diseno=<id>`.
- Modificación independiente de tamaño y colores, conteos y medidas derivadas.
- Guía imprimible de prueba con cuadrícula numerada y leyenda del mismo diseño.
- Acceso desde navegación y selección destacada en la portada cuando esté habilitado.
- Sin pagos, precios, reservas, órdenes, carga de fotos al servidor ni borradores.

## Arquitectura y datos

1. Configuración validada: tamaño de venecita, junta, marco (mm), mínimo/máximo/paso
   de celdas, color de fondo y paleta con ID/nombre/hex. Primera versión cuadrada.
2. Datos provisionales en repositorio de servidor; componentes reciben DTOs. Una
   futura implementación Sanity reemplaza ese repositorio, conservando el contrato.
   No sembrar ni modificar datos reales de Sanity en esta iteración.
3. Fixture inicial coherente: venecita 20 mm, junta 1 mm, marco 10 mm, 15–45 celdas
   con paso 1. **No representa medidas aprobadas por Mariela.** Los cm se derivan
   de `N * pieza + (N - 1) * junta`, más dos lados del marco.
4. Motor TypeScript independiente del DOM: raster → celdas, color más cercano en
   OKLab con Culori; resultado incluye configuración/versiones y matriz de IDs.
   La previsualización SVG, conteos y guía usan esa misma matriz.
5. Imágenes: selector/drag-drop nativos, validación de firma/formato y límite 10 MiB,
   decodificación orientada con createImageBitmap, máximo 24 megapíxeles decodificados,
   reducción a 1200 px por lado. Solo memoria del navegador, URL local revocable.
   El original se libera al reemplazar/reiniciar/salir. No localStorage/IndexedDB.
6. React Easy Crop resuelve encuadre táctil/ratón/teclado y zoom; Canvas obtiene el
   raster. Transparencia se compone sobre el fondo configurado, nunca crea huecos.
7. Plantillas: mosaicos sintéticos, no fotos de compradores. Reutilizar no requiere
   el original. Cambiar tamaño remuestrea la matriz, sin inventar detalle. Rechazar
   plantillas incompatibles; no sustituir colores silenciosamente.
8. Flag: habilitado por defecto en desarrollo; en builds requiere
   `CUADROS_PREVIEW_ENABLED=1`. Nunca habilitado en `VERCEL_ENV=production` en esta
   iteración. Sin sitemap/indexación, sin modificar mantenimiento ni checkout.
9. Flujo de publicación de pedidos reales/autorización/curación en Sanity queda
   especificado en discovery para la etapa de ventas, sin simular compras reales.

## Diseño

Se mantiene identidad existente: crema #f6efe1, papel #fbf7ee, marrón #4a3527,
ocre #8a621d, verde #5e8c4e. Mulish para interfaz, Grand Hotel para identidad.
La cuadrícula aporta el detalle visual; los controles permanecen sobrios.

```text
Galería: título + crear propio / aviso de demostración / cuadros / CTA
Creador escritorio: título / aviso / controles | cuadro grande / guía y leyenda
Creador móvil: título / aviso / cuadro / leyenda y guía / controles
```

Revisión del plan: usar marcos y mosaicos reales generados desde matrices; evitar
tarjetas decorativas repetidas, fotos ajenas y promesas de materiales reales.
Foco visible, controles con nombre, errores recuperables, etiquetas completas y
sin desborde horizontal a 375 px. No precios ni plazos prometidos con fixtures.

## Criterios y pruebas

| ID | Criterio | Verificación |
| --- | --- | --- |
| PER-130-01 | Distintas medidas/paletas funcionan con el mismo motor; cm derivados y piezas enteras | Dominio: dos configuraciones, límites, NaN, paleta vacía/IDs repetidos; galería usa configuración vigente |
| PER-130-02 | Cada celda pertenece a la paleta, conteo = N²; resultado determinista | Raster sintético, transparencia y recorte |
| PER-130-03 | Cambiar tamaño/colores no modifica plantilla ni diseño anterior | Dominio + interacción React |
| PER-130-04 | Carga inválida explica el problema y conserva diseño previo; última selección gana | Validación binaria + interacción/carreras |
| PER-130-05 | Galería publicada solamente; ID inexistente recuperable; vacía útil | Aplicación + componentes/rutas |
| PER-130-06 | Galería → creador sin foto original y configuración vigente | Aplicación + navegador |
| PER-130-07 | Guía refleja exactamente matriz/leyenda/configuración y dice No fabricar | Exportación y escape de texto/HTML |
| PER-130-08 | Sin persistencia/transmisión de imágenes; URLs liberadas; reiniciar borra edición | Componentes + lectura de implementación + navegador |
| PER-130-09 | No compras ni exposición del prototipo en producción | Gate y pruebas de mantenimiento/rutas |
| PER-130-10 | Escritorio/móvil/teclado operables | Interacciones automatizadas + inspección real 375 px/escritorio |

Gates: pruebas focales en rojo antes de implementación; suite local completa,
TypeScript, lint, build; revisión visual y flujo de subida en navegador.
Sin pruebas destructivas sobre DB, llamadas a proveedores ni despliegue en main.

Resultado y límites de verificación: [PER-130](../evidence/PER-130.md).
