# PER-141 — Propuesta de home con dos accesos

2026-10-27 · **Plan para revisar; distribución todavía no implementada.**
Continúa PER-138, PER-139 y [PER-140](140-tono-tienda-y-creador.md).

## Idea

La home presenta dos formas de comprar en Canela: elegir una pieza del catálogo
o crear un cuadro. Dos banners con imágenes grandes ocupan la primera pantalla;
cada uno lleva directamente a su recorrido. El catálogo completo vive en
`/tienda`. El creador conserva `/crear-cuadro` y su compra separada.

## Distribución propuesta

### Escritorio

```text
CANELA                 Tienda   Crear mi cuadro   Nosotros   Carrito

┌─────────────────────────────┐  ┌─────────────────────────────┐
│                             │  │                             │
│   FOTO GRANDE DE PIEZAS      │  │   CUADRO EN VENECITAS        │
│   DE VIDRIO Y CERÁMICA       │  │   CON DETALLE DEL MATERIAL   │
│                             │  │                             │
│   Tienda                    │  │   Cuadros personalizados     │
│   Vidrio, cerámica,         │  │   Elegí una foto y probá     │
│   espejos y cuadros.        │  │   cómo quedaría en venecitas.│
│   [Explorar la tienda]      │  │   [Crear mi cuadro]          │
└─────────────────────────────┘  └─────────────────────────────┘

Foto de Mariela / breve presentación del taller
Footer: categorías, galería, cómo comprar, Instagram
```

- Dos banners del mismo ancho, unos 500–560 px de alto en escritorio amplio.
  Sin otro hero encima: los dos destinos se ven juntos al entrar.
- Fotografía protagonista, título breve y una sola acción principal por banner.
  El texto va en una zona de fondo uniforme o con contraste controlado, sin tapar
  el objeto ni escribir sobre zonas cargadas de la imagen.
- Alineación izquierda, márgenes y alturas compartidos. La superficie completa
  de cada banner es un enlace; el botón visual pertenece a ese mismo enlace,
  sin enlaces anidados ni focos duplicados.
- Debajo, una presentación corta de Mariela y el taller. La explicación de
  compra acompaña al catálogo; el creador ya explica sus propios pasos.

### Celular y tablet

- Dos columnas desde aproximadamente 900 px; por debajo, banners apilados:
  primero Tienda, después Cuadros personalizados.
- En celular, imágenes aproximadamente 4:3 con texto y acción siempre visibles.
  Evitar alturas de pantalla completa para que el segundo acceso quede cerca.
- Nada depende de hover, swipe o rotación para descubrir el otro recorrido.
  Botones cómodos de al menos 44 px y textos con contraste estable.
- Probar a 320, 375, 768, 1024 y 1440 px; ambos accesos deben entenderse incluso
  con aumento de texto y sin animación.

## Dirección visual

Se conserva la identidad que ya tiene Canela:

| Uso | Color |
| --- | --- |
| Fondo crema | `#F6EFE1` |
| Superficie clara | `#FBF7EE` |
| Marrón / títulos y texto | `#4A3527` |
| Ocre / acentos de tienda | `#8A621D` |
| Oliva / acentos del creador | `#606839` |
| Fondo del taller | `#EFE4CE` |

- **Grand Hotel** para los títulos grandes; **Mulish** para cuerpo y controles.
  Títulos de 40–56 px en escritorio y 32–40 px en celular, según el espacio.
- Banner de tienda: fotografía real de piezas de Canela, tomada del material ya
  disponible. Elegir una composición que permita recortes amplios y de celular;
  no inventar productos ni ampliar una miniatura hasta perder detalle.
- Banner del creador: un cuadro con la vista actual de venecitas y marco; puede
  acompañarlo una foto pequeña de origen para mostrar qué hace la herramienta.
  La fotografía debe ser propia o contar con permiso. Si la escena es digital,
  señalar que es una vista de ejemplo, sin presentarla como un trabajo entregado.
- Mantener colores y movimientos suaves: entrada breve y acercamiento discreto
  al interactuar. Respetar movimiento reducido. La home no alterna los dos
  destinos en un carrusel: siempre están visibles.
- El carrusel y las animaciones actuales pueden acompañar la cabecera de
  `/tienda`, de forma más compacta para no alejar los productos. Conservar la
  decisión de PER-139 de no ofrecer un control de pausa manual.

## Rutas y contenido

| Ruta | Contenido |
| --- | --- |
| `/` | Dos banners, taller y footer |
| `/tienda` — nueva | Categorías, catálogo, filtros, fotos ampliadas, carrito y cómo comprar |
| `/crear-cuadro` | Foto, encuadre, tamaño, colores, retoques y compra separada |
| `/cuadros` | Galería; acceso desde el creador y el footer |
| `/checkout` | Compra habitual de productos del catálogo |

El menú ofrece Tienda, Crear mi cuadro y Nosotros; el logo vuelve a Inicio.
Los enlaces de categoría apuntan a `/tienda#vidrio`, `/tienda#ceramica` y
`/tienda#espejos`. Cómo comprar pasa a `/tienda#como-comprar`.

## Trabajo técnico previsto

1. Trasladar la carga de productos, disponibilidad, `CartAvailabilitySync`,
   `CatalogJsonLd`, `CatalogDiscovery` y `CategorySection` desde la home a
   `/tienda`. Mantener Sanity como fuente de verdad; no duplicar stock ni catálogo.
2. Reutilizar el carrito y el layout compartido. Conservar los controles de
   disponibilidad de `/checkout` aunque alguien llegue sin pasar por la tienda.
3. Construir los dos banners con imágenes responsivas y espacio reservado para
   evitar saltos de layout. Cargar prioritariamente solo las imágenes visibles.
4. Actualizar navbar, footer, hero, volver a la tienda, checkout y enlaces vacíos.
   La galería vuelve a llamarlos según el destino: «Volver al inicio» para `/`.
5. Compatibilidad con enlaces viejos: `/#catalogo`, `/#vidrio`, `/#ceramica`,
   `/#espejos` y `/#como-comprar` pasan al ancla equivalente de `/tienda`. Los
   fragmentos no llegan al servidor: resolver esa migración en el cliente y
   conservar un enlace alternativo. `/#nosotros` permanece en la home.
6. Dar a `/tienda` título, descripción y canonical propios, e incluirla en el
   sitemap. La home mantiene datos de marca; los datos de productos quedan en
   la ruta del catálogo. Respetar los controles de mantenimiento.
7. Mantener la disponibilidad actual del creador: mientras esté deshabilitado en
   producción, no publicar un banner que lleve a una ruta inexistente. La home
   de dos accesos se valida en la rama de cuadros; habilitarla públicamente es
   una decisión separada de esta reorganización. Los cobros de cuadros siguen
   deshabilitados.

## Pruebas de aceptación al implementarlo

- Home → tienda → filtro → foto ampliada → carrito → checkout; el carrito sigue
  presente al cambiar de ruta y el total no cambia por la navegación.
- Home → creador → foto → zoom/encuadre → retoques → resumen → compra de prueba.
- Galería → diseño elegido en el creador y acceso de vuelta a la galería.
- Enlaces de categoría nuevos y antiguos, navegación móvil y teclado.
- Feature del creador activo e inactivo, mantenimiento y productos agotados.
- Metadatos y sitemap de la tienda; no indexar la compra simulada ni sus datos.
- Capturas móvil/escritorio para verificar imágenes, textos, foco, contraste,
  ausencia de desborde y acceso cercano a los dos banners.

## Secuencia

Primero separar el catálogo y ajustar la navegación; después construir la nueva
home usando los contenidos existentes; por último revisar ambos recorridos y
sus capturas responsivas. No requiere modificar Mercado Pago, Zipnova, Sanity
ni la lógica del editor para empezar.
