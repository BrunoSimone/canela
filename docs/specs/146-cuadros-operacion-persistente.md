# PER-146 — Circuito persistente de cuadros personalizados

2026-10-27. Autorizado por Bruno: cerrar el trabajo técnico independiente del taller,
en `codex/creador-cuadros-personalizados`, con pruebas y cobros reales bloqueados.
Extiende PER-130–145 y las decisiones del discovery 002.

## Alcance y límites

- Mantener el editor, la compra separada y el carrito de stock intactos.
- Implementar pedido persistente, reserva de capacidad, integración de pago/envío,
  configuración en Sanity, ficha de fabricación, guía privada y galería editorial.
- Las fotos originales y borradores siguen solo en memoria. Se guarda únicamente
  el mosaico aceptado, antes de iniciar el pago, con parámetros, materiales,
  aceptación, precio y cotización inmutables.
- Reutilizar PostgreSQL, Mercado Pago, Zipnova, autenticación y outbox de emails.
  No añadir servicios, cron ni cobros en producción. Sin despliegues ni cambios
  en los datos reales de Sanity o proveedores durante esta iteración.
- La integración persistente se habilita explícitamente en modo sandbox. Rechazar
  producción aunque haya credenciales o flags de comercio general habilitados.
  La activación comercial exige otra revisión expresa cuando Mariela confirme datos.
- Configurar las decisiones pendientes; no aprobar por defecto medidas, precios,
  paquetes, colores, plazos o condiciones. Los fixtures solo sirven en pruebas.

## Reglas y diseño

1. `custom_frame_order` extiende `orders`; conserva el diseño aceptado y la reserva
   de fabricación. No crear SKU ficticio en Sanity ni consumir stock del catálogo.
2. Cotizaciones persistidas, privadas y con vencimiento; precio y paquete calculados
   en servidor. Tarifas Zipnova firmadas y ligadas al diseño/destino/configuración.
   Se aplica el margen de embalaje existente. Ningún precio enviado por el cliente
   se considera autoritativo. Revalidar configuración y tarifa antes del pago.
3. Idempotencia por intento, transacción y bloqueo de capacidad compartida. Cupos
   y política provienen del taller. Mientras no se confirme una cola, el ensayo
   usa cinco lugares y rechaza excedentes. Un pago pendiente/ambiguo mantiene su
   lugar hasta resolución verificable; el paso del tiempo no demuestra rechazo.
   Sin cron: webhook, retorno del comprador y recuperación explícita en el panel.
4. Pago verificado aprueba una sola orden, consume el cupo y genera el aviso al
   taller. Rechazo definitivo libera cupo. Pago tardío luego de liberación requiere
   revisión; nunca inicia fabricación silenciosamente. No duplicar pedidos ni emails.
   Un rechazo definitivo permite retomar las celdas aceptadas en el editor con
   configuración y cotización nuevas. Pagados/pendientes no ofrecen otra compra.
5. Estados de fabricación: pendiente de pago → por fabricar → en fabricación →
   terminado. Cambios autenticados y con versión. Solo pedidos pagados permiten
   iniciar/terminar fabricación. Terminar libera el puesto de trabajo y habilita
   embalaje/envío; los rótulos requieren las comprobaciones existentes de Zipnova.
6. Guía HTML imprimible/PDF desde navegador, privada, con diseño, cuadrícula,
   leyenda numerada, códigos internos de materiales, conteos y medidas del snapshot.
   La versión de prueba se marca. No depende del catálogo vigente ni expone la foto.
7. Configuración Sanity: geometría/paleta, precios, paquetes por rango, plazo/cupo
   y confirmaciones pendientes claramente identificadas. Sin publicación automática.
   Los materiales/costos se almacenan en un dataset privado separado; el servidor
   verifica su ACL antes de leer. Studio ofrece un workspace opcional del taller.
   El cliente recibe solo colores públicos y una tabla de precios finales por tamaño.
8. Galería: consentimiento opcional, desmarcado; solo pedidos pagados autorizados
   pueden preparar una copia pública en borrador de Sanity. La copia no contiene
   referencia al pedido, destinatario ni email. Mariela publica/oculta con Sanity.
   La relación y evidencia permanecen en PostgreSQL. Compatibilidad se valida al
   reutilizar con la configuración actual; nunca alterar pedidos anteriores.
9. Emails existentes del taller y despacho reutilizados, con contexto del cuadro;
   el panel identifica fabricación y guía. No enviar emails reales durante pruebas.

## Criterios de aceptación

- CA-01: configuración incompleta/provisional jamás habilita producción; incluso
  con flags generales de producción se rechaza el endpoint de personalizados.
- CA-02: servidor valida grilla, versiones, consentimiento, destinatario, límites
  de paquete y tarifa; manipular importes o reutilizar quote con otro diseño falla.
- CA-03: reinicio del servicio conserva pedido/diseño; doble clic y concurrencia
  no duplican pago ni sobrepasan cupos. Reintento devuelve el mismo pedido.
- CA-04: pagos aprobado/pendiente/rechazado, webhook duplicado y pago tardío dan
  estados correctos y no modifican inventario Sanity ni carrito.
- CA-05: permisos, origen y versión protegen fabricación, guía y publicación;
  solo el pedido pagado puede producir guía/fabricación. Envío antes de terminado falla.
- CA-06: guía coincide celda por celda y conteos con el diseño aceptado, incluidos
  retoques. Cambios posteriores de catálogo no alteran el pedido ni la guía.
- CA-07: galería consentida y curada, sin datos privados, publicación idempotente;
  errores de Sanity recuperables; diseños incompatibles no se compran.
- CA-08: recorrido UI sandbox separado, cotización/aceptación/MP/resultado, y panel
  usable en celular/escritorio; la simulación local sigue disponible sin proveedores.
- CA-09: regresión del checkout de stock, emails, preparación y shipping existentes.

## Plan y evidencia

A. Configuración, contratos y guardas; pruebas de validación y bloqueo.
B. Migración aditiva, cotizaciones/pedidos/cupos y confirmación de pago; integración PostgreSQL.
C. Compra sandbox, estado público, panel/guía y preparación/envío.
D. Sanity/galería y notificaciones; permisos y privacidad.
E. Suites afectadas, base aislada, TypeScript/lint/build y revisión responsive.
Registrar resultados y límites en `docs/evidence/PER-146.md`.

Pendientes exclusivamente del taller: reconciliar geometría; aprobar precios,
paquetes, disponibilidad de colores, plazos/cupos y condiciones de venta.
