# PER-133 — Retoques por venecita y navegación del mosaico

Estado: implementado y verificado localmente el 2026-10-26. Rama `codex/creador-cuadros-personalizados`.
Evidencia: [PER-133](../evidence/PER-133.md).
Extiende PER-130/131/132. Sin modificar la habilitación de venta ni los proveedores.

## Experiencia acordada

Después de generar el cuadro, «Retocar venecitas» abre un editor modal. Toque/clic
selecciona una pieza y la resalta; un color de la paleta cambia solamente esa pieza.
Arrastrar desplaza la vista, pellizcar acerca/aleja, y hay botones de zoom y «Ver
cuadro completo». Deshacer, rehacer y restaurar una pieza permiten corregir errores.
«Listo» o Escape regresa al creador conservando los cambios, también al reabrir.

### Plan visual

Mantener Mulish y los tokens existentes: marrón #4a3527, crema #f4efdf, tarjeta
#faf7ef, pared #e5e5d9; selección de doble contorno blanco/oscuro para ser visible
sobre cualquier color. El mosaico ocupa el espacio principal, sin tarjetas sobre
la imagen. Paleta a la derecha en escritorio y bandeja inferior en celular.
Controles con áreas táctiles de al menos 44 px y nombres accesibles.

```
Escritorio: [Retocar venecitas                         Listo]
            [deshacer / rehacer     − 100% + / encuadrar]
            [              mosaico               ][paleta]
Celular:    [Retocar venecitas               Listo]
            [deshacer / rehacer       − 100% + / ⛶]
            [              mosaico                  ]
            [pieza seleccionada / restaurar         ]
            [paleta horizontal de dos filas         ]
```

El modal ocupa la pantalla móvil con `dvh` y safe areas, bloquea el scroll de fondo
y conserva el foco. La paleta se desplaza independientemente sin reducir la imagen
a una miniatura. La versión de pantalla baja permite scroll del editor cuando es
necesario. El zoom es visual, de 1× a 8×; no altera el recorte, tamaño ni precio.

## Modelo y reglas

- Retoques en memoria como diferencias por índice, aplicados después de sustituciones
  globales. Colores limitados a la paleta. Índices inválidos fallan explícitamente.
- Historial acotado de 100 acciones (deltas); editar tras deshacer elimina rehacer.
  La celda restaurada recupera el color generado con las sustituciones globales vigentes.
- Reabrir y revisar/comprar preserva la grilla final. El backend valida esa grilla
  usando el contrato existente. Foto original y borradores siguen sin persistirse.
- Cambiar tamaño, imagen, recorte o reiniciar con retoques activos exige un aviso
  específico y una confirmación. Cancelar conserva todo. Una imagen inválida conserva
  el diseño anterior incluso después de confirmar su reemplazo. El recorte se bloquea
  hasta aceptar «Cambiar encuadre» para evitar regeneraciones por gestos accidentales.
- Tocar selecciona; pintar requiere elegir un color. Arrastrar, pellizcar y cancelar
  un puntero nunca seleccionan ni pintan. Tras un pellizco, el dedo restante tampoco
  se interpreta como un toque. No se seleccionan marco ni juntas.
- Teclado: flechas navegan piezas, Home/End recorren fila, Enter lleva a la paleta,
  Ctrl/Cmd+Z deshace, Shift+Z rehace. Se anuncia fila, columna y color. El foco vuelve
  a «Retocar venecitas» al cerrar.
- Pan/zoom solo transforma la vista; no recalcula la foto. Grilla SVG memoizada;
  actualizaciones de gestos agrupadas por animation frame. El SVG cambia su tamaño
  visual al ampliar para conservar la nitidez; el desplazamiento usa transformaciones.
  Límites de desplazamiento
  y recálculo ante resize mantienen el cuadro recuperable.

## Criterios de aceptación / pruebas

1. Dominio: retoque individual, restauración, undo/redo, ramificación del historial,
   límite, paleta/índices inválidos, composición con cambios globales e inmutabilidad.
2. Geometría: selección exacta bajo zoom/pan, bordes/marco/juntas, zoom anclado,
   límites. Gestos de uno/dos dedos, arrastre acumulado, cancelación y dedo restante.
3. Interfaz: selección → color → deshacer/rehacer/restaurar; teclado; cierre/reapertura;
   controles fuera del mosaico; ninguna solicitud de red al retocar.
4. Regeneración: cancelar/aceptar tamaño, foto, encuadre y reinicio; foto inválida
   conserva los retoques; cambios globales no borran correcciones puntuales.
5. Compra: la grilla retocada llega intacta al resumen, backend y snapshot aprobado;
   precio y carrito de stock intactos. Sin habilitar pagos reales.
6. QA navegador escritorio y 375 px, mosaico 45×45, zoom y selección bajo pan;
   controles visibles y sin desborde. Gestos multitáctiles cubiertos automáticamente;
   distinguir esa evidencia de una prueba física de teléfono.
