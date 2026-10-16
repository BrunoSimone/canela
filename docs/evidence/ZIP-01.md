# ZIP-01 — Cotización Zipnova y selección en checkout

Fecha: 2026-10-13. Iteración autorizada mientras se espera la habilitación remota
del sandbox. Contrato: [spec 060](../specs/060-zipnova-cotizacion.md).

## Implementación verificada

| Requisitos | Evidencia |
| --- | --- |
| ZIP-01/02/03 | Cotización conjunta de bultos, catálogo y perfiles releídos en servidor, destino explícito, opciones seleccionables con importes en centavos. Adaptador `infrastructure/zipnova/client.ts` y `application/quote-shipping.ts` del módulo shipping. |
| ZIP-04/05 | Firma v3, vigencia local de diez minutos y recotización previa a reserva/MP. Se rechazan alteración, vencimiento, cambios de destino/carrito/embalaje/configuración y cambios de costo al comprador o al vendedor. |
| ZIP-06 | Snapshot de transporte, bultos y contexto persistido atómicamente con pedido/reserva; forma parte de la identidad del pedido. Migración `0008_shipping_quote.sql`; panel muestra el transporte seleccionado. |
| ZIP-07 | Cotizar y seleccionar transporte; resumen con precios actuales; selección invalidada al cambiar destino/carrito, expirar o recibir cambios de tarifa. Respuestas antiguas ignoradas. |
| ZIP-08/09 | Credenciales de servidor, timeout, redirects bloqueados, errores redactados, límite de body y presupuesto PostgreSQL compartido de 60 consultas/minuto. Solo MP de pruebas; configuración inválida falla cerrada. |

El prototipo que cotizaba cada bulto por separado fue reemplazado. La tarifa
controlada se mantiene únicamente para pruebas explícitas y nunca se utiliza
como fallback de Zipnova.

## Verificaciones ejecutadas

| Comando / comprobación | Resultado |
| --- | --- |
| `pnpm test` | 277 aprobadas; 37 omitidas por gates de integración/contratos externos. |
| `pnpm test:db` | 31 aprobadas sobre PostgreSQL 17 local descartable, separado de la base configurada en `.env.local`. |
| Contrato opt-in de `client.contract.test.ts` | Una consulta autenticada aprobada: dos bultos sintéticos en una sola cotización, entrega a domicilio y despacho en sucursal. |
| `pnpm exec tsc --noEmit` | Aprobado. |
| `pnpm lint` | Aprobado. |
| `pnpm build` | Aprobado. |
| `git diff --check` | Aprobado. |

Las pruebas de PostgreSQL verifican snapshot e idempotencia, reversión ante
falta de stock y concurrencia del presupuesto de consultas. Las pruebas de
aplicación verifican que rechazar una tarifa cambiada no reserva stock ni llama
a Mercado Pago. No se repitió una compra real ni el contrato remoto de MP.

La consulta real valida la forma de la respuesta del proveedor, no la aceptación
de los productos de Canela. Utilizó paquetes de prueba de 1 kg, 20 × 20 × 10 cm,
clasificación General y valor declarado total ARS 30.000. No creó envíos,
etiquetas ni cargos. No incluyó datos de compradores.

## Revisión visual y catálogo

1. Sin cotización: envío «A calcular», total «Pendiente de envío» y pago bloqueado.
2. Con un producto real sin perfil embalado: error recuperable y pago bloqueado;
   se rechaza antes de consultar Zipnova.
3. Con respuestas simuladas de un backend local aislado: aparecen transportes,
   seleccionar uno actualiza envío y total; cambiar CP elimina la selección y
   vuelve a bloquear pago. El proxy de pruebas nunca permite iniciar MP.

La auditoría de Sanity de solo lectura encontró 27 productos publicados, de los
cuales 24 tienen condición de venta `unica` o `stock`. Ninguno de esos 24 tiene
perfil embalado ni clasificación. Esto no indica stock físico: PostgreSQL sigue
siendo la fuente de inventario. Se preparó una planilla con sus IDs y nombres y
campos vacíos para completar medidas reales; no se escribieron datos en Sanity.

Artefactos locales ignorados por Git:

- `tmp/zipnova-checkout-preview.png`: pantalla con tarifas simuladas, identificadas
  como prueba visual.
- `tmp/canela-embalajes-pendientes.csv`: relevamiento de los 24 productos vendibles.
- `tmp/zipnova-{tests,db-tests,contract,typecheck,lint,build}.txt`: salidas de las
  verificaciones.

## Estado al cerrar la iteración

- Spec, plan y runbook actualizados. Código listo para revisión local.
- `.env.local` permanece sin modificaciones en esta iteración y excluido de Git;
  las claves no están en código, snapshots ni documentación.
- La migración nueva se aplicó solo en la base local descartable. Servidores de
  prueba y contenedor detenidos al finalizar. No hubo despliegue ni migración de
  producción; mantenimiento y pagos productivos conservan su estado previo.
- El usuario envió la solicitud de sandbox, pero todavía falta confirmación de
  soporte. La flag local documenta el modo y no cambia la cuenta remota.
- Siguen pendientes clasificación/aceptación de piezas frágiles, embalajes reales
  y modalidad viable de despacho: las consultas de retiro aún no devolvieron tarifas.
- Alta de envíos, etiquetas, tracking y validación de pago a entrega requieren la
  siguiente iteración antes de abrir ventas. Ver [runbook](../runbooks/zipnova.md).
