# ADR-002: fuente y validación del contrato de Correo Argentino

## Estado

Aceptado por Bruno el 2026-09-14.

## Contexto

La copia de `apiPaqAr-v2.pdf` entregada por el cliente fue comprobada como no fiable para definir la integración. Además, que un manual esté publicado en el sitio oficial no garantiza por sí solo que esté actualizado: el manual público de API MiCorreo consultado el 2026-09-14 muestra fecha 2022.

Necesitamos distinguir tres cosas:

- lo que Correo declara públicamente que debería aceptar;
- lo que el ambiente QA acepta realmente para la cuenta de Canela;
- la habilitación comercial particular de esa cuenta.

## Decisión

1. La copia entregada por el cliente queda archivada únicamente como antecedente histórico. No define endpoints, payloads, credenciales ni criterios de aceptación.
2. La referencia de diseño será exclusivamente la documentación disponible en dominios oficiales de Correo Argentino, registrando URL, fecha de consulta y fecha o versión visible del documento.
3. El contrato ejecutable será el comportamiento comprobado en el ambiente QA oficial con las credenciales de Canela.
4. Ningún endpoint pasa a producción sin una prueba de contrato en QA que cubra al menos autenticación, solicitud válida, errores relevantes e idempotencia o estrategia segura de repetición.
5. Si la documentación oficial y QA se contradicen, no se elige una versión por intuición: el incremento queda bloqueado y se pide confirmación escrita al ejecutivo o soporte de Correo.
6. La integración se implementará detrás de un adaptador interno normalizado para que un cambio de versión o API no contamine las reglas de checkout, órdenes y pagos.
7. El objetivo inicial será API MiCorreo porque su documentación pública incluye cotización previa al pago mediante `/rates`. PAQ.AR no se implementará salvo que Correo confirme que es el contrato vigente requerido para la cuenta.

## Fuentes oficiales iniciales

Consultadas el 2026-09-14:

- Portal de integración MiCorreo: <https://www.correoargentino.com.ar/MiCorreo/public/mi-correo>
- Preguntas frecuentes MiCorreo: <https://www.correoargentino.com.ar/MiCorreo/public/faqs>
- Manual público API MiCorreo: <https://www.correoargentino.com.ar/MiCorreo/public/img/pag/apiMiCorreo.pdf> — el documento visible está fechado 2022; debe validarse contra QA.
- Condiciones de embalaje: <https://www.correoargentino.com.ar/servicios/paqueteria/condiciones-de-embalaje>

Estas URLs son puntos de entrada, no una autorización permanente para asumir que su contenido seguirá igual. Cada implementación debe guardar su evidencia de contrato.

## Consecuencias

- INT-00 deja de consistir en interpretar el PDF del cliente y pasa a construir una matriz de contrato oficial + evidencia QA.
- Necesitamos que el cliente gestione credenciales y habilitación con su ejecutivo comercial; la documentación pública no prueba qué servicios tiene activos.
- El costo de una inconsistencia se detecta antes de mezclarla con Mercado Pago.
- El adaptador agrega una capa pequeña, pero reduce el impacto de versiones, nombres y contratos distintos.

## Puerta de salida de INT-00

INT-00 termina solamente cuando existen:

- credenciales QA válidas para Canela;
- confirmación del producto/API habilitado para la cuenta;
- prueba exitosa de autenticación;
- prueba de cotización con `/rates` o confirmación oficial de su reemplazo;
- matriz documentada de campos, errores y modalidades habilitadas;
- canal de escalamiento para contradicciones.
