# Carga simple de productos en Sanity

2026-10-26. Bruno pide reducir los campos de la ficha a los necesarios para
publicar y vender, y revisar cuáles siguen siendo necesarios.

## Alcance

Simplificar el formulario y los textos de ayuda. Conservar los documentos, IDs,
fotos y valores existentes, así como los contratos de catálogo, envío y stock.
No modificar cantidades ni completar medidas o clasificaciones por suposición.

## Criterios de aceptación

- **CAT-01:** La ficha abre en **Datos del producto**, con nombre, categoría,
  subcategoría, precio, descripción y fotos. La subcategoría se conserva porque
  alimenta los filtros actuales de la tienda.
- **CAT-02:** **Envío** reúne peso y tres medidas de una unidad protegida, sin
  caja exterior, y el contenido que se declara al transporte. Las opciones usan
  nombres comprensibles; no se pide al taller conocer códigos de API.
- **CAT-03:** Modalidad de venta, nota de estado, material y medidas sin envolver
  quedan en **Detalles opcionales**, contraído inicialmente. Una ficha nueva
  mantiene `stock` por defecto. No se altera la modalidad de fichas existentes.
  Las medidas descriptivas dejan de ser obligatorias; nunca se sustituyen por
  las dimensiones con protección mostradas como tamaño de la pieza.
- **CAT-04:** Giro, apilado y caja exclusiva siguen editables en **Acomodo de la
  pieza**, contraído inicialmente. Los valores existentes se respetan; una pieza
  nueva conserva los valores conservadores actuales (todos desactivados).
- **CAT-05:** Stock permanece en su pestaña independiente y autoritativa en
  Sanity. Publicar una ficha no repone unidades. Las cajas se cargan una vez por
  tamaño en su sección, no en cada producto.
- **CAT-06:** Un perfil sin medidas o clasificación no habilita cotización. Se
  conserva la carga gradual actual y la validación del backend antes de cobrar.
- **CAT-07:** Verificar compilación de Studio, tipos y contratos de catálogo,
  perfiles, acomodo e inventario. Revisar el formulario publicado y actualizar
  el runbook y las páginas correspondientes de la guía PDF antes de entregarla.

## Auditoría de campos

| Campos | Uso / decisión |
| --- | --- |
| Nombre, precio, fotos | Identificación, catálogo y checkout; visibles |
| Categoría, subcategoría | Secciones y filtros de tienda; visibles |
| Descripción | Información de la pieza; visible, opcional |
| Peso, alto, ancho, largo protegidos | Acomodo y cotización; sección Envío |
| Clasificación del contenido | Declaración a Zipnova; sección Envío, sin códigos en las etiquetas |
| Modalidad | Límites de pieza única y exclusión de encargos del checkout; detalle opcional con valor inicial |
| Nota, medidas sin envolver, material | Información adicional que ya muestra la tienda; opcionales |
| Giro, apilado, caja exclusiva | Restricciones reales de embalaje; opciones de acomodo |
| Versión, orden | Campos técnicos ocultos, mantenidos por la aplicación |
| Cantidades, habilitación y motivo | Pestaña Stock; auditoría y reservas conservadas |

Complementa [090](090-apertura-caja-compartida.md) y
[100](100-inventario-sanity.md); no cambia el alcance del checkout ni abre ventas.
