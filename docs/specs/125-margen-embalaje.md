# 125 — Margen de embalaje sin aumento de tarifa

Fecha: 26/10/2026. Complementa las specs 060, 070 y 090.

## Alcance

Cubrir pequeñas variaciones del embalaje estimado al cotizar, manteniendo el precio
del mismo transporte y servicio. Sanity conserva medidas reales de la pieza protegida
y de las cajas. No cambia el acomodo físico, la cantidad de bultos ni la preparación.

Política inicial: agregar al paquete completo **5% del peso, redondeado hacia arriba
a gramos, con un máximo de 200 g**, y **1 cm total a cada dimensión exterior**.
La tara y el margen se aplican una sola vez por caja, nunca por producto.

## Criterios de aceptación

- **MAR-01**: sumar el margen después de calcular piezas y tara. No alterar las
  posiciones ni simular más espacio útil. Respetar peso máximo de caja y límites de
  entrada; si el margen completo excede alguno, conservar la estimación sin margen.
- **MAR-02**: cotizar base y margen, como máximo dos llamadas iniciales. Para cada
  combinación de transporte, servicio y despacho, aplicar margen solamente cuando
  precio comprador **y** precio vendedor coinciden exactamente con la base.
  Una subida de cualquiera de ellos, ausencia del servicio o fallo conocido de la
  consulta adicional conserva la base. Un fallo de la consulta base bloquea el flujo.
  No inventar tolerancias del transporte ni prometer cobertura de cualquier variación.
- **MAR-03**: firmar las medidas elegidas, base, resultado del margen y política
  mediante el fingerprint del plan. Revalidar en checkout solamente las medidas
  elegidas, con una llamada y precios exactos. Cambios en catálogo, caja o política
  obligan a recotizar antes de reservar stock o generar el pago.
- **MAR-04**: el panel distingue caja física estimada y medidas cotizadas con margen;
  informa cuando no se aplicó margen. No precarga la preparación como si se hubiera
  pesado. La etiqueta usa exclusivamente las medidas reales registradas y la aprobación
  del costo vigente; nunca vuelve a sumar margen. Los pedidos pagados anteriormente
  siguen siendo despachables aunque cambie la política de nuevas cotizaciones.
- **MAR-05**: configuración de servidor opcional, valores por defecto 5/200/1;
  `SHIPPING_MARGIN_WEIGHT_PERCENT` (0–20), `SHIPPING_MARGIN_MAX_WEIGHT_GRAMS`
  (0–1000), `SHIPPING_MARGIN_DIMENSION_CM` (0–5), enteros. Peso requiere porcentaje
  y tope ambos positivos o ambos cero. Los tres en cero desactivan el margen.
  Valores inválidos fallan explícitamente. No cambian contexto de cuenta ni modos
  de pago/envío, y no hay llamadas extras si está desactivado.

## Verificación

Pruebas de dominio: acumulación, tope, redondeo, dimensiones, límites e inmutabilidad.
Pruebas de aplicación: comparación por servicio, cambios en ambos precios, errores,
checkout con snapshot preservado, cambio de política y preparación real sin margen.
Pruebas de presentación: distinguir medidas físicas de cotizadas y compatibilidad
con pedidos anteriores. Contraste de cotizaciones reales sin crear envíos ni pagos.

## Operación y límites

La comparación adicional consume cuota de API y puede añadir latencia (timeout
existente de 12 s por llamada). Se conserva el limitador compartido de 60 consultas
por minuto. Si falla solo la consulta de margen, el panel lo identifica como no
disponible; no se presenta como aplicado. No hay reintentos ni consultas programadas.
El precio puede cambiar luego por tarifa, destino o embalaje final. Sigue vigente
la recotización y aprobación antes de generar la etiqueta. No cubre una caja distinta
ni sustituye pesar y medir. El checkout público no expone decisiones técnicas del margen.
