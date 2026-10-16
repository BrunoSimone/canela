# OPEN-01 — Preparación técnica para apertura

16/10/2026. Contrato: [spec 090](../specs/090-apertura-caja-compartida.md).

## Implementado y verificado

- Sanity publicado en https://canela-artesanal.sanity.studio/: unidad protegida,
  giro/apilado opcional, clasificación, excepción de caja exclusiva y documento
  Cajas de envío. Se preservaron IDs, imágenes y contenido. La cuenta Mariela ya
  figura como Administrator; no se creó una invitación adicional. Los campos
  técnicos ocultos no bloquean la carga en productos preexistentes.
- Plan de una caja compartida, posiciones sin solapamiento, peso con tara única,
  orientación/apilado permitidos y selección determinista. Revisión de perfiles o
  caja invalida la cotización antes de stock/MP. Sin caja/datos compatibles no cobra.
- Inventario en `/admin/inventario`: cantidades, reservas, habilitación, motivo,
  auditoría, reintentos idempotentes y conflictos de edición/reservas. Límite de una
  unidad para piezas únicas, tanto en ajustes como en el checkout.
- Paquete real recotizado antes del alta. Costo explícito para el taller y diferencia
  contra el importe pagado. El comprador mantiene su total. Token de aprobación
  ligado a pedido, versión, medidas y tarifa; tarifa revisada nuevamente al confirmar.
- Worker autenticado, salud persistida y workflow periódico cada cinco minutos
  con ejecución manual. Fallos, avisos en revisión o demorados más de una hora
  hacen fallar la ejecución. Programación de GitHub Actions de mejor esfuerzo.
- Preflight de solo lectura comprueba migraciones, gates, worker reciente, cajas
  activas, stock ofrecido y perfiles capaces de entrar en una caja.

## Evidencia de QA

- Suite unitaria/HTTP/render: ver recuento final de esta publicación abajo.
- PostgreSQL 17 aislado: 61 pruebas aprobadas (puerto 55435, datos descartables).
  Incluye compra controlada con dos unidades en una caja, callback, stock,
  preparación, etiqueta, despacho y ambos avisos, en entornos test/live simulados.
- Zipnova externo: cotización autenticada aprobada; búsqueda y PDF del envío
  sandbox preexistente aprobados. No se creó un segundo envío en esta iteración.
- Navegador local: ingreso, inventario, ajuste de pieza única 5 → 1 en base sintética
  e historial con operador/motivo. Captura local `tmp/open-inventory.jpg`.
- Navegador + API real Zipnova: paquete preparado de prueba 90 × 40 × 40 cm / 3 kg;
  costo obtenido ARS 61.059 frente a ARS 12.600 del snapshot histórico. La interfaz
  mostró diferencia ARS 48.459 a cargo del negocio y botón de alta deshabilitado
  hasta aceptación. Se consultó tarifa; no se generó otro envío.
- Studio real: navegación y formulario publicados verificados en navegador.
- Credenciales locales comparadas con los archivos candidatos a Git: ninguna
  coincidencia de secretos; artefactos privados permanecen en `tmp/` ignorado.

## Infraestructura

Respaldo Neon creado antes de migrar: rama `pre-open-20261016`
(`br-late-hall-acfh5xn2`), sin compute, desde producción `br-lingering-fog-achpwnmv`.
Migraciones `0001` a `0012` aplicadas. Producción tenía cero pedidos y cero inventario;
no se cargaron unidades, medidas ni pedidos ficticios. Acceso de la dueña y correo
operativo configurados, conservando el acceso del desarrollador. Credenciales
Zipnova preparadas en Vercel con sandbox registrado y fulfillment deshabilitado.

## Límites y apertura pendiente

No se completó una compra externa común que recorra pago MP, Zipnova y emails;
la compra integrada usa gateways controlados. Las pruebas externas por servicio
no reemplazan esa aceptación. La cuenta Zipnova continúa en sandbox.

Antes de abrir: medidas/protecciones/cajas y stock físicos, clasificación y
condiciones de frágiles, despacho/plazos, credenciales MP productivas completas,
salida coordinada de sandbox Zipnova y aprobación comercial. El email del dueño
ya no es un bloqueo. La tienda debe continuar en mantenimiento y checkout disabled
hasta resolver esos puntos. [Guía de carga](../runbooks/carga-cliente.md).

## Publicación

La revisión y las verificaciones HTTP se registran al finalizar el despliegue.
