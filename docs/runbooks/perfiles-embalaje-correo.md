# Medición de productos y cajas para envíos

Actualizado el 16/10/2026. La [spec 090](../specs/090-apertura-caja-compartida.md)
reemplaza la estrategia inicial de un bulto por unidad y reglas por combinación.

La guía operativa vigente es [Carga de catálogo, embalajes e inventario](carga-cliente.md).
`medidas` describe el producto al comprador; `shippingProfile` describe una unidad
con su protección individual, **sin la caja exterior compartida**. Las cajas se
registran por separado en Sanity, con interior útil, exterior, tara y peso máximo.

El sistema calcula una sola caja para el pedido, con posiciones sin superposición,
sin giro ni apilado salvo autorización por producto. La tara se suma una sola vez.
Si no encuentra un acomodo válido, no inicia el pago. El cálculo es conservador;
el taller siempre debe comprobar el embalaje real antes de generar la etiqueta.
La [spec 125](../specs/125-margen-embalaje.md) incluye un margen de cotización y
muestra al comprador la tarifa resultante. Sanity almacena mediciones reales, sin
inflarlas manualmente. La preparación y etiqueta usan el paquete realmente medido.

Publicar cambios actualiza automáticamente la revisión usada para invalidar
cotizaciones; el dueño no debe incrementar una versión técnica manualmente.

La clasificación puede completarse después de las mediciones, pero es obligatoria
para cotizar. Confirmar con Zipnova clasificación, aceptación y condiciones de
vidrio, cerámica y espejos. No asignar General por defecto. Confirmar también
sucursal de despacho, cobertura y límites efectivos del transporte.

Credenciales y accesos privados nunca deben cargarse en Sanity.
