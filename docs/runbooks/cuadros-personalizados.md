# Cuadros personalizados: desarrollo y operación

Estado 2026-10-30, rama `codex/creador-cuadros-personalizados`, PER-148/PER-155.
Soporte productivo con configuración privada, validada y confirmada. La tienda
permanece en mantenimiento. No usar la cuenta Zipnova operativa para ensayos.

Las [definiciones recibidas de Mariela el 28/10](../discovery/002-cuadros-personalizados-preguntas-cliente.md#definiciones-con-mariela--2026-10-28)
confirmaron marco negro incluido y disponibilidad de colores. La actualización
[PER-155](../specs/155-venecitas-clasicas-11mm.md) usa venecitas de 11 mm, junta
de 1 mm, marco negro de 10 mm por lado, cuadrículas enteras de 15 a 90 y 36
colores de la línea Clásica, excluidos M.24 y C.50. Los pedidos anteriores
conservan sus propios snapshots. Todavía se deben confirmar medidas finales,
costos y embalajes del nuevo formato antes de publicar la configuración del taller.
El plazo anterior de una semana y el cupo de cinco quedan como datos históricos; el borrador productivo tiene ambos campos vacíos y sin confirmar: se está definiendo
una comunicación desde 15 días y cómo gestionar la espera. El código actual de
cupos/plazo no implementa todavía esa posible cola de pedidos; no publicar una
configuración suponiendo que aumentar el cupo resuelve la planificación.

## Qué recibe cada persona

- Comprador: editor, retoques, precio final del cuadro, aceptación del diseño,
  domicilio, opciones de envío, pago en el ambiente configurado y resultado con el mismo mosaico.
- Taller: pedido pagado en `/admin`, diseño aceptado, plazo, fabricación,
  guía privada y embalaje/envío. Los pedidos de prueba están identificados.
- Galería: copia autorizada del mosaico en un **borrador** del catálogo del panel. Nunca incluye
  la foto original, datos del comprador, ID del pedido ni referencias de materiales.

La foto y el borrador se pierden al cerrar/recargar el editor. Al iniciar la compra
se guarda el mosaico aceptado (colores/celdas/medidas) y sus condiciones, no la foto.
Cambiar posteriormente la configuración no modifica ese pedido ni su guía.

## 1. Probar sin cuentas externas

La simulación anterior sigue disponible con `pnpm dev`,
`SITE_MAINTENANCE_MODE=0`, `CUADROS_PREVIEW_ENABLED=1` y
`CUADROS_CHECKOUT_MODE=disabled`. Ir a `/crear-cuadro` o elegir `/cuadros`.
Permite simular pago aprobado, pendiente o rechazado; es efímera y no llena el panel.

Para verificar persistencia y operación sin llamar proveedores:

1. Crear una base **local, descartable y vacía**; no usar la base de pedidos reales.
2. Ejecutar `TEST_DATABASE_URL=… pnpm test:db`. La suite trunca tablas de pruebas.
3. Para inspección visual, ejecutar `TEST_DATABASE_URL=… pnpm exec tsx scripts/frame-qa-fixture.ts /tmp/cuadros-qa.json`.
   El script restringe hosts/nombres de bases, migra y crea un pedido ficticio pagado,
   con proveedores falsos. Usar las rutas locales que guarda en el archivo de QA.
4. Arrancar una instancia local en `localhost:3007` con esa misma base,
   `NEXT_PUBLIC_SITE_URL=http://localhost:3007`,
   `ADMIN_ALLOWED_EMAILS=qa-frame@example.com` y los ajustes sandbox de abajo;
   mantener envío y email deshabilitados si solo se inspecciona el panel.
5. Abrir el enlace de ingreso local generado, entrar en el pedido y recorrer
   fabricación → guía → terminado → embalaje. El script no sirve para producción.

No reutilizar enlaces/token de la evidencia. Las credenciales de ejemplo de QA no
son las de ninguna cuenta real.

## 2. Ensayo integrado con los proveedores

Requiere una base aislada, credenciales **test** de Mercado Pago y la cuenta de
Zipnova confirmada en modo pruebas. El código no puede cambiar el modo remoto.
Variables propias de esa instancia:

```dotenv
CUADROS_PREVIEW_ENABLED=1
CUADROS_CHECKOUT_MODE=sandbox
CUADROS_CATALOG_SOURCE=fixtures
CHECKOUT_MODE=test
PAYMENT_ENVIRONMENT=test
SHIPPING_PROVIDER=zipnova
ZIPNOVA_ACCOUNT_MODE=sandbox
```

Aplicar primero las migraciones en la base aislada con `pnpm db:migrate`.
Además configurar las variables existentes de origen Zipnova, credenciales,
firma, URL de la instancia y webhook Mercado Pago (ver `.env.example`). Nunca
mezclar la base test con la de ventas. `VERCEL_ENV=production` bloquea el modo sandbox. La cuenta Canela de Zipnova ya es operativa: estos ajustes solo sirven con otra cuenta de pruebas confirmada.

El endpoint `/api/cuadros/compra` valida y cotiza el diseño en servidor, persiste
la cotización, vuelve a comprobar la tarifa al pagar y reserva un cupo antes de
redirigir a MP. Los reintentos conservan pedido y clave de idempotencia.
La pantalla `/cuadros/resultado/[token]` consulta la confirmación verificada;
los parámetros de regreso de MP no aprueban el pedido por sí solos.

Los flags y restricciones existentes de etiquetas y emails siguen vigentes.
Para enviar emails de prueba usar `ORDER_EMAIL_MODE=test` y un destinatario de
pruebas explícito. No habilitar producción para ensayar.

## 3. Configuración privada del taller

El plan gratuito de Sanity no admite datasets privados. Por decisión de Bruno,
la configuración de cuadros vive en PostgreSQL y se edita en `/admin/taller`.
Desde CAT-154, catálogo, cantidades y galería también viven en PostgreSQL y se administran desde `/admin/catalogo`. Sanity se conserva como respaldo de consulta. No borrar datasets de otros
proyectos: sus cuotas son independientes. No se contrató otro plan.

1. Ingresar al panel y elegir **Taller de cuadros**.
2. Reemplazar los valores orientativos: medidas de venecita/junta/marco y grilla;
   paleta disponible; precios; peso y medidas exteriores de cada paquete completo;
   capacidad/plazo; condiciones de compra. Referencias y costos son privados.
3. **Guardar borrador** permite avanzar por partes. No altera la configuración
   publicada. Un cambio en una sección desmarca su confirmación.
4. Revisar las seis confirmaciones y marcar la intención de usar esos datos.
5. **Publicar configuración** valida todo en servidor. Cambia únicamente nuevas
   compras; invalida cotizaciones no iniciadas con una versión anterior.
6. **Pausar nuevas compras de cuadros** retira la configuración publicada pero
   conserva el borrador y permite seguir atendiendo pedidos ya iniciados/pagados.

Una edición concurrente devuelve un conflicto; recargar antes de intentar guardar
sobre otra versión. La publicación y cambios quedan registrados con operador y fecha.

### Producción

```dotenv
SITE_MAINTENANCE_MODE=1
CUADROS_PREVIEW_ENABLED=1
CUADROS_CATALOG_SOURCE=database
CUADROS_CHECKOUT_MODE=production
```

Además deben estar alineados `CHECKOUT_MODE`, `PAYMENT_ENVIRONMENT`, aprobación
productiva, emails y Zipnova operativa según el runbook de producción. Las tres
migraciones del creador (0014–0016) deben estar aplicadas. El mantenimiento sigue
bloqueando la tienda y APIs públicas. No se quita al publicar el taller.

La configuración inicial no está publicada y no confirma datos por Mariela.
Al abrir la tienda, la compra seguirá bloqueada si falta esa publicación.
No hay código que editar para incorporar los datos finales.

### Galería en Sanity

`SANITY_FRAME_WRITE_TOKEN` es un token de servidor con escritura sobre `frameDesign`
en el catálogo. Los pedidos productivos pagados y consentidos pueden preparar un
borrador desde la ficha; Mariela revisa y publica en Studio. Los pedidos test usan
`CUADROS_SANITY_TEST_DATASET`, que debe diferir del catálogo real; nunca se exportan
al dataset `production`. No se publica automáticamente ni se copia información personal.

## 4. Trabajo diario en el panel

1. **Cuadro por fabricar**: pago verificado; abrir diseño y guía privada.
2. **Empezar fabricación**: pasa a *En fabricación*. Dos personas no pueden
   sobrescribir el estado: se verifica la versión de la ficha.
3. **Marcar terminado**: libera el puesto de trabajo y permite registrar el
   paquete real. Antes de esto el backend también bloquea preparación y etiqueta.
4. Embalar, medir/pesar y seguir el flujo existente de cotización/etiqueta/despacho.
5. Si el comprador autorizó la galería, preparar su borrador y revisarlo en Sanity.
   No se publica automáticamente. La autorización es opcional y empieza desmarcada.

La guía solo se entrega a una sesión administrativa para pedidos pagados. Incluye
cuadrícula por bloques de 15×15, orientación frontal, códigos internos y cantidades.
Usar **Imprimir → Guardar como PDF** en el navegador; las guías de pruebas dicen
*No fabricar ni despachar*.

## 5. Fallos y recuperación sin cron

- Pago pendiente o respuesta ambigua: mantiene el cupo; **no** asumir rechazo por
  antigüedad. Después de una hora el panel señala *Necesita revisión*.
- Usar **Consultar pago** en la ficha. Si faltó guardar la respuesta inicial,
  recupera la misma creación idempotente y consulta a MP; no aprueba localmente.
- Rechazo/vencimiento verificado: libera el cupo. El resultado ofrece **Retomar mi
  diseño** para volver al editor con las celdas aceptadas y una cotización nueva;
  no se ofrece si el pago sigue pendiente, pagado o en revisión. Un pago tardío después de liberar
  queda en revisión; no inicia fabricación de manera automática.
- Webhook duplicado: no duplica producción ni aviso. El retorno del comprador y
  la consulta manual complementan el webhook.
- Error al preparar la galería: repetir la acción; usa el mismo ID público y no
  publica dos diseños. Pedido y guía no dependen de que Sanity responda.
- Etiqueta/email fallidos: usar las acciones de recuperación existentes del panel.

No hay tarea programada. Las cotizaciones vencidas sin pedido pueden eliminarse
manualmente como mantenimiento, conservando todas las vinculadas a órdenes.
Nunca borrar snapshots/pedidos para liberar cupos ni aprobar pagos por SQL.

## 6. Antes de autorizar ventas reales

Mariela confirma: geometría coherente de venecita/junta/marco y tamaños; colores
realmente disponibles y referencias físicas; precios finales; peso y dimensiones
**embalados** por tamaño; plazo/capacidad; condiciones y aceptación de variaciones.

La integración productiva se despliega bajo mantenimiento. Cargar y publicar los
valores definitivos desde el panel no requiere modificar código. Antes de abrir,
corresponde revisar catálogo, saldo del transporte y autorizar el retiro del
mantenimiento. Las pruebas de esta iteración usan proveedores dobles y no generan
cobros ni envíos reales.

## 7. Verificación antes de abrir

- `pnpm commerce:preflight` verifica migraciones, variables y taller publicado sin
  crear pagos/envíos. Un taller pendiente es un bloqueo de datos esperado hasta su aprobación.
- QA con proveedores dobles y base local: `TEST_DATABASE_URL=… pnpm test:db`.
- Comprobar los recorridos productivos bajo mantenimiento por HTTPS, sin abrir la tienda.
- El saldo para envíos sigue siendo una tarea operativa de Zipnova. La integración
  no carga saldo automáticamente ni transfiere el pago del comprador al proveedor.
- Evidencia y alcance de aceptación: `docs/evidence/PER-148.md`.
# Actualización PER-157 (02/11/2026)

El creador ofrece dos formatos: 1×1 con 29 colores y 2×2 con 36 clásicos. Los
retoques de venecitas son exclusivos del panel, en la ficha de un cuadro pago.
La guía privada usa la matriz de fabricación; el diseño aceptado se conserva.
Los perfiles se editan en `/admin/taller`; galería solo tras terminar y con
consentimiento. Ver `docs/specs/157-formatos-y-retoque-privado.md` y la guía
`docs/runbooks/qa-panel-y-creador.md` para el comportamiento vigente y rutas.

