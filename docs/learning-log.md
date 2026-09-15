# Registro de aprendizaje

## 2026-09-09 — Consistencia entre pago y stock

**Contexto:** Una pieza puede aparecer por caché o ser elegida por dos compradores simultáneamente.

**Decisión comprendida o practicada:** Bruno eligió pago inmediato y stock numérico interno, con contraste autoritativo contra la base antes de pagar.

**Justificación:** Simplifica los estados comerciales y evita que el frontend o su caché sean la fuente de verdad.

**Alternativas consideradas:** Aceptar pagos pendientes con reservas largas; tratar todo como consulta manual; reservar mediante una operación atómica antes de Checkout Pro.

**Evidencia del proyecto:** `docs/specs/010-checkout-inventario.md`, especialmente CA-002 y CA-003.

**Qué puedo repetir ahora:** Identificar que una validación visual o cacheada no evita sobreventa y que el control debe ejecutarse en la base.

**Pendiente de reforzar:** Explicar por qué incluso un checkout de pago inmediato necesita una reserva corta durante la redirección y cómo se libera sin carreras.

## 2026-09-09 — Estado comercial binario vs. bloqueo técnico

**Contexto:** Bruno planteó que una pieza debería estar vendida o no vendida, sin un estado de reserva visible.

**Decisión comprendida o practicada:** Se aprobó un bloqueo temporal interno al iniciar Checkout Pro, manteniendo una disponibilidad pública binaria.

**Justificación:** Mercado Pago y la base de Canela son sistemas distintos; durante la redirección no pueden confirmar el cobro y descontar stock en una única transacción. El bloqueo evita que dos personas paguen la última pieza.

**Alternativas consideradas:** Descontar antes y devolver ante fallo —que es el mismo patrón con otro nombre—; descontar después y aceptar sobreventa/reembolso; autorización y captura posterior más compleja.

**Evidencia del proyecto:** `docs/specs/010-checkout-inventario.md`, CA-014 a CA-016; `docs/specs/020-mercado-pago-checkout-pro.md`, CA-MP-001 y CA-MP-009.

**Qué puedo repetir ahora:** Diferenciar el estado que ve el cliente del estado transitorio que necesita una integración distribuida.

**Pendiente de reforzar:** Diseñar y leer la prueba concurrente que demuestra que solo un checkout obtiene la última unidad.

## 2026-09-09 — Ventana del bloqueo

**Contexto:** La primera propuesta usaba una ventana configurable de 15 minutos.

**Decisión comprendida o practicada:** Bruno definió 10 minutos como duración inicial del bloqueo técnico.

**Justificación:** Limita cuánto tiempo una pieza queda fuera de venta si el comprador abandona, sin eliminar la protección durante el checkout.

**Evidencia del proyecto:** `docs/specs/020-mercado-pago-checkout-pro.md` y su prueba de expiración segura.

**Qué puedo repetir ahora:** La duración es una regla de negocio explícita y configurable, no un valor escondido en el código.

**Pendiente de reforzar:** Medir abandono y pagos cerca del vencimiento para decidir si 10 minutos deben ajustarse.

## 2026-09-09 — Evidencia de concurrencia de MP-01

**Contexto:** La spec exige que dos checkouts concurrentes no puedan bloquear la misma última unidad.

**Decisión comprendida o practicada:** La protección se implementó con una transacción y bloqueo de filas ordenado en PostgreSQL; la caché no participa de la decisión.

**Justificación:** El segundo checkout espera el lock y, al continuar, observa `available = 0`. Si un carrito contiene otro producto agotado, toda la transacción revierte.

**Evidencia del proyecto:** `src/db/create-reserved-order.integration.test.ts` y `docs/evidence/MP-01.md`.

**Qué puedo repetir ahora:** La aceptación “exactamente uno gana” se demuestra ejecutando solicitudes simultáneas contra una base real, no solo con un mock.

**Pendiente de reforzar:** Revisar juntos la consulta `SELECT ... FOR UPDATE` y relacionarla con CA-MP-001.

## 2026-09-14 — Validación objetiva vs. calidad subjetiva

**Contexto:** El diseñador de cuadros personalizados debe automatizar pedidos sin enviar cada propuesta al artesano para aprobación.

**Decisión comprendida o practicada:** Bruno separó las restricciones que el código puede garantizar —cuadrícula, tamaño y paleta fabricables— de la satisfacción estética que decide el comprador mediante la previsualización.

**Justificación:** Una regla determinista puede impedir órdenes físicamente imposibles, pero no puede decidir universalmente cuánto detalle o semejanza satisface a una persona.

**Alternativas consideradas:** Revisión manual de cada diseño; clasificador automático de calidad; diseñador restringido con aceptación explícita del comprador.

**Evidencia del proyecto:** `docs/discovery/002-cuadros-personalizados-preguntas-cliente.md`, PER-DEC-002 a PER-DEC-007 y CA-PER-001 a CA-PER-006.

**Qué puedo repetir ahora:** Clasificar una condición como invariante objetiva del negocio o como preferencia subjetiva del usuario, y decidir si bloquea el checkout.

**Pendiente de reforzar:** Traducir las medidas reales del taller a una fórmula exacta de filas, columnas y dimensiones físicas.

## 2026-09-14 — Embalaje interno vs. bulto postal

**Contexto:** Un pedido puede contener varios productos frágiles, protegidos por separado dentro de una caja exterior.

**Decisión comprendida o practicada:** Bruno distinguió correctamente la necesidad de proteger cada producto y propuso agruparlos según lo que permita la compra. Para Correo, varios envoltorios internos siguen siendo un solo bulto si comparten un único contenedor exterior.

**Justificación:** La tarifa utiliza el peso y las dimensiones exteriores del bulto que Correo transporta; la protección interior pertenece a la regla de embalaje de Canela.

**Alternativas consideradas:** Un bulto por producto; un solo bulto exterior para toda compra; dividir en varios bultos únicamente cuando la combinación o los límites lo exijan.

**Evidencia del proyecto:** `docs/plans/001-secuencia-correo-mercado-pago.md`, DEC-015 y CA-SEQ-007/009.

**Qué puedo repetir ahora:** Identificar cuándo varios paquetes internos constituyen un solo envío y cuándo realmente deben cotizarse varios bultos postales.

**Pendiente de reforzar:** Definir perfiles y reglas de composición que produzcan una estimación conservadora antes de embalar físicamente.

## 2026-09-14 — “Pago inmediato” no implica modo binario

**Contexto:** La primera spec usaba Preferences API y `binary_mode` para simplificar stock, pero la documentación vigente recomienda Orders API y advierte un costo de conversión.

**Decisión comprendida o practicada:** Se separaron tres conceptos: excluir pagos offline, limitar la order a diez minutos y elegir si una revisión breve de Mercado Pago puede quedar en `processing`.

**Justificación:** `capture_mode = automatic` fuerza aprobado/rechazado pero puede rechazar pagos que `automatic_async` habría procesado. La consistencia del stock no exige modo binario si el backend conserva el bloqueo durante `processing` y reconcilia antes de liberar.

**Alternativas consideradas:** `automatic` para máxima simplicidad; `automatic_async` para priorizar aprobación; aceptar medios offline con reservas largas.

**Evidencia del proyecto:** `docs/research/001-mercado-pago-orders-api.md`, `docs/adr/003-checkout-pro-orders-api.md` y CA-MP-011 de la spec 020.

**Qué puedo repetir ahora:** Distinguir la UX de pago directo, el estado interno del procesador y la política de disponibilidad del negocio.

**Pendiente de reforzar:** Aprobar la política de captura y observar en pruebas cómo se comporta una order `processing` cerca de `PT10M`.

**Cierre de decisión:** El 2026-09-14 Bruno aprobó Orders API con `capture_mode = automatic_async`. Ya no queda una alternativa arquitectónica abierta; resta verificar el contrato efectivo con credenciales de prueba.

## 2026-09-14 — Lista administrativa estable mientras entran pedidos

**Contexto:** La bandeja debe ordenar pedidos nuevos/viejos y permitir búsqueda mientras pueden llegar ventas nuevas.

**Decisión comprendida o practicada:** Se propuso paginación por cursor basada en `(created_at, id)` en lugar de descargar todo u ordenar solo en el navegador.

**Justificación:** Un offset puede mover resultados cuando entra un pedido nuevo y provocar duplicados o saltos. El cursor conserva una frontera estable y reduce datos sensibles enviados a la netbook.

**Evidencia del proyecto:** `docs/specs/030-bandeja-pedidos.md`, CA-ADM-001, CA-ADM-002 y CA-ADM-011.

**Qué puedo repetir ahora:** Elegir paginación por cursor para listas vivas ordenadas por tiempo.

**Pendiente de reforzar:** Diseñar el índice y observar el plan de consulta con datos representativos.
