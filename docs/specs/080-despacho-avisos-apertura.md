# Despacho, avisos y preparación de apertura

> Actualización 16/10/2026: la [spec 090](090-apertura-caja-compartida.md)
> reemplaza la estrategia de bultos por unidad y agrega caja compartida, inventario,
> aprobación de costo real y ejecución periódica de avisos.

## Estado

Alcance autorizado por Bruno el 2026-10-14. Continúa specs 020/060/070 e INT-05.
Spec escrita antes de implementar. Implementación y verificación local completadas
2026-10-14; ver [OPS-01](../evidence/OPS-01.md). Cobros y envíos productivos permanecen
cerrados. No desplegar, contratar servicios ni enviar consultas comerciales.

## Requisitos y criterios verificables

- **OPS-01 — Despacho explícito:** una sesión administrativa del mismo origen
  puede confirmar entrega al transporte de un pedido pagado con etiqueta lista,
  ID remoto vigente y enlace de seguimiento HTTPS válido. Debe marcar una
  confirmación explícita. Guardar actor, fecha y referencia; pasar a `shipped` y
  encolar aviso al comprador en la misma transacción. Etiquetar solo no despacha.
  Sandbox presenta «Simular despacho». Demo, falta de sesión, pago no apto,
  etiqueta ausente, contexto cambiado o ID remoto distinto rechazan sin efectos.
- **OPS-02 — Idempotencia:** doble confirmación y concurrencia producen un único
  despacho y un único aviso. No llamar a MP ni crear otro envío. Un webhook
  duplicado después del despacho no retrocede el pedido ni vuelve a ajustar stock.
- **OPS-03 — Compra pagada:** la transición verificada a `paid` encola un aviso al
  dueño en su misma transacción. Rechazo, pendiente, revisión y duplicados no crean
  avisos de compra. Rollback revierte también el aviso. No enviar retrospectivamente
  correos de pedidos antiguos al aplicar la migración.
- **OPS-04 — Emails:** React Email mantiene HTML/texto de dos templates: compra
  pagada para el dueño (productos, total, enlace autenticado al pedido) y despacho
  para comprador (referencia, transporte, enlace de seguimiento y TN si existe).
  No incluir documento, dirección completa, enlaces de acceso ni secretos. Resend
  es el transporte. No agregar emails de tránsito ni cronología logística propia.
- **OPS-05 — Cola durable:** eventos únicos por pedido/tipo. Persistir destinatario,
  remitente y contenido antes del primer envío. Claim exclusivo con lease y
  recuperación tras caída. Reintentos mantienen payload y clave de idempotencia.
  Resend conserva claves 24 h: usar ventana conservadora de 23 h desde primer
  intento; pasado ese plazo un resultado incierto pasa a revisión manual sin
  reenviar. Errores permanentes pasan a revisión; transitorios esperan backoff.
  Un fallo del correo no revierte pago/despacho. «Enviado» significa aceptado por
  Resend, no confirma entrega en bandeja. Nunca exponer payload ni emails en logs.
- **OPS-06 — Operación de avisos:** intentar el envío después de procesar pago o
  despacho. Estado y acción de reintento autenticada en la ficha. CLI de procesamiento
  y endpoint protegido por secreto para un scheduler futuro, sin contratar ni
  configurar uno en esta iteración. El reintento respeta lease/backoff/ventana y
  no fuerza mensajes en revisión. Sin configuración, conservar pendientes.
- **OPS-07 — Entornos:** `ORDER_EMAIL_MODE=disabled|test|production`, disabled por
  defecto. Test redirige exclusivamente a `ORDER_EMAIL_TEST_TO` y marca asunto y
  cuerpo como prueba; nunca usa destinatarios de compradores. Production exige
  configuración explícita, correo del dueño y credenciales productivas. Una
  notificación o pedido de test no puede procesarse como producción ni viceversa.
- **OPS-08 — Preparación productiva:** selección separada `PAYMENT_ENVIRONMENT`
  test/production para credenciales MP y validación del webhook live_mode.
  Persistir entorno del pedido, validarlo en reconciliación y fulfillment. Nuevos
  cobros productivos requieren `COMMERCE_PRODUCTION_APPROVED=1`, HTTPS, Zipnova
  operativo, perfil/cotización real, fulfillment operativo y correo productivo
  configurados. Sin fallback a tarifa controlada ni credenciales de test. Desactivar
  checkout o mantenimiento no impide verificar pagos ya iniciados. La preparación
  permite configurar ese modo a futuro; no se activa ni verifica con dinero real.
- **OPS-09 — Prueba integrada:** desde tarifa firmada iniciar checkout, verificar
  pago, consumir stock una vez, preparar, crear/recuperar etiqueta, confirmar
  despacho y entregar ambos avisos una vez. Cubrir errores en cada frontera,
  duplicados, origen/autorización, modos mezclados y recuperación tras timeout.
  PostgreSQL real aislado; servicios externos con contratos controlados para la
  suite determinista. Distinguir esa evidencia de una compra externa completa.
- **OPS-10 — Entrega operable:** preflight de configuración sin imprimir secretos,
  migraciones aditivas, guía de activación/reversión, evidencia por requisito y
  consultas a Zipnova redactadas (frágiles, multibulto y regreso a operativo).

## Supuestos y límites

Confirmación manual de despacho registrada por el taller; no se modifica el
estado remoto del transporte ni se afirma que este lo confirmó. Si hay URL de
seguimiento válida y aún no hay TN, enviar la URL sin inventar un número.
En pruebas se puede simular ese acto con un pedido sintético. No implementar
reembolsos, cancelación remota ni edición de un envío ya confirmado.

La operación sigue limitada a un bulto y dropoff hasta resolver las condiciones
comerciales. Los datos de embalaje reales, stock y la apertura requieren al dueño.
No cambiar claves o flags de Vercel/Neon ni enviar mensajes a soporte desde esta tarea.

## Diseño y fuentes

[Diseño de outbox y entornos](../architecture/005-despacho-outbox-entornos.md),
[plan de pruebas e incrementos](../plans/006-despacho-avisos-apertura.md).
Contrato externo: [Resend idempotencia](https://resend.com/docs/dashboard/emails/idempotency-keys),
[envío](https://resend.com/docs/api-reference/emails/send-email), consultados 2026-10-14.
