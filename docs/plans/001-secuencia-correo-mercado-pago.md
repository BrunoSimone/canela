# Secuencia de integración: Correo Argentino y Mercado Pago

## Estado

Secuencia aprobada el 2026-09-14. La política de fuentes de Correo fue aceptada en ADR-002. MP-01 permanece completado.

## Objetivo

Llegar a un checkout productivo que cobre una sola vez el total correcto, evite sobreventa y pueda generar el envío sin convertir una caída de Correo en pérdida o duplicación del pago.

## Restricciones verificadas

- Mercado Pago Orders exige que `total_amount` coincida con la suma de los ítems enviados. Orders no documenta `shipments.cost`; se probará representar el envío como un ítem separado y, si no es adecuado, el desglose quedará en Canela.
- La documentación entregada por el cliente fue descartada como fuente normativa.
- La documentación publicada en el sitio oficial de API MiCorreo describe `POST /rates`, una tarifa con `validTo` y `POST /shipping/import`. El manual visible está fechado en 2022, por lo que cada supuesto necesita una prueba de contrato en QA.
- Correo exige credenciales gestionadas con un ejecutivo comercial; todavía debe confirmar la habilitación de MiCorreo y los servicios de la cuenta de Canela.
- El embalaje conjunto del carrito debe resolverse antes de cotizar, independientemente del proveedor.
- MP-01 -base, inventario y bloqueo transaccional- ya está implementado localmente y es válido para cualquier secuencia posterior.

## Opciones consideradas

### A. Completar Mercado Pago antes de tocar Correo

Permite demostrar pagos rápido, pero la order de Mercado Pago no tendría un total productivo real. Obliga a usar retiro/tarifa ficticia o rehacer el comienzo del checkout al agregar domicilio, paquete, tarifa y vigencia.

### B. Completar todo Correo antes de Mercado Pago

Resuelve cotización, alta, rótulo y tracking, pero adelanta funcionalidades posteriores a la venta antes de poder cobrar. No reduce el riesgo crítico más eficientemente.

### C. Dividir Correo en antes y después del pago

Resuelve primero contrato/cotización; luego Mercado Pago cobra el total; finalmente Correo crea y sigue el envío. Esta es la secuencia recomendada.

## Secuencia recomendada

### INT-00 - Fijar y probar el contrato de Correo

- Registrar URL, fecha de consulta y versión/fecha visible de cada documento oficial utilizado.
- El cliente pide a su ejecutivo la habilitación de API MiCorreo y obtiene URLs, credenciales QA, `customerId`, servicios y modalidades habilitadas.
- Ejecutar pruebas de contrato en QA para `/token` y `/rates`; documentar campos reales, errores, vigencia, límites y estrategia de repetición.
- Confirmar cómo se paga el porte y cuál es el canal de soporte.
- Si QA contradice la documentación oficial, detener el incremento y pedir confirmación escrita a Correo.

**Salida:** matriz del contrato oficial contrastada con evidencia QA y adaptador MiCorreo decidido. Sin esto no se implementa una cotización ficticia.

### INT-01 - Modelo de paquete y cotización

- Asignar a cada producto un perfil conservador de peso y dimensiones de embalaje; no representa una medida exacta.
- Proteger cada producto individualmente y calcular un bulto exterior común cuando la combinación sea segura.
- Si se necesitan varios bultos exteriores, cotizar cada uno y sumar sus importes.
- Capturar código postal y consultar entrega a domicilio en backend. La entrega a sucursal queda fuera del primer lanzamiento.
- Persistir un snapshot de la cotización y su `validTo`.

**Invariante:** el bloqueo de stock y el pago solo comienzan si la tarifa seguirá vigente durante la ventana de 10 minutos, o se vuelve a cotizar.

### INT-02 - Mercado Pago sobre total final

- Crear la orden y bloquear stock por 10 minutos.
- Congelar ítems, tarifa y total.
- Crear Checkout Pro mediante Orders API, usando idempotencia del proveedor.
- Probar `PT10M`, la exclusión de pagos offline y el costo de envío como ítem separado.
- Procesar Webhooks de order, retorno y errores sin confiar en el navegador.

**Invariante:** `total_cents = subtotal_cents + shipping_cents` y coincide con Mercado Pago.

### INT-03 - Confirmación robusta del pago

- Webhook firmado, consulta autenticada, idempotencia y reconciliación.
- Consumir el bloqueo solo ante pago aprobado verificado.
- Liberarlo de forma segura ante rechazo/vencimiento.

### INT-04 - Fulfillment de Correo posterior al pago

- Notificar al dueño y mostrar la orden pagada en el panel administrativo desktop-first.
- La bandeja muestra primero los pedidos nuevos, permite ordenar ascendente/descendente y buscar por número, comprador, producto o TN.
- Cada fila ofrece una vista previa breve; los datos personales completos aparecen solo al abrir el detalle.
- El dueño embala y carga el peso y las dimensiones reales.
- Comparar el bulto real con el perfil cobrado. Si cambia de rango tarifario, mostrar la diferencia para operación; no volver a cobrar automáticamente al comprador.
- Importar el envío pendiente en MiCorreo solamente después de confirmar las medidas reales.
- El dueño paga con saldo, imprime el rótulo y coordina pickup si está habilitado.
- Si Correo está caído, conservar `paid + fulfillment_pending` y permitir carga manual; nunca cobrar nuevamente.

### INT-05 - Tracking y operación

- Guardar el TN de Correo y enviar al comprador una única confirmación de despacho con enlace al seguimiento oficial.
- Delegar a Correo las novedades de tránsito, espera en sucursal, intento de entrega y entrega final.
- No implementar polling, timeline logística propia ni emails por cada estado en el MVP.
- Mantener cancelación, reintentos, impresión de rótulo y operación manual de respaldo.
- Activación gradual del checkout productivo con métricas.

## Flujo resultante

```text
Carrito
  -> dirección de entrega a domicilio
  -> construir bulto(s) estimado(s)
  -> cotización Correo por bulto
  -> snapshot de tarifa
  -> bloqueo stock 10 min
  -> order Mercado Pago con total final
  -> pago aprobado verificado
  -> dueño embala y confirma medidas reales
  -> importación pendiente en MiCorreo
  -> pago de porte, rótulo y pickup
  -> TN + enlace oficial al comprador
```

## Criterios de aceptación de la secuencia

- **CA-SEQ-001:** Ninguna order MP productiva se crea sin costo de envío vigente o retiro gratuito confirmado.
- **CA-SEQ-002:** El comprador ve productos, envío y total antes de salir a Mercado Pago.
- **CA-SEQ-003:** Si cotizar falla, no se bloquea stock ni se crea una order MP.
- **CA-SEQ-004:** Si pagar falla, no se crea un envío.
- **CA-SEQ-005:** Si Correo falla después de cobrar, la orden permanece pagada y pendiente de fulfillment; el reintento no repite el cobro.
- **CA-SEQ-006:** Una tarifa vencida se vuelve a cotizar y cualquier cambio de total requiere confirmación del comprador antes de pagar.
- **CA-SEQ-007:** Un carrito que requiere dos paquetes no se envía a una API que vaya a ignorar el segundo; se cotiza/crea según una regla explícita o se deriva a operación manual.
- **CA-SEQ-008:** En el primer lanzamiento el comprador solo puede seleccionar entrega a domicilio; no se muestran opciones de sucursal todavía.
- **CA-SEQ-009:** Varios envoltorios internos dentro de una misma caja se consideran un solo bulto postal y se cotizan usando el peso y las dimensiones del contenedor exterior.
- **CA-SEQ-010:** Canela no replica los estados de tránsito en el MVP; al despachar envía una vez el TN y un enlace al seguimiento oficial.

## Datos que bloquean la conexión real

1. Que el ejecutivo habilite y confirme API MiCorreo para la cuenta del cliente.
2. Definir perfiles conservadores de paquete para el catálogo y reglas para combinaciones frecuentes. Esto no bloquea MP-02 en pruebas, pero sí una cotización productiva.
3. Confirmar que la dirección del taller dispone de pickup.
4. Confirmar por escrito la admisión y cobertura de cerámica, vidrio, espejos y cuadros artesanales.

## Próximo trabajo

1. Aprobar ADR-003 y la política de `capture_mode` de Mercado Pago.
2. Conectar MP-01 a Neon y ejecutar MP-02A/MP-02B contra una aplicación de prueba.
3. Ejecutar INT-00 de Correo cuando existan credenciales QA; mientras tanto se puede avanzar con su adaptador simulado y sin habilitar checkout productivo.
4. Refinar y aprobar la spec de la bandeja administrativa antes de INT-04.
