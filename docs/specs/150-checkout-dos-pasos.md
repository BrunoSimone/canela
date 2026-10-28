# PER-150 — Datos y confirmación en dos pasos

Reemplaza la interacción de cálculo manual de PER-149, por pedido de Bruno.

- Paso 1: contacto y domicilio, con un solo botón «Continuar». Sin importes,
  listado del pedido ni botón de pago. Continuar requiere todos los datos válidos.
- Continuar consulta el envío, muestra progreso e impide solicitudes duplicadas.
  Un error o falta de cobertura conserva los datos y permite volver a continuar.
- Paso 2: destino resumido, opciones de envío, piezas, total y Mercado Pago.
  Se selecciona inicialmente la tarifa vigente más económica; se puede cambiar.
  El resumen se muestra solo después de recibir un envío válido.
- «Editar datos» vuelve al formulario, conserva lo escrito y requiere confirmar
  nuevamente para obtener el total. Cambios del carrito invalidan el resumen.
- Una cotización vencida bloquea el pago y permite volver a los datos. No cobrar
  un nuevo importe sin mostrarlo antes. Mantener idempotencia y validación backend.
- Conservar comportamiento equivalente en el proveedor controlado local, con
  renovación del token de ensayo si vence. No tocar mantenimiento ni producción.
- El formulario de envío de cuadros usa también «Continuar», manteniendo su
  separación existente entre datos de entrega y confirmación del pago.

Pruebas: validación previa, avance con Enter/clic, carga, error/reintento, cobertura
vacía, múltiples transportes y cambio de total, edición conservando datos, cambio
de carrito, vencimiento y ausencia de pago automático al avanzar.
