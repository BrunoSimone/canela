# 125 — Margen de embalaje incluido en la cotización

Fecha: 26/10/2026. Complementa las specs 060, 070 y 090.

## Corrección de alcance

Bruno indicó que descartar margen al subir la tarifa deja descubierto justamente
el riesgo que se busca cubrir. Eligió **cotizar siempre con margen y mostrar al
comprador la tarifa resultante**, incluso cuando cambia de tramo. Esta regla
sustituye la comparación con precio base implementada inicialmente; no se conserva
como alternativa automática.

Sanity almacena medidas reales de la pieza protegida y de las cajas. Agregar al
paquete completo **5% del peso, redondeado hacia arriba a gramos, con un máximo de
200 g**, y **1 cm total a cada dimensión exterior**. La tara y el margen se aplican
una sola vez por caja, nunca por producto. El acomodo físico no cambia.

## Criterios de aceptación

- **MAR-01**: sumar margen después de calcular piezas y tara. No alterar posiciones
  ni simular más espacio útil. Respetar peso máximo de caja y límites de entrada;
  si no puede aplicarse el margen completo, bloquear la cotización y el pago.
- **MAR-02**: una consulta con las medidas que incluyen margen. Mostrar al comprador
  el precio devuelto para ese paquete y conservar también el costo vendedor.
  Un aumento de tramo no descarta margen ni vuelve a una tarifa sin margen.
  Sin servicio disponible, respuesta válida o cuota API, no se ofrece una opción
  alternativa sin protección. No hay comparación con una segunda tarifa base.
- **MAR-03**: firmar medidas elegidas, base y política mediante el fingerprint del
  plan. Revalidar en checkout esas mismas medidas, con una llamada y ambos precios
  exactos. Cambios en catálogo, caja o política obligan a recotizar antes de reservar
  stock o generar pago. Rechazar cotizaciones pendientes de la política anterior,
  incluyendo las que omitieron margen por precio, disponibilidad o límites.
- **MAR-04**: el panel distingue caja física estimada de medidas cotizadas con margen,
  sin afirmar que se añadió gratis. La preparación no se precarga como medición real.
  La etiqueta usa exclusivamente peso/medidas reales registrados y aprobación del
  costo vigente; nunca vuelve a sumar margen ni cambia el total pagado. Pedidos
  históricos pagados siguen siendo despachables y conservan sus datos de auditoría.
- **MAR-05**: configuración de servidor opcional, valores por defecto 5/200/1;
  `SHIPPING_MARGIN_WEIGHT_PERCENT` (0–20), `SHIPPING_MARGIN_MAX_WEIGHT_GRAMS`
  (0–1000), `SHIPPING_MARGIN_DIMENSION_CM` (0–5), enteros. Peso requiere porcentaje
  y tope ambos positivos o ambos cero. Los tres en cero permiten una desactivación
  técnica expresa, nunca un fallback automático. Valores inválidos fallan.
  La política no modifica el contexto de cuenta ni los modos de pago/envío.

## Verificación

Dominio: acumulación, tope, redondeo, dimensiones, límites e inmutabilidad.
Aplicación: conservar margen aunque la tarifa suba, no volver a la base ante errores,
checkout con snapshot preservado y precio revalidado, invalidar política anterior,
preparación real sin margen adicional. Persistencia SQL y presentación de medidas
estimadas/cotizadas, incluyendo pedidos históricos. Contraste de tarifas reales
con consultas únicamente, sin crear envíos ni pagos.

## Operación y límites

Una llamada inicial y una revalidación al pagar. Se conserva el timeout de 12 s y
el limitador compartido de 60 consultas por minuto, sin reintentos programados.
La holgura reduce el riesgo de subestimar pequeñas variaciones; no garantiza que
cualquier paquete final ni una tarifa futura cuesten lo mismo. Sigue vigente la
recotización y aprobación antes de crear la etiqueta. No cubre una caja distinta
ni sustituye pesar y medir. El comprador ve el costo de envío resultante sin
exponerle detalles técnicos del algoritmo.
