# PER-132 — Compra separada de cuadros, simulación local

Estado: implementado y validado localmente. Rama `codex/creador-cuadros-personalizados`.

## Alcance aprobado

Extiende PER-130/131 y PER-DEC-014. Recorrido: imagen → diseño → resumen aceptado → domicilio → cotización → pago simulado → resultado. El carrito de productos y el checkout real no participan. Sin cobros, envíos, emails, escrituras en Sanity ni pedidos productivos.

El creador vacío elimina «Probar con un ejemplo». El tamaño queda deshabilitado y no aparecen medidas, cantidades, colores ni precios hasta tener un diseño válido. Una foto inválida no habilita controles; reiniciar vuelve al estado vacío. La entrada explícita «Crear uno similar» desde la galería conserva su diseño seleccionado.

## Diseño de interacción

Mantener la identidad crema/marrón y la imagen como foco. Resumen de diseño con aceptación explícita; formulario de domicilio y resumen de importes; selector accesible de resultado de prueba sin campos de tarjeta. Encabezados enfocados al cambiar de paso, errores anunciados, una columna en móvil. Permitir volver y conservar la edición en memoria. Editar el domicilio invalida la cotización. El aviso de simulación acompaña todo el recorrido.

## Contrato y límites

- Configuración, paleta, precios, embalajes y tarifas ilustrativas provienen del backend. El servidor reconstruye el diseño con su configuración vigente y recalcula importes; no confía en precios ni geometría del cliente. La foto original nunca se transmite.
- API exclusiva `/api/cuadros/prueba`. Disponible solamente en desarrollo local con la función habilitada; producción y previews desplegados rechazan operaciones incluso con credenciales reales presentes.
- Cotizaciones de 15 minutos con snapshot de diseño, destinatario, paquete y precios. Repositorio temporal en memoria: hasta 100 cotizaciones, 10 intentos por cotización y retención de 30 minutos. Reiniciar el servidor o recargar el navegador no restaura la sesión. No es almacenamiento de diseños entre sesiones ni persistencia apta para ventas.
- Pago simulado aprobado, pendiente o rechazado. Idempotencia por intento; un diseño/cotización no produce dos aprobaciones. Pendiente puede resolverse explícitamente en la simulación. Rechazado permite un nuevo intento. Nunca se inicia fabricación por un estado pendiente o rechazado.
- Capacidad ilustrativa: cinco pedidos activos; controles atómicos en el repositorio de prueba. Liberación al rechazar o al vencer la simulación; limpieza al recibir solicitudes, sin cron. La reserva real requiere persistencia transaccional y política confirmada.
- Formulario valida domicilio argentino, nombre, email, teléfono y documento. Ofrecer datos ficticios servidos por backend para no necesitar información personal durante QA.
- Aislar el recorrido bajo contratos propios. Ninguna opción de la interfaz puede cambiarlo a cobro real. Migrar a venta real será otra iteración con almacenamiento durable, reservas, MP/Zipnova, notificaciones y recuperación de fallas.

## Casos de aceptación y pruebas

1. Vacío / imagen inválida / carga en curso / válida / reinicio: visibilidad y habilitación correctas.
2. Selección desde galería, recorte, tamaño, colores y retorno desde resumen conservan el diseño.
3. Sin aceptar diseño no se avanza. Domicilio inválido no genera cotización.
4. Backend rechaza versión de taller antigua, grilla inválida o colores desconocidos; recalcula precio y envío con fixtures propios.
5. Cotización vence, edición invalida, errores de red permiten reintentar sin perder el diseño.
6. Aprobado, pendiente → aprobado/rechazado, rechazado → reintento; no doble pedido ante doble clic/reenvío, ni transición de un resultado terminal.
7. Capacidad agotada y liberación; snapshots inmutables y memoria acotada.
8. API bloqueada en producción, origen ajeno y cuerpos inválidos/grandes. Respuestas privadas sin caché. No llamadas a proveedores ni modificación del carrito.
9. Recorrido manual en navegador y revisión responsive a 375 px; tests, lint, TypeScript y build.

## Datos pendientes de Mariela

Paleta, geometría real, precios, paquetes por tamaño y política de capacidad/plazos. Los fixtures se identifican como tales; las tarifas simuladas no son cotizaciones de Zipnova.
