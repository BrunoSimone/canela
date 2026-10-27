# PER-145 — Textos públicos y sección activa en el header

2026-10-27. Refinamiento de PER-140/142/144 solicitado por el usuario.

## Alcance

- Quitar las leyendas «Diseño de ejemplo» y el aviso global «Versión de prueba»
  de home, galería, creador y resumen. Eliminar también sus textos accesibles,
  componentes y estilos que queden sin uso.
- En galería, el acceso «Usar mi imagen» pasa a «Crear mi diseño» y mantiene
  `/crear-cuadro` como destino. Los diseños se pueden abrir como hasta ahora.
- Usar «medidas orientativas» y «precio estimado» donde los datos todavía no
  son definitivos, sin rotular cada producto como una versión de desarrollo.
  La pantalla específica de simulación de pago conserva información clara de
  que no hay cobros ni pedidos reales. No cambia ningún gate ni proceso de pago.
- El header destaca la sección actual, tanto en escritorio como en el menú
  móvil: Tienda (`/tienda`), Galería (`/cuadros`) o Creador (`/crear-cuadro`).
  Se aplica también a subrutas del mismo segmento; los parámetros del diseño
  no afectan la selección. Ninguna sección queda seleccionada en la home.
- Fondo cálido y borde suave para el enlace activo; el CTA del creador conserva
  su jerarquía y tiene un estado activo distinto. `aria-current="page"` informa
  el estado a lectores de pantalla. Foco de teclado claramente visible.
- Se mantiene el cierre del menú al navegar/Escape y las restricciones del gate.
  «Cómo comprar» es un ancla de tienda; no se marca como otra página activa.

## Verificación

- Navegación entre rutas actualiza el enlace activo sin falsos positivos entre
  nombres parecidos; se revisa también el menú móvil y el gate deshabilitado.
- Galería → crear mi diseño y galería → diseño seleccionado siguen funcionando.
- Tests existentes de home, galería, creador, resumen y compra simulada;
  TypeScript, lint y revisión visual de header de escritorio y móvil.

Implementación local en `codex/creador-cuadros-personalizados`, sin despliegue.

## Resultado

- 56 tests aprobados en seis suites: navegación, home, recorridos de tienda,
  creador/resumen, rutas y compra simulada. Se corrigió una expectativa del
  nombre anterior del precio y se volvió a ejecutar completa esa suite.
- TypeScript, ESLint de los archivos afectados y `git diff --check` correctos.
- Revisión visual en navegador a 1440 px y 375 px: sección actual distinguible,
  CTA de galería correcto, sin desborde horizontal; menú móvil se cierra al
  navegar. Crear mi diseño abre el creador sin una imagen precargada.
- Capturas locales: `output/home-navigation/galeria-escritorio.png` y
  `output/home-navigation/menu-movil.png`.
