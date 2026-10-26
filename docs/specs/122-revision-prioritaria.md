# Revisión prioritaria en el panel

26/10/2026. Bruno solicita que un caso que requiere intervención diga
«Necesita revisión» y se distinga de una espera normal.

## Aceptación

- **REV-01:** unificar la etiqueta visible de atención de pedidos, envíos y
  avisos como «Necesita revisión». Conservar los estados internos y sus permisos.
- **REV-02:** acompañarla con un icono y contraste visual, más la indicación
  «Revisar con prioridad». No depender únicamente del color.
- **REV-03:** mostrar el próximo paso de un pedido que necesita atención antes
  del detalle de productos, también en móvil. Si un aviso necesita revisión,
  mostrar una llamada a «Despacho y avisos» al principio de la ficha.
- **REV-04:** explicar la intervención en avisos y envíos. No ofrecer reenvío
  de avisos en revisión ni creación de otro envío en revisión. Conservar la
  consulta de un envío incierto, que no crea otro envío.
- **REV-05:** los estados pendientes/en proceso no reciben este aviso de
  prioridad por el mero hecho de estar esperando. No agregar cron ni alertas
  externas; esta indicación se ve al consultar el panel.

## Verificación

Pruebas de presentación: revisión frente a espera normal, controles seguros y
visibilidad del aviso antes de los productos. Comprobar ficha y bandeja en
escritorio y móvil de 320 px. Actualizar la terminología de la guía operativa.
