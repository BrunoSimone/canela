# SEC-152 — Revisión de seguridad y escalabilidad

Fecha: 2026-10-28. Instrucción permanente: `AGENTS.md`.

## Alcance de esta iteración

Inventariar rutas y dependencias, revisar los límites de confianza de accesos,
checkout, pagos, inventario, envíos y archivos, y corregir hallazgos comprobables.
No modificar credenciales comerciales, activar pagos/envíos de prueba en
producción ni retirar mantenimiento. No cambiar todavía la autoridad de Sanity.

## Criterios verificables

1. Los cuerpos HTTP se limitan por bytes durante la lectura, aunque omitan o
   falseen Content-Length. Cancelar al exceder el límite; acotar también el tiempo
   y manejar desconexiones. Mantener los códigos de error de cada flujo.
2. Los metadatos JSON-LD no permiten cerrar el script mediante contenido del CMS.
   Se conserva el texto original al deserializar el JSON.
3. Actualizar dependencias vulnerables con versiones estables compatibles;
   revisar los avisos restantes y comprobar compilación y pruebas existentes.
4. Probar los límites antes de invocar repositorios/proveedores. Autenticación y
   control de origen preceden a mutaciones privadas.
5. Registrar evidencia de idempotencia, límites de consulta y recursos, así como
   riesgos pendientes. No confundir ausencia de avisos con ausencia de fallos.

## Pruebas

- Streams sin longitud, longitud falsa, UTF-8 multibyte/partido/inválido, tamaño
  exacto, exceso, timeout, aborto y error de lectura.
- Checkout/webhook/login/preparación rechazan entradas inválidas sin efectos.
- Inyección `</script>` en nombre/descripción no agrega nodos HTML ejecutables.
- Suite automática, TypeScript, lint y build con dependencias actualizadas.
- Contrato de archivos MED-151 contra el proveedor real, con fixture sintética.

Las pruebas de carga distribuida y un pentest independiente quedan fuera de esta
iteración; documentar esta limitación, sin prometer capacidad no medida.
