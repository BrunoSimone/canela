# Preparación técnica de apertura — caja compartida e inventario

> Actualización 2026-10-17: [spec 100](../specs/100-inventario-sanity.md) y
> [ADR-006](../adr/006-stock-autoritativo-sanity.md) sustituyen la autoridad SQL
> de stock y la pantalla separada. Sanity almacena y administra cantidades,
> reservas y ajustes; PostgreSQL conserva pedidos y pagos.


2026-10-16. Bruno autoriza completar pendientes técnicos y publicar Sanity para
la carga del cliente. Objetivo comercial: domingo 18/10. La apertura de cobros
requiere datos reales y cuenta logística operativa; no se inventan esas aprobaciones.

## Alcance y criterios de aceptación

- **OPEN-01:** Sanity permite cargar el peso y las tres dimensiones de cada unidad
  protegida, clasificación, posibilidad de giro/apilado y excepción de caja propia.
  Mantener el catálogo existente y sus IDs. La modalidad de venta no reemplaza
  las cantidades de inventario. Los campos de clasificación pueden completarse
  después de las mediciones; un perfil incompleto nunca habilita cotización.
- **OPEN-02:** Documento de caja: nombre, espacio interior útil después del
  revestimiento, dimensiones exteriores, tara con relleno, peso máximo y activa.
  No se precargan medidas ficticias. El cliente puede publicar productos sin
  logística completa para avanzar gradualmente.
- **OPEN-03:** Plan determinista de un solo bulto con todas las unidades; verificar
  posiciones sin superposición, límites interiores, peso, orientación y apilado.
  Seleccionar la caja válida más pequeña. La búsqueda es conservadora: puede
  rechazar un acomodo no encontrado, nunca afirmar que caben por volumen solamente.
  Sin caja válida, perfil completo o clasificación compatible, bloquear antes de MP.
  El snapshot conserva caja, revisiones y acomodo para el taller. Cambiar perfiles
  o cajas invalida cotizaciones anteriores. No crear reglas por cada carrito posible.
- **OPEN-04:** Panel autenticado de stock: catálogo publicado, existencias,
  reservadas/disponibles, carga y ajustes con motivo, actor y control de concurrencia.
  Una pieza única admite como máximo una unidad. No reducir por debajo de reservas;
  doble envío no duplica ajuste. Registrar también activación/desactivación de venta.
- **OPEN-05:** El taller consulta caja y plan, registra medidas reales. Recotizar
  embalaje real antes del alta. Un cambio de tarifa exige aceptación explícita de
  su costo por el operador; jamás modificar el total cobrado al comprador. Mantener
  validación de versión, entorno, destinatario y exclusividad del alta.
- **OPEN-06 (actualizado 26/10):** Recuperación manual autenticada según la
  [spec 121](121-recuperacion-manual-sin-cron.md): intentos inmediatos, reintento en panel,
  ejecución técnica manual e idempotencia. No prometer detección sin supervisión.
- **OPEN-07:** Pruebas unitarias de acomodo y errores; SQL para inventario, reservas,
  auditoría/concurrencia y fulfillment; pruebas HTTP de permisos/origen; compra
  integrada controlada más evidencia separada de servicios externos. No presentar
  pagos simulados como compras externas verificadas.
- **OPEN-08:** Publicar Studio y aplicación, migraciones aditivas con respaldo y
  verificación del destino. Mantener tienda en mantenimiento y checkout cerrado
  durante carga. Entregar rutas y guía breve para el cliente. Verificar acceso del
  cliente con su cuenta existente o identificar invitación faltante.

## Datos externos necesarios para abrir

Peso/protección/cajas y stock reales; clasificación y aceptación de frágiles;
operación de despacho/plazos; email del dueño; credenciales MP productivas;
coordinación del modo operativo de Zipnova y aceptación final de la compra.

## Orden de implementación

1. Esquema y publicación de Sanity + guía de carga.
2. Plan de caja y pruebas; integración cotización/checkout/panel.
3. Inventario y pruebas SQL/HTTP; diferencias de embalaje/costo y pruebas.
4. Worker y ejecución manual (actualización 26/10, spec 121); verificación integrada.
5. Respaldo, migraciones, despliegue cerrado y evidencia de apertura pendiente.
