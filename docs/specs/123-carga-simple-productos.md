# Carga simple de productos en Sanity

2026-10-26. Bruno pide reducir los campos de la ficha a los necesarios para
publicar y vender, y revisar cuáles siguen siendo necesarios.

> Actualización: [spec 124](124-disponibilidad-por-stock.md) retira modalidad y
> nota de estado. La disponibilidad se deriva del inventario.

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
- **CAT-03:** Material y medidas sin envolver quedan en **Detalles opcionales**,
  contraído inicialmente. Modalidad y nota anteriores se conservan ocultas y sin
  efecto, según spec 124. Las medidas descriptivas son opcionales; nunca se
  sustituyen por las dimensiones de protección como tamaño de la pieza.
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
- **CAT-08:** Indicar en los títulos qué datos de la ficha son obligatorios y
  cuáles opcionales. En Envío, indicar que peso, tres medidas y contenido son
  necesarios para cotizar. Conservar la carga gradual: esos requisitos no se
  confunden con los de publicación de la ficha.
- **CAT-09:** Diferenciar tres niveles: pieza sin envolver (información pública),
  pieza con protección individual (acomodo), y caja cerrada (cotización). Explicar
  que el peso estimado suma unidades protegidas más caja y relleno común. El
  paquete terminado se mide y pesa en Preparación; se consulta su costo real y se
  revisa cualquier diferencia antes de generar la etiqueta, según el flujo vigente.

## Auditoría de campos

| Campos | Uso / decisión |
| --- | --- |
| Nombre, precio, fotos | Identificación, catálogo y checkout; visibles |
| Categoría, subcategoría | Secciones y filtros de tienda; visibles |
| Descripción | Información de la pieza; visible, opcional |
| Peso, alto, ancho, largo protegidos | Acomodo y cotización; sección Envío |
| Clasificación del contenido | Declaración a Zipnova; sección Envío, sin códigos en las etiquetas |
| Modalidad y nota anteriores | Ocultas y sin efecto; disponibilidad calculada desde Stock (spec 124) |
| Medidas sin envolver, material | Información adicional que ya muestra la tienda; opcionales |
| Giro, apilado, caja exclusiva | Restricciones reales de embalaje; opciones de acomodo |
| Versión, orden | Campos técnicos ocultos, mantenidos por la aplicación |
| Cantidades, habilitación y motivo | Pestaña Stock; auditoría y reservas conservadas |

Complementa [090](090-apertura-caja-compartida.md) y
[100](100-inventario-sanity.md); no cambia el alcance del checkout ni abre ventas.
