# HOME-158 — Creador anunciado como «Próximamente»

13/11/2026. Pedido de Bruno: abrir primero la tienda de catálogo sin el creador
de cuadros y anunciarlo en la home.

## Comportamiento

- Con el creador deshabilitado (`customizationEnabled()` falso; en producción
  `CUADROS_PREVIEW_ENABLED` distinto de `1`), la home:
  - titula «Explorá nuestro catálogo.» y ofrece un único enlace, a `/tienda`;
  - muestra después un cartel no interactivo «Crear mi cuadro · Próximamente»;
  - arranca en la vista del catálogo y alterna con una vista de cuadro genérica
    marcada «Próximamente», sin cargar galería, diseños ni datos del taller.
- No hay enlaces a `/crear-cuadro` ni `/cuadros`; esas rutas siguen en 404 y la
  navegación y el pie no las muestran.
- Con el creador habilitado no cambia nada: dos recorridos y sin cartel.

## Verificación

- Pruebas de componentes de la home: cartel sin enlace, único destino `/tienda`,
  rotación de vistas y ausencia del cartel con el creador habilitado.
- Navegador local con `CUADROS_PREVIEW_ENABLED=0`: escritorio, 375 px y 320 px
  sin desborde horizontal; `/crear-cuadro` responde 404.

## Siguiente prioridad

Habilitar el creador dentro del panel de administración para que Mariela lo
pruebe, sin exponerlo en la tienda pública.
