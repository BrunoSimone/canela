# PER-149 — Checkout y navegación después del QA manual

2026-10-28. Misma rama del creador; conservar el mantenimiento de producción.

## Alcance y aceptación

1. El checkout presenta contacto/domicilio, cálculo y selección de envío, y luego
   las piezas y el resumen con el pago. El resumen no es una barra lateral previa
   al formulario en escritorio ni en celular.
2. No mostrar un importe de envío ni un total final hasta calcular para un destino
   válido. También en el proveedor de ensayo. Cambiar destino/carrito o vencer la
   cotización invalida el importe y vuelve a bloquear el pago.
3. Mercado Pago permanece deshabilitado hasta tener contacto/domicilio válidos,
   piezas disponibles y una cotización seleccionada vigente. Validar también en
   submit y conservar las validaciones del servidor y la idempotencia.
4. Mantener React controlado, HTML y validadores compartidos con el servidor.
   Informar errores de campos al salir de ellos, sin esperar a enviar el formulario.
5. Quitar los dos párrafos sobre revalidación/reserva solicitados y el aviso de
   ensayo del catálogo de cuadros. Conservar las protecciones y la identificación
   del ambiente en el paso de pago.
6. Navegación: Catálogo, Catálogo de cuadros y Crear mi cuadro, con el mismo estilo.
   Activo por color/subrayado sutil, sin fondo de botón. Mantener aria-current,
   foco visible, menú móvil y URLs existentes (/tienda, /cuadros, /crear-cuadro).
7. Los ejemplos locales son mosaicos sintéticos del repositorio; tarjetas y
   carruseles comparten esa fuente. Producción usa diseños publicados en Sanity.

## Verificación

- Pruebas de interacción: campos inválidos/incompletos, otro destinatario,
  cotización antes/después de destino, cambios de carrito/destino, vencimiento,
  envío válido y submit programático inválido.
- Regresión de validadores HTTP, navegación y compra independiente de cuadros.
- Revisión visual de checkout y header en escritorio y celular, TypeScript y lint.
- No efectuar cobros, envíos, ni desactivar el mantenimiento.
