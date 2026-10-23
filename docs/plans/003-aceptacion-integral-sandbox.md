# Aceptación integral en sandbox

23/10/2026. Continúa las specs 020, 060, 070, 080, 090 y 100.

## Alcance

Recorrer la aplicación con Mercado Pago de prueba, Zipnova sandbox y Resend con
destinatario de prueba autorizado. PostgreSQL local nuevo; catálogo, perfiles,
cajas e inventario sintéticos en Sanity `inventory_test`. La tienda pública sigue
cerrada. No se habilitan pagos productivos, envíos operativos ni una combinación
de entornos. No se sustituyen adaptadores reales por respuestas simuladas.

El catálogo estaba fijado a `production`. Se permite seleccionar explícitamente
`NEXT_PUBLIC_SANITY_DATASET` para la aplicación y `SANITY_STUDIO_DATASET` para el
Studio, ambos con valor predeterminado `production`. Vercel Production rechaza
otro dataset. El stock conserva su configuración independiente y privada.

## Pruebas y criterios

| Etapa | Verificación |
| --- | --- |
| Aislamiento | Pruebas de configuración: defaults, selección explícita, nombres inválidos y rechazo de catálogo de prueba en Vercel Production |
| Cotización | Productos y caja leídos desde Sanity; tarifa real de API Zipnova; un bulto compartido |
| Checkout | Orders API con vendedor de prueba verificado, total de productos más envío, reserva persistida |
| Pago | El usuario completa Checkout Pro con comprador/tarjeta de prueba; confirmación autoritativa por webhook o retorno |
| Inventario | Reserva consumida y descuento único en `inventory_test`; repetir lectura/reconciliación no descuenta otra vez |
| Panel y correo | Pedido pagado visible; aviso `[PRUEBA]` dirigido solamente a Bruno |
| Envío | Confirmar embalaje, recotizar y crear un único envío sandbox; descargar PDF de prueba |
| Despacho | Simular despacho y comprobar aviso único al destinatario de prueba |

Los rechazos, carreras y reintentos cubiertos por suites automáticas no requieren
repetir todos los casos manualmente. Registrar separadamente pasos preparados,
ejecutados y pendientes: abrir Checkout Pro no demuestra un pago aprobado.

## Regresiones detectadas en la ejecución HTTPS

- Desarrollo admite únicamente el hostname de túnel configurado explícitamente
  en `CANELA_DEV_HOST`; no se habilitan comodines de origen.
- Detrás de un proxy, acceso, salida y operaciones del panel conservan el origen
  público configurado cuando `Host` o `X-Forwarded-Host` coincide exactamente con
  ese host. Cabeceras arbitrarias no eligen destinos de redirección.
- Las solicitudes cross-site o con Origin distinto continúan rechazadas antes
  de consumir enlaces o modificar pedidos. Cubrir ambos casos con regresiones.

## Orden de salida

Primero completar esta aceptación en sandbox. La prueba de cobro real requiere
un procedimiento separado que no contrate transporte accidentalmente; no se
introduce ese modo en este incremento. La salida del sandbox de Zipnova se
coordina después de finalizar las pruebas y preparar la apertura comercial.
