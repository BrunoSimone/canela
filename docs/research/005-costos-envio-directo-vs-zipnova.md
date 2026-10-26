# Costos de envío directo y mediante Zipnova

Consulta: **26/10/2026**, Argentina. Objetivo: distinguir la tarifa logística del
costo de la plataforma y comprobar si operar manualmente permitiría ahorrar.

## Conclusión

No hay evidencia de que eliminar la automatización abarate por sí mismo un envío.
El plan público Starter de Zipnova es gratuito e incluye API. No se encontró un
recargo público específico por crear el envío vía API. Esto no revela el margen
comercial incorporado en las tarifas. La revisión posterior del 26/10 en la sesión
de Chrome confirmó **Starter, ARS 0 por mes, sin vencimiento y sin adicionales**.
Ver [verificación autenticada de la cuenta](006-zipnova-cuenta-condiciones.md).
No hace falta consultar a Comercial qué plan contrataron.
[Planes oficiales](https://www.zipnova.com/zipnova-envios/precios-zipnova-envios-ar/).

Hay tres alternativas diferentes:

| Operación | Precio a comparar | Trabajo operativo |
| --- | --- | --- |
| API de Zipnova | Cotización de la cuenta y sus condiciones | La app envía los datos |
| Carga manual dentro de Zipnova | Cotización de la misma cuenta y condiciones | El operador vuelve a cargar los datos |
| Contratación directa con el transporte | Tarifa de su portal, sucursal o contrato | Gestión y conciliación manual con el transporte |

Para los canales con tarifa plana, los términos aclaran que aplica la tarifa
dinámica al crear el envío tanto manual como automáticamente. No prueban una
igualdad universal entre promociones, planes o contratos distintos. Publican
además un **2% por recargar saldo mediante Mercado Pago o plataformas similares**;
la transferencia bancaria aparece como alternativa. Ese cargo es distinto de la
comisión que Mercado Pago cobre por las ventas de Canela. Los envíos fuera de la
red, como contrato propio, tienen otro esquema de cargos y no describen la
operación actual. [Términos Argentina, actualización 19/08/2026](https://app.zipnova.com.ar/terms).

## Comparación consultada el mismo día

Paquete sintético: **600 g, alto 10 × ancho 14 × largo 24 cm**, un bulto;
Mar del Plata **7600 → La Plata 1900**, entrega a domicilio, despacho en sucursal.
No representa un producto real de Canela.

| Canal / transporte | Importe mostrado (ARS) | Condiciones observadas |
| --- | ---: | --- |
| Portal directo OCA | 16.960 | Estimado a domicilio; 4 días hábiles; sin contratar seguro |
| Zipnova / OCA | 12.600 | Incluye impuestos y componente seguro; valor declarado 30.000 |
| Zipnova / Correo Argentino | 19.797 | Incluye impuestos y componente seguro; valor declarado 30.000 |
| MiCorreo directo | No obtenido | Portal exige iniciar sesión; no había sesión disponible |

**Diferencia observada OCA:** 4.360 ARS (25,7% menos en Zipnova respecto del
importe directo mostrado). No es la comisión de Zipnova ni una garantía de ahorro
general: los plazos y las condiciones de cobertura no se igualaron. La API de
Zipnova estima 5–6 días de transporte para OCA, además de preparación; el portal
directo muestra 4 días hábiles. Su cotizador considera un peso volumétrico de
0,84 kg para esta caja.

El cotizador OCA también mostró 13.580 ARS a sucursal y 26.040 ARS express a
domicilio. No se comparan con la tarifa estándar a domicilio de Zipnova.
[Cotizador oficial OCA](https://www6.oca.com.ar/PlataformaEnvios/Home/).

Se hicieron dos consultas `POST /v2/shipments/quote` con la cuenta existente en
sandbox, origen configurado y clasificación sintética General (`1`). La segunda
solo cambia el valor declarado de 250 a 30.000 ARS. Se conservaron URL y
credenciales y no se crearon envíos, etiquetas ni cargos.

Con valor declarado 250 ARS, los totales fueron 12.060 OCA y 19.257 Correo, iguales
a los de la prueba del 23/10. No usar ese valor declarado de QA para productos reales.
La clasificación sintética y la inclusión de seguro en la respuesta **no prueban
admisión ni cobertura de piezas frágiles**.

Evidencia local privada, sin secretos, en `tmp/shipping-cost-research-20261026/`:

- `zipnova-quotes.json`: campos seleccionados de las respuestas.
- `oca-paquete.png`, `oca-recorrido.png`, `oca-cotizacion.png`: capturas del cotizador.
- Script reproducible de consulta: `tmp/shipping-cost-research-20261026.mjs`.

## Qué incluye el importe de Zipnova

Ejemplo OCA con valor declarado 30.000 ARS:

| Componente de la respuesta | ARS |
| --- | ---: |
| Flete sin impuestos (`price_shipment`) | 9.963,22 |
| Seguro sin impuestos (`price_insurance`) | 450,00 |
| Subtotal sin impuestos | 10.413,22 |
| Diferencia por impuestos | 2.186,78 |
| Total (`price_incl_tax` y `seller_price_incl_tax`) | **12.600,00** |

Los 12.600 ya incluyen el transporte: no se suma otra tarifa de OCA. El desglose
API distingue flete, seguro, impuestos y precio comprador/vendedor; **no muestra
cuánto le paga Zipnova internamente a OCA**. Por eso `price_shipment` no puede
interpretarse como costo mayorista sin margen ni la diferencia entre comprador
y vendedor como comisión de Zipnova. En estas respuestas ambos totales coincidieron.
[Contrato de cotización](https://docs.zipnova.com/envios/recursos-api/envios/cotizar-envios).

## Límites y comprobaciones pendientes

- OCA describe su cotizador como aproximado, sujeto al pesaje final. Su FAQ admite
  frágiles correctamente embalados, pero indica que no pueden contratar seguro
  desde esa plataforma. La misma FAQ describe pago en destino, una diferencia
  operativa a validar si se pretende cobrar todo en el checkout.
  [FAQ oficial OCA](https://www6.oca.com.ar/PlataformaEnvios/PreguntasFrecuentes).
- No se obtuvo una cotización actual directa de MiCorreo. El PDF oficial hallado
  declara vigencia desde febrero de 2023 y se descartó como referencia actual.
  Obtener el precio en la cuenta, con el mismo paquete, valor y modalidad.
  [Portal MiCorreo](https://micorreo.correoargentino.com.ar/landing),
  [PDF histórico, no usar como tarifa vigente](https://www.correoargentino.com.ar/MiCorreo/public/files/lista-de-precios-CF-MiCorreo.pdf).
- La ayuda de Zipnova ya indica que vidrio, espejos y cerámicos/porcelanatos
  tienen cobertura solo por robo o extravío, sin daños totales o parciales. También
  excluye obras de arte. La aceptación general para transporte no prueba las
  restricciones de cada servicio. Consultar a Comercial requisitos de embalaje
  por transporte, encuadre de cerámica artesanal/cuadros y alternativas para
  cubrir roturas. El borrador se ajustó a esas dudas concretas; no se envió.
  [Exclusiones oficiales](https://ayuda-envios.zipnova.com/hc/es-419/articles/45276921348371-Productos-no-cubiertos-por-el-seguro).
- Cuando Mariela cargue pesos y cajas reales, repetir con una muestra de pedidos
  representativos. No extrapolar este único paquete a todo el catálogo.

## Recarga de saldo: información ya publicada

La guía de transferencia indica usar los datos bancarios exclusivos que muestra
la cuenta en Agregar Crédito y estima acreditación automática en 2–3 minutos.
No publica un recargo por esa modalidad; eso no certifica costos bancarios ni
condiciones privadas. La guía de Mercado Pago aclara que debe haber crédito
para descargar la documentación de despacho. Se retiraron del correo a Comercial
las consultas genéricas sobre recarga, plan y carga manual/API para concentrarlo
en las condiciones de los productos.
[Transferencia bancaria](https://ayuda-envios.zipnova.com/hc/es-419/articles/46044691482259-Cargar-saldo-mediante-transferencia-bancaria),
[Carga mediante Mercado Pago](https://ayuda-envios.zipnova.com/hc/es-419/articles/45276933636627-Cargar-saldo-mediante-Mercado-Pago).

## Recomendación para Canela

Conservar la integración mientras se completan las condiciones comerciales. El
ejemplo medido favorece la tarifa OCA de Zipnova y no demuestra ahorro al pasar a
gestión manual. Evaluar un cambio con tarifas totales equivalentes, tiempo de
carga, plazos, cobertura y forma de cobro; no decidir por el precio nominal solo.
No se modificó el código, el plan, las flags ni el modo remoto de la cuenta.
