# QA manual — panel y creador (PER-157)

Base local: http://localhost:3000. La producción permanece en mantenimiento.
Los pedidos de prueba de esta guía son exclusivamente locales; los proveedores
están simulados y no se envían correos, cobros ni despachos.

## Catálogo migrado (CAT-154)

| Ruta | Revisar |
| --- | --- |
| `/admin/ingresar` | Acceso con correo autorizado; sesión vencida y cierre de sesión. |
| `/admin/catalogo?tipo=product` | Buscar, crear borrador incompleto, editar precio/categoría/medidas, publicar válido, duplicar, archivar y recuperar. |
| Misma ficha, fotos | Cargar JPG/PNG/WebP, rechazar archivos inválidos/grandes, reordenar, recortar, guardar y recargar. Conservar el recorte y miniaturas. |
| Misma ficha, stock | Ajustar con motivo; reflejar la cantidad en catálogo y carrito. No permitir bajar de unidades reservadas. |
| `/admin/catalogo?tipo=box` | Crear/editar cajas y validar medidas de envío. |
| `/admin/catalogo?tipo=slide` | Editar carrusel, orden, publicación y revisar `/` y `/tienda`. |
| `/admin/catalogo?tipo=frame` | Borrador y publicación editorial de diseños autorizados. Sin originales de compradores ni datos privados en el catálogo. |
| `/tienda` | Categorías, fotos, ficha/modal, agotado con cantidad cero y carrito. |
| `/checkout` | Carrito, datos, validaciones y orden formulario → continuar → envío/resumen → pago. En este entorno local el pago real está deshabilitado. |

## Creador y taller (PER-157)

1. `/crear-cuadro`: iniciar vacío, sin precio ni medidas; cargar una foto local.
2. Alternar 1×1 (29 colores, máximo 90) y 2×2 (36 clásicos, máximo 45).
   Conservar foto/encuadre, ajustar límites, actualizar medidas y precio.
3. Recortar/acercar la foto, cambiar tamaño, comparar recorte/mosaico. No debe
   haber pintura individual ni reemplazo global de colores.
4. Revisar resumen y volver: conservar formato, foto y diseño. El resumen muestra
   un precio del cuadro, sin costos internos. Las medidas siguen orientativas.
5. `/cuadros`: abrir diseño, adaptar formato y tamaño; revisar carrusel, catálogo
   y «Cómo comprar». Identificar los diseños simulados frente a obras físicas.
6. `/admin/taller`: revisar por separado medidas, paleta, precio y paquetes de
   ambos formatos. Plazo, capacidad y condiciones se comparten. Guardar un
   borrador, recargar y verificar que un formato no pisa al otro. Publicar solo
   con los datos/confirmaciones definitivos de ambos; nunca inventarlos para QA.
7. `/admin`: buscar un pedido de cuadro. La ficha está en `/admin/pedidos/<id>`.
   En un pedido pago por fabricar, abrir «Retocar venecitas»: seleccionar pieza,
   cambiar color, zoom/pan, deshacer/rehacer, guardar y recargar. Cancelar no guarda.
8. Con dos pestañas del mismo pedido, intentar guardar cambios diferentes:
   la versión obsoleta debe pedir actualizar y conservar los retoques abiertos.
9. La guía privada de armado refleja los retoques; el diseño aceptado y el importe
   se conservan. Un cuadro terminado no permite retocar. El borrador de galería
   solo se prepara después de terminar y con consentimiento del comprador.

Repetir en escritorio y celular: sin desborde, controles táctiles accesibles,
preview visible al ajustar, foco recuperado al cerrar, mensajes legibles.

## Pedidos locales preparados

- 1×1: http://localhost:3000/admin/pedidos/e1e33807-42cb-407f-bb66-5ce0b08608e6
- 2×2: http://localhost:3000/admin/pedidos/10d388fb-e620-496a-b927-e045d1e5615e

Pueden regenerarse con `scripts/prepare-frame-qa.ts`, que exige una base local
cuyo nombre termine en `_stage`. No usar cuentas reales para esta prueba.

## Automatización

- `pnpm test`: dominio, componentes, límites, HTTP, permisos y mocks externos.
- `pnpm test:db`: base PostgreSQL **desechable y local**, `TEST_DATABASE_URL` y
  `RUN_DB_INTEGRATION=1`; incluye catálogo/stock, media, pagos y cuadros.
- `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`.

Los tests cubren fallos y concurrencia, pero no prueban todos los navegadores,
la disponibilidad futura de proveedores ni los datos todavía no cargados. El
QA manual complementa esa evidencia. No ejecutar compras reales en esta guía.
