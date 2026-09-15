# Checkout inmediato e inventario

## Estado

Aprobada para implementación. El bloqueo temporal de 10 minutos, Neon,
Orders API con `automatic_async` y el carrito multiproducto están confirmados.

## Contexto y problema

Canela Store muestra productos obtenidos de Sanity y deriva la intención de compra a WhatsApp. No existe una orden persistida ni una autoridad transaccional de stock. La página puede permanecer cacheada y dos personas pueden intentar comprar simultáneamente la última unidad.

## Objetivo

Permitir el pago inmediato de productos con stock disponible, garantizando que como máximo se venda la cantidad interna registrada aunque el catálogo visible esté desactualizado o existan compras concurrentes.

## Fuera de alcance

- Pagos pendientes, offline o de acreditación diferida.
- Productos por encargo y personalizados.
- Cotización y fulfillment de Correo Argentino.

## Actores

- **Comprador:** quiere saber si una pieza puede comprarse y pagarla sin coordinar manualmente.
- **Dueño:** mantiene cantidades internas y necesita evitar sobreventa.
- **Mercado Pago:** procesa el pago inmediato y notifica el resultado.
- **Operación de Canela:** resuelve errores, reembolsos y reconciliaciones.

## Definiciones

- `stock_on_hand`: unidades físicas registradas.
- `reserved`: unidades retenidas por checkouts activos.
- `available`: `stock_on_hand - reserved`.
- **Pago directo:** el comprador paga durante Checkout Pro; no se ofrece un medio offline. Mercado Pago puede conservar brevemente un estado técnico `processing` si se aprueba `automatic_async`.
- **Bloqueo de checkout:** retención interna, corta y expirable creada antes de enviar al comprador a Mercado Pago. No se comunica al comprador como un tercer estado comercial.

## Requisitos funcionales

- **RF-CHK-001:** El catálogo público debe incluir únicamente productos con `available > 0` y habilitados editorialmente.
- **RF-CHK-002:** El sistema no debe exponer la cantidad exacta disponible al comprador.
- **RF-CHK-003:** Al comenzar el checkout, el servidor debe releer producto, precio y disponibilidad desde sus fuentes autoritativas.
- **RF-INV-001:** El servidor debe reservar la cantidad solicitada mediante una operación atómica que solo tenga éxito si `available >= cantidad solicitada`.
- **RF-INV-002:** Una pieza única debe aceptar como máximo una unidad por orden.
- **RF-INV-003:** Si la reserva deja `available = 0`, el sistema debe invalidar la vista cacheada del catálogo para ocultar el producto lo antes posible.
- **RF-INV-004:** Si el pago se rechaza, la creación de la order MP falla de forma definitiva o la reserva vence sin aprobación ni procesamiento activo verificado, el sistema debe liberar la reserva exactamente una vez. Un timeout ambiguo del proveedor no cuenta como fallo definitivo.
- **RF-INV-005:** Al aprobarse el pago, el sistema debe convertir la reserva en venta: disminuir `stock_on_hand` y `reserved` por la misma cantidad dentro de una transacción.
- **RF-INV-006:** El dueño debe disponer de una operación protegida para reponer o corregir `stock_on_hand`, con auditoría básica.
- **RF-PAY-001:** El servidor debe crear una order de Mercado Pago por pedido Canela mediante Orders API, usando precio y total calculados en backend.
- **RF-PAY-002:** La order MP debe excluir medios offline/diferidos y usar la política `capture_mode` aprobada en la spec 020.
- **RF-PAY-003:** Cada orden debe usar una referencia externa e idempotency key únicas.
- **RF-PAY-004:** Una página de retorno no debe marcar una orden como pagada.
- **RF-PAY-005:** El webhook debe validar su firma y luego consultar el pago a Mercado Pago antes de aceptar su estado, monto, moneda y referencia.
- **RF-PAY-006:** Webhooks duplicados o fuera de orden no deben repetir transiciones, consumir stock dos veces ni crear dos envíos.
- **RF-PAY-007:** Un proceso de reconciliación debe recuperar órdenes cuyo resultado no haya llegado correctamente por webhook.
- **RF-ORD-001:** Antes de redirigir a Mercado Pago debe existir una orden con snapshot inmutable de ítems, precios y total.
- **RF-ORD-002:** El comprador debe recibir un resultado observable: aprobado, rechazado, sin stock o error recuperable.

## Requisitos no funcionales

- **RNF-CON-001:** La protección contra sobreventa debe depender de una restricción/transacción de base de datos, no de caché, JavaScript ni orden de llegada a una función serverless.
- **RNF-SEC-001:** Access Token, firma de webhooks y credenciales de base deben permanecer exclusivamente en backend y secretos del entorno.
- **RNF-SEC-002:** Los endpoints deben validar esquema, cantidades enteras positivas y pertenencia entre orden, reserva y pago.
- **RNF-IDEM-001:** Crear la order MP, liberar reserva y confirmar pago deben ser operaciones idempotentes.
- **RNF-OBS-001:** Cada orden debe tener un correlation id presente en logs estructurados sin datos de pago ni secretos.
- **RNF-OBS-002:** Deben medirse reservas creadas/liberadas, conflictos de stock, pagos aprobados/rechazados, webhooks inválidos y reconciliaciones.
- **RNF-CACHE-001:** La invalidación de caché es una mejora de frescura; un fallo de invalidación no puede permitir sobreventa.

## Reglas de negocio

- **RN-001:** Todo producto de pago directo usa stock numérico interno, incluso si comercialmente se presenta como pieza única.
- **RN-002:** Un producto con cero disponibilidad no se muestra en el catálogo.
- **RN-003:** La cantidad exacta no se muestra públicamente.
- **RN-004:** La reserva se realiza antes de crear/redirigir a Mercado Pago.
- **RN-005:** Solo se descuenta inventario físico al confirmar un pago aprobado; mientras tanto la unidad está reservada.
- **RN-006:** Los productos por encargo y personalizados no participan de este checkout hasta tener una spec propia.
- **RN-007:** Ante pago aprobado válido sin una reserva consumible, la orden pasa a revisión crítica y no se crea fulfillment automático; la operación debe resolver entrega o reembolso.
- **RN-008:** Para el comprador, la disponibilidad es binaria: el producto está disponible para comprar o no lo está. `reserved`/`payment_pending` son estados técnicos internos.
- **RN-009:** El bloqueo dura 10 minutos, configurable sin migración. La order MP usa `PT10M` si la prueba de contrato lo confirma.
- **RN-010:** Un job no libera solo por reloj: primero consulta el estado
  autoritativo de la order MP. Si está aprobado, confirma; si sigue procesando,
  conserva; si está `created` o `action_required`, solicita su cancelación y solo
  libera después de verificar `canceled`; si ya terminó sin pago, libera.

## Escenarios y criterios de aceptación

- **CA-001 — Agotado no visible:** Dado un producto habilitado con `available = 0`, cuando se genera una vista nueva del catálogo, entonces el producto no aparece.
- **CA-002 — Caché desactualizada:** Dado que una vista cacheada todavía muestra un producto agotado, cuando el comprador inicia checkout, entonces el servidor responde sin stock, no crea una order MP y no altera inventario.
- **CA-003 — Compra paralela:** Dado un producto con una unidad disponible, cuando dos solicitudes intentan reservarla concurrentemente, entonces exactamente una crea reserva y la otra recibe sin stock.
- **CA-004 — Cantidad excesiva:** Dado un producto con dos unidades, cuando se solicitan tres, entonces no se crea una reserva parcial ni una order MP.
- **CA-005 — Precio manipulado:** Dado un precio distinto enviado por el navegador, cuando comienza el checkout, entonces el sistema ignora ese importe y usa el precio autoritativo.
- **CA-006 — Reserva durante redirección:** Dado un checkout activo que reservó la última unidad, cuando otro comprador intenta comprarla antes del resultado, entonces recibe sin stock.
- **CA-007 — Pago rechazado:** Dada una reserva activa y un pago rechazado verificado, cuando se procesa el resultado, entonces la reserva se libera una sola vez y el producto vuelve a ser elegible para el catálogo.
- **CA-008 — Pago aprobado:** Dada una reserva activa y un pago aprobado cuyo monto, moneda y referencia coinciden, cuando se procesa el webhook, entonces la orden queda pagada y el inventario físico se descuenta exactamente una vez.
- **CA-009 — Webhook duplicado:** Dado un pago ya procesado, cuando llega nuevamente la misma notificación, entonces no cambian cantidades ni se repiten efectos.
- **CA-010 — Retorno engañoso:** Dado que el comprador abre manualmente una URL de éxito, cuando no existe un pago aprobado verificado, entonces la orden no se marca pagada.
- **CA-011 — Falla al crear order MP:** Dada una reserva creada, cuando Mercado Pago rechaza definitivamente la creación, entonces la operación queda registrada, la reserva se libera y el comprador puede reintentar.
- **CA-012 — Invalidación fallida:** Dado que falla la invalidación de caché después de agotarse un producto, cuando otro comprador usa la vista antigua, entonces CA-002 sigue evitando la sobreventa.
- **CA-013 — Reposición:** Dado un producto agotado, cuando el dueño repone una cantidad positiva mediante la operación protegida, entonces queda auditado y vuelve a aparecer tras la revalidación.
- **CA-014 — Expiración segura:** Dado un bloqueo cuyo reloj venció, cuando el proceso de expiración lo inspecciona, entonces consulta primero Mercado Pago y solo lo libera si no existe un pago aprobado asociado.
- **CA-015 — Webhook tardío:** Dado un pago aprobado dentro de la vigencia cuya notificación llega tarde, cuando reconciliación consulta el pago antes de liberar, entonces la venta se confirma y la unidad no vuelve a ofrecerse.
- **CA-016 — Estado público binario:** Dado un producto bloqueado por otro checkout, cuando un comprador consulta una vista actualizada, entonces el producto no aparece o no permite comprar; nunca se muestra como “reservado”.

## Datos e integraciones

### Catálogo

Sanity continúa siendo propietario del nombre, descripción, imágenes, precio editorial y estado de publicación.

### Base privada

Como mínimo:

- `inventory_item(product_id, stock_on_hand, reserved, updated_at)`;
- `stock_reservation(id, order_id, product_id, quantity, status, expires_at)`;
- `order(id, status, currency, subtotal, total, created_at)`;
- `order_item(order_id, product_id, name_snapshot, unit_price, quantity)`;
- `payment_attempt(order_id, provider, provider_order_id, status, idempotency_key)`;
- registro de ajustes de inventario.

### Mercado Pago

- Checkout Pro.
- Order de vigencia corta creada mediante `POST /v1/orders`.
- `capture_mode` aprobado y exclusión de pagos offline validados en test.
- Webhook firmado y consulta autenticada de `GET /v1/orders/{id}`.

## Restricciones y supuestos

- Decisión: usar `capture_mode = automatic_async` y conservar el bloqueo mientras
  Mercado Pago informe `processing`.
- Supuesto pendiente: Mercado Pago permite excluir todos los medios no inmediatos requeridos por esta política para la cuenta argentina del dueño.
- Decisión: Neon PostgreSQL es la base transaccional, según ADR-001.
- Supuesto pendiente: los productos por encargo siguen como consulta manual en el primer incremento.

## Riesgos y preguntas abiertas

- Interfaz inicial de reposición: Sanity, panel mínimo separado o tarea operativa protegida.
- Política de reembolso y responsable de resolución manual.
- Los perfiles de embalaje y la cotización real bloquean producción, pero no las
  pruebas de Mercado Pago.

## Dependencias

- Cuenta/aplicación de Mercado Pago con credenciales de prueba.
- Decisión de persistencia privada mediante ADR.
- Spec de órdenes y datos del comprador.
- Estrategia de testing con concurrencia real de base de datos.
- Política de privacidad, devolución y reembolso.

## Orden de entrega

1. Construir y validar Mercado Pago en ambiente de pruebas con una modalidad de entrega no pública.
2. Integrar la cotización/selección de Correo Argentino y recalcular el total final en backend.
3. Habilitar compra en producción solamente cuando cada orden incluya una modalidad de entrega válida y su costo, o retiro gratuito confirmado por el negocio.

La secuencia de desarrollo no implica cobrar productos sin resolver su entrega.
