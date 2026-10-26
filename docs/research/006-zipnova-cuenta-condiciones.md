# Zipnova: cuenta y condiciones comprobadas

Revisión del 26/10/2026 desde la sesión de Bruno en Chrome, cuenta Canela.
Complementa la comparación de costos en [005](005-costos-envio-directo-vs-zipnova.md).

## Confirmado en el panel autenticado

| Tema | Resultado observado | Fuente del panel |
| --- | --- | --- |
| Suscripción | Starter desde 13/10/2026, sin vencimiento | `/myaccount/subscription` |
| Abono | ARS 0 por mes; ningún adicional contratado; total ARS 0 | `/myaccount/subscription` |
| API | Incluida; sin límite de envíos y hasta 2 usuarios en Starter | `/myaccount/upgrade` |
| Modo remoto | Aviso visible de Modo de Pruebas | Cabecera y modal informativo |
| Etiquetas actuales | El modal aclara que no son válidas para operar realmente | Modal de Modo de Pruebas |
| Paso a producción | El aviso desaparecerá cuando habiliten la cuenta; el modal remite a integraciones y comercial | Modal de Modo de Pruebas |
| Saldo | ARS 0; cargos del mes y facturas vencidas en 0; sin facturas pendientes | `/myaccount/billing` |
| Recarga | Transferencia bancaria, acreditación estimada 2–3 min; Mercado Pago | `/checkout/account/payment_methods` |
| Red Zipnova | Tarifas negociadas, soporte y factura centralizados; no exige cuentas individuales en los transportes | `/myaccount/carriers` |
| OCA / Correo Argentino | Ambos activos; domicilio y punto de entrega listados | Perfiles 208 y 233 |
| Intentos de entrega | OCA: 2; Correo Argentino: 1; ninguno permite entrega programada según los perfiles | Perfiles 208 y 233 |
| Contrato propio | ARS 600 + IVA por envío creado, además del flete facturado por el transporte; requiere plan pago | `/myaccount/carriers` |

El abono gratuito no significa envío gratuito. El cargo de contrato propio no es
una comisión adicional de la modalidad de red que usa Canela. No se verificó un
recargo específico por automatización/API en la modalidad actual ni se conoce el
margen interno de Zipnova sobre cada tarifa.

### Límites de esta comprobación

- Facturación también muestra un límite de crédito de ARS 999.999 y próxima fecha
  de facturación en 2036. Se observaron **dentro del modo de pruebas**: no se toman
  como financiación ni condiciones concedidas para producción.
- La pantalla de transferencia no publica una comisión ni un mínimo. No se afirma
  que todos los costos bancarios sean cero. El 2% por Mercado Pago proviene de los
  [términos argentinos](https://app.zipnova.com.ar/terms), no de una transacción
  realizada durante la revisión.
- Los controles de servicios de los perfiles no mostraron modos, clasificaciones
  ni restricciones al seleccionarlos. No se interpretan esos espacios vacíos como
  ausencia de restricciones.
- Que un transporte esté activo o el plan mencione recolección no prueba cobertura
  de retiro desde Mar del Plata. Sigue vigente la confirmación específica de Enzo:
  despacho en sucursal OCA/Correo Argentino; retiro requiere contrato propio.
- No se creó un envío ni se pidió cambio de modo. No se modificó la suscripción.

### Efecto automático al consultar recargas

Al abrir la opción de transferencia, el portal informó que generó y guardó los
datos bancarios exclusivos para futuras recargas. La navegación no anticipaba
esa generación. No se ingresó un monto, no se transfirió dinero ni se continuó
un pago por Mercado Pago. Los datos bancarios no se copian a este documento.

Capturas privadas en `tmp/zipnova-account-20261026/`: `plan.png`,
`suscripcion.png`, `facturacion.png`, `modo-pruebas.png`, `transferencia.png`.

## Embalaje: fuentes y decisión operativa

**Decisión de Bruno del 26/10:** continuar con las condiciones oficiales de
OCA/Correo revisadas abajo; retirar la consulta a Comercial y no tratar la
cobertura ni una respuesta comercial como requisitos para la apertura.
La preparación y medición del embalaje real siguen siendo necesarias.

Esta decisión no equivale a comprobar que todas las condiciones de Zipnova
sean exclusivas del seguro: sus términos presentan la política de embalaje como
obligatoria para el servicio. No se comprobó una exención para Canela ni una
obligación general de madera de ambos transportes.

La [guía de bazar](https://ayuda-envios.zipnova.com/hc/es-419/articles/45276951402131-Embalaje-de-productos-de-bazar)
incluye artículos decorativos, vasos y vajilla. Indica caja doble/resistente,
protección individual, separadores fijos, relleno inmovilizador y al menos 5 cm
respecto de paredes/esquinas. Aclara que el papel no sirve como separador y que
el vidrio no tiene cobertura por daños.

La [guía de frágiles](https://ayuda-envios.zipnova.com/hc/es-419/articles/45276928115219-Embalaje-de-productos-fr%C3%A1giles)
exige estructura de madera y la menciona expresamente para piezas con vidrio.
También exige identificar los productos como vidrio/cristal/espejos. Su alcance
incluye productos de construcción y voluminosos; eso no permite asumir que las
piezas pequeñas de Canela estén exceptuadas.

La diferencia entre ambas guías motivó el borrador comercial, posteriormente
retirado por Bruno. No se convierte esa consulta en un bloqueo del proyecto.

### Contraste con fuentes oficiales de los transportes — 26/10/2026

- [OCA, guía oficial de paquetes](https://www.oca.com.ar/Content/Guia_Paquetes.pdf),
  páginas 3–4 y 7: recomienda cartón corrugado doble, acolchado e inmovilización;
  contempla varios artículos envueltos individualmente en una caja. Aconseja
  3–5 cm de amortiguación y pide identificación exterior de frágil y orientación.
  No publica allí una obligación general de estructura de madera.
- [OCA, pregunta 14](https://www6.oca.com.ar/PlataformaEnvios/PreguntasFrecuentes):
  admite frágiles bien embalados, pero no permite contratarles seguro desde esa
  Plataforma de Envíos. No extrapolar esta condición a convenios corporativos.
- [Correo Argentino, condiciones de embalaje](https://www.correoargentino.com.ar/servicios/paqueteria/condiciones-de-embalaje):
  exige proteger e inmovilizar las piezas; admite cartón y otros materiales aptos.
  Los 50 mm de separación se presentan como recomendación. No exige madera
  universalmente para frágiles. MiCorreo enlaza estas condiciones desde sus FAQ.

La obligación de madera citada anteriormente pertenece a la guía de Zipnova;
no se comprobó que reproduzca una obligación general de ambos transportes.
Sus [términos, Anexo A](https://app.zipnova.com.ar/terms) incorporan su propia
política de embalaje al servicio y a los reintegros. Esto no identifica el origen
de cada requisito ni prueba un acuerdo privado con OCA/Correo. El alcance de
la exigencia de madera de Zipnova para bazar pequeño no quedó aclarado por escrito;
Bruno decidió no continuar esa consulta.

Copia de consulta del PDF oficial y texto extraído en
`tmp/carrier-packaging-20261026/`. Se revisaron textos públicos, sin contratar
servicios ni enviar consultas externas.

## Seguro

Las [exclusiones](https://ayuda-envios.zipnova.com/hc/es-419/articles/45276921348371-Productos-no-cubiertos-por-el-seguro)
limitan vidrio, espejos y cerámicos/porcelanatos a robo o extravío, excluyendo
daños totales y parciales. Obras de arte aparecen entre los productos sin
cobertura. Se conserva el hallazgo como referencia; no genera una consulta ni
una dependencia de apertura.

Ampliación: los términos vigentes de Zipnova sí incluyen expresamente vajilla
de cerámica, loza, barro y arcilla entre los productos con cobertura limitada a
robo/extravío. No se buscarán alternativas para roturas ni se consultará el
encuadre asegurador de cuadros decorativos, por decisión de Bruno.

## Comunicaciones depuradas

- Comercial: borrador retirado, no enviar. Su respuesta deja de ser una
  dependencia de apertura. No continuar consultas de cobertura ni seguro.
- Soporte: cuenta de pruebas separada para el futuro, sin bloquear apertura.
  Clasificación e indicador visual de modo ya están resueltos (ver FIN-120);
  se retiraron esas preguntas del borrador. El cambio de modo se solicitará expresamente
  cuando corresponda, en el hilo con Enzo.

Los borradores siguen sin enviarse; soporte queda como referencia posterior. La revisión
no abre el checkout ni cambia flags de la aplicación.
