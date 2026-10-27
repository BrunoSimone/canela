# PER-142 — Banners de ancho completo y cabeceras compartidas

2026-10-27 · Refinamiento solicitado sobre [PER-141](141-home-dos-recorridos.md).
**Implementado.** [Evidencia](../evidence/PER-142.md).

La home pasa al carrusel de [PER-143](143-carrusel-de-recorridos-home.md).
Las cabeceras de tienda/galería y el footer de esta spec siguen vigentes.

## Alcance y criterio visual

- Home: Tienda y Cuadros personalizados se apilan en todos los tamaños. Cada
  acceso ocupa todo el ancho y aproximadamente una pantalla de alto, con imagen,
  título y acción en la misma superficie. Sin borde, radio, sombra de tarjeta,
  contenedor estrecho ni espacio entre banners. La apertura presenta ambos
  destinos con enlaces independientes; el segundo banner amplía la propuesta
  del cuadro personalizado.
- Fotografía real de Sanity en resolución suficiente, sin el recorte previo a
  1200 × 900; imágenes responsivas con calidad 90. El cuadro usa el mismo SVG de
  material simulado que el creador, nítido a cualquier tamaño. El ejemplo sigue
  identificado como tal.
- Texto crema sobre degradado marrón/oliva. Mulish para la bienvenida de la
  tienda, explicación breve y acciones; Grand Hotel para el título del banner
  de cuadros. En este último el texto queda abajo en móvil, sin ocultar la parte
  principal del cuadro. Altura adaptable al contenido.
- Tienda: restaurar imagen protagonista de hasta 340 px y el espacio de la
  cabecera anterior. Conservar aro, flotación y carrusel sin control de pausa.
- Galería: reutilizar esa misma cabecera con título, acciones y cuadros propios.
  Mostrar los marcos completos; cada cuadro lleva a su diseño en el creador.
  El botón principal salta a los diseños y el secundario permite subir una foto.
- Catálogo: título sans de peso alto y sección con espacio propio para
  distinguirlo de los títulos manuscritos de Vidrio, Cerámica y Espejos.
- Conservar ayuda antes del footer, navegación, feature gates, compra separada
  de prueba, carrito y lógica de disponibilidad.
- Ajuste posterior: quitar «Creador en prueba · Sin cobros reales» del banner.
  Los avisos sobre importes orientativos y ausencia de cobros permanecen dentro
  del recorrido de personalización. Footer compacto: marca pequeña, enlaces
  repartidos horizontalmente (dos columnas en móvil), copyright e Instagram.
  Sin descripción de marca repetida ni encabezados de columnas.
  Tras la revisión visual, usar un espaciado intermedio: 32/24 px de margen
  vertical principal y 8 px entre filas, para evitar comprimir los enlaces.
- Apertura de la home: mostrar «Creá tu cuadro personalizado o explorá nuestro
  catálogo.» centrado sobre la primera fotografía, con Mulish de peso regular
  en crema y un degradado superior que se desvanece hacia la imagen. Sin franja
  crema debajo del menú ni título «Tienda» adicional.
  Si el creador está deshabilitado, mostrar solo «Explorá nuestro catálogo.».
  Mensaje y botones forman un único bloque en la parte superior, separado del
  menú y con espacio libre para la fotografía debajo. El título distribuye sus
  líneas según el ancho disponible. Los textos siguen en flujo normal y el
  banner puede crecer para evitar superposiciones. Animación de entrada suave
  deshabilitada cuando se prefiere movimiento reducido.
- Descubrimiento de los recorridos: «Crear mi cuadro» y «Explorar la tienda»
  deben estar visibles en la primera pantalla a partir de 320 × 568 px, sin
  depender de desplazarse ni abrir el menú. El primer banner no es un enlace:
  solo sus botones navegan, al creador y al catálogo respectivamente. En celular
  se apilan y en escritorio comparten fila; foco visible y objetivos de 50 px
  de alto como mínimo. Si el creador está deshabilitado se ocultan tanto su
  botón inicial como su banner. Se mantiene el enlace del segundo banner.

Referencia consultada: [OMAIGAT, Mouse Pads](https://www.omaigat.com.ar/collections/mouse-pads).
Se toma la llamada explícita a personalizar, diferenciada de explorar productos.
La referencia no aporta evidencia pública de conversión ni justifica copiar su
estética. En Canela ambos accesos se adelantan a la primera pantalla.

Esta revisión sustituye la distribución de dos columnas, los textos fuera de
la imagen y la cabecera compacta descritos en PER-141.

## Aceptación

1. Ambos banners abarcan el viewport y se apilan a 320, 375, 768 y 1440 px;
   textos/acciones caben sin desborde. No hay interacción que dependa del hover.
2. Home → tienda y home → creador conservan sus destinos; la feature desactivada
   solo muestra tienda. Ambos accesos están junto al mensaje inicial y son
   visibles sin scroll; pulsar el mensaje o la foto no lleva a la tienda.
   No se consulta inventario desde la home.
3. Tienda mantiene catálogo, categorías y carrito. Su cabecera tiene las
   proporciones originales; Catálogo se distingue de las categorías.
4. Galería → selección del carrusel → creador abre el diseño seleccionado;
   navegación a la lista y subida de foto siguen accesibles con teclado y móvil.
5. Carrusel respeta movimiento reducido. Los controles tienen al menos 44 px,
   foco visible y no se añade pausa manual. Los cuadros no se recortan.
6. Pruebas de regresión de recorridos y capturas responsive antes de cerrar.

## Límite

Trabajo local en `codex/creador-cuadros-personalizados`. No habilita cobros de
cuadros ni despliega cambios a producción.
