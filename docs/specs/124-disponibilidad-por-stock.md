# Disponibilidad calculada desde el stock

2026-10-26. Bruno pide que la existencia de unidades defina la disponibilidad,
sin seleccionar manualmente «En stock», «Pieza única» o «Por encargo».

## Criterios de aceptación

- **STK-01:** Las unidades disponibles son `stockOnHand - reserved`. Cero impide
  comprar; un saldo positivo permite solicitar unidades, sujeto a la reserva
  atómica del checkout. No se publican las cantidades ni documentos privados.
- **STK-02:** Se retiran modalidad y nota de estado de la edición y de las
  decisiones de catálogo, cotización, checkout e inventario. Los valores antiguos
  se conservan ocultos para compatibilidad, sin efecto. Una unidad se representa
  cargando 1; no existe un límite adicional derivado de una etiqueta.
- **STK-03:** Los productos publicados y habilitados para venta permanecen en el
  catálogo al agotarse: muestran «Agotado» y no permiten agregar ni incrementar
  desde tarjeta o detalle. Con disponibilidad no llevan una etiqueta «En stock».
  La pausa explícita «Habilitar venta» sigue siendo independiente del saldo:
  un producto pausado o sin inventario configurado no se ofrece en el catálogo.
- **STK-04:** Los datos estructurados usan la misma disponibilidad. Al abrir la
  tienda o el checkout se actualiza la elegibilidad del carrito persistido desde
  el servidor; se preservan sus cantidades y se explica qué pieza ya no está
  disponible. Restablecer stock vuelve a permitir comprarla.
- **STK-05:** Un carrito abierto puede quedar desactualizado: el checkout siempre
  vuelve a reservar contra Sanity. No se invoca Mercado Pago si falta stock.
  Mantener pruebas de la última unidad, reservas, pagos y reposición.
- **STK-06:** Actualizar documentación de carga y verificar tarjeta, detalle,
  carrito, Studio y compilación. No modificar cantidades reales ni abrir ventas.

Sustituye las reglas de modalidades en CAT-03/INV-07 y la ocultación de agotados
de RF-CHK-001/CA-001 (spec 010). Mantiene la pausa editorial, mantenimiento,
validaciones del perfil de envío y protección transaccional existentes.
