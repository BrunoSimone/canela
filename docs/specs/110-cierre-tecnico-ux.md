# Cierre técnico y revisión de experiencia

23/10/2026. Complementa las specs 020, 030, 060, 070, 080, 090 y 100.

## Alcance autorizado

Cerrar la aceptación técnica pendiente y revisar/corregir tienda y panel en
escritorio y móvil. Conservar el diseño de Canela, las reglas comerciales y el
stock autoritativo de Sanity. Publicar la versión verificada con mantenimiento
activo y checkout productivo deshabilitado.

## Criterios de aceptación

- **UX-01 Navegación:** navegación con teclado, foco visible, nombre/estado de
  controles y retorno de foco al cerrar menús o diálogos. Enlaces principales
  funcionan también desde checkout. No hay controles interactivos anidados.
- **UX-02 Carrito:** cantidades y subtotal legibles; acciones identifican la pieza;
  acceso al checkout y mensajes de indisponibilidad explican el siguiente paso.
  Carrito/galería no se superponen ni impiden utilizar el teclado.
- **UX-03 Checkout:** campos con etiquetas/autocompletado, errores identificables,
  estados de carga y reintentos claros. Cambio de destino/carrito invalida tarifa;
  doble envío no duplica pedido. Resultado distingue confirmado, pendiente,
  rechazado e incidencia sin basarse en parámetros del navegador.
- **UX-04 Panel:** acceso, búsqueda, orden, paginación, selección y detalle son
  utilizables en móvil y teclado; estados vacíos/error tienen una salida.
  Preparación, costo del envío, etiqueta y despacho tienen acciones y consecuencias
  claras. Los avisos pendientes no aparentan entrega certificada.
- **UX-05 Responsive/accesibilidad:** revisar 1440, 768, 390 y 320 px; sin desborde
  horizontal global, textos/controles legibles y foco distinguible. Comprobar
  contraste, nombres accesibles, objetivos táctiles y movimiento reducido.
  Documentar límites de comprobación; no declarar certificación de lector de pantalla.
- **TEC-01 Webhook:** una notificación automática de MP para una compra de prueba
  llega al receptor vigente, valida firma/entorno y confirma sin retorno del
  comprador; duplicados no repiten stock, avisos ni regresan estados terminales.
- **TEC-02 Regresión:** ejecutar unitarias/HTTP, integración SQL aislada,
  TypeScript, lint y build. Contratos externos solo contra cuentas/datasets de
  prueba, distinguiendo resultados ejecutados de omitidos.
- **TEC-03 Publicación cerrada:** verificar flags, migraciones y recuperación manual, publicar,
  comprobar mantenimiento, autenticación y endpoints; conservar rollback.

## Fuera de la apertura técnica

Los datos físicos, condiciones de frágiles, despacho del taller, cambio remoto
de modo Zipnova y pago real requieren coordinación comercial. Esta iteración
no abre ventas ni crea un envío operativo.

## Evidencia

Registrar hallazgos, correcciones, resultados de pruebas, pantallas inspeccionadas
y límites externos en `docs/evidence/UX-110.md`. Mantener las capturas privadas y
datos sintéticos de QA en `tmp/`; los secretos nunca van en la evidencia.
