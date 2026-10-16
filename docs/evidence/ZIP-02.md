# ZIP-02 — Alta y etiqueta Zipnova sandbox

Fecha: 2026-10-13. Contrato: [spec 070](../specs/070-zipnova-alta-etiqueta.md).
Implementación local; sin despliegue, migración productiva ni cobros reales.

## Resultado

- Documento y teléfono obligatorios para checkout Zipnova; documento guardado
  en `order_delivery` y excluido del DTO administrativo/público.
- Límite configurado de un bulto aplicado antes de cotizar; contexto firmado
  incluye ese límite. Pedidos históricos conservan compatibilidad.
- Confirmación administrativa de un pedido pagado y preparación vigente,
  comparación de dimensiones exactas y recotización antes del alta.
- Intento SQL único por pedido, referencia externa estable y preparación
  bloqueada. Recuperación de incertidumbre por búsqueda exacta y consulta de
  detalle; nunca repite automáticamente el POST de alta.
- PDF solicitado después del alta, guardado de forma privada y servido con
  sesión administrativa, attachment y no-store. Rótulo listo no significa envío
  despachado; la operación no modifica pagos ni inventario.
- Gate explícito `ZIPNOVA_FULFILLMENT_MODE=sandbox`, cuenta sandbox y dropoff.
  Cuenta operativa y demo rechazan la creación en esta iteración.

## Verificación reproducible

| Comprobación | Resultado | Registro local |
| --- | --- | --- |
| `pnpm test` | 336 aprobados, 42 opt-in omitidos | `tmp/zipnova-fulfillment-unit.log` |
| `pnpm test:db` | 35 aprobados, PostgreSQL 17 aislado | `tmp/fulfillment-db-tests.txt` |
| Contrato API de alta/recuperación/PDF | 1 aprobado | `tmp/zipnova-fulfillment-contract.log` |
| TypeScript | Aprobado, también durante build | `tmp/zipnova-fulfillment-build.log` |
| `pnpm lint` | Aprobado | `tmp/zipnova-fulfillment-lint.log` |
| `pnpm build` | Aprobado | `tmp/zipnova-fulfillment-build.log` |
| `git diff --check` | Aprobado | Verificación final local |

Pruebas relevantes: rechazo de pago/contexto/preparación/datos incorrectos,
cambio de tarifa, cinco claims simultáneos con un único ganador, bloqueo de
edición luego del claim, incertidumbre posterior al POST, recuperación sin
duplicados, etiqueta pendiente, respuestas incompatibles y permisos del PDF.

## Contrato remoto observado

Un único `POST /v2/shipments` creó un envío sintético en la cuenta que soporte
confirmó en sandbox. Se utilizó un paquete General de 1 kg, 20 × 20 × 10 cm,
destinatario ficticio y transporte OCA devuelto por la cotización. No es una
prueba de aceptación comercial de vidrio, cerámica o espejos.

Se observaron alta `201`, recuperación por `external_id`, detalle y descarga.
La etiqueta responde JSON `{format: "pdf", body: "<base64>"}`. El adaptador
valida ese contrato, prefijo PDF y tamaño máximo; solicita `no_status_change=1`.
PDF obtenido: 11.749 bytes, con texto indicativo de prueba.

El test conserva `tmp/zipnova-fulfillment-contract.json` antes del POST, con
permisos 0600; repetirlo recupera el mismo envío. No borrar ese archivo como
parte de un reintento. Secretos y respuesta completa no se registran en Git.

## Verificación de interfaz

Sobre PostgreSQL descartable se creó un pedido sintético pagado, se guardó su
preparación y se registró como incierto el envío ya creado en sandbox. En Chrome:

1. Acceso administrativo local con enlace de prueba, sin enviar email.
2. Ficha muestra revisión y preparación bloqueada.
3. «Consultar envío y etiqueta» recupera el envío existente y termina en
   «Rótulo listo», con enlace de seguimiento del proveedor.
4. «Descargar etiqueta PDF» devuelve HTTP 200. El archivo descargado coincide
   byte a byte con el PDF del contrato remoto.

Captura: `tmp/zipnova-panel-etiqueta.png`.
PDF: `tmp/zipnova-etiqueta-sandbox.pdf`.
La fixture no representa una compra real ni una ejecución completa de Mercado
Pago. Las pruebas de pago se mantienen separadas. Se cerraron el servidor y
PostgreSQL temporales luego de la verificación.

## Pendientes para apertura

Perfiles y clasificación reales del catálogo, admisión/cobertura de piezas
frágiles, despacho viable en sucursal, aclaración del multibulto OCA y plazo de
preparación. Completar registro de despacho y aviso único al comprador según
INT-05, y prueba integral de compra antes de habilitar producción.

Las migraciones `0008` y `0009` son obligatorias para ejecutar esta versión
sobre una base; solo se aplicaron a la base local descartable. Vercel, Neon y
las flags productivas permanecieron sin cambios. Configuración y recuperación:
[runbook de Zipnova](../runbooks/zipnova.md).
