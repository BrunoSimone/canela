# MED-151 — Almacenamiento de imágenes antes de migrar el catálogo

Fecha: 2026-10-28. Rama: `codex/creador-cuadros-personalizados`.
Decisión: [ADR-007](../adr/007-panel-unificado-y-catalogo-postgresql-propuesta.md).

## Objetivo

Validar Neon Object Storage en la cuenta de Canela y preparar un contrato de
archivos que permita retirar los assets de Sanity sin perder originales,
recortes, transparencia ni referencias. Conservar Next/Vercel para la entrega,
Spaceship para DNS y el mantenimiento de producción activo.

## Secuencia y alcance

1. Crear un proyecto Free de medios en AWS N. Virginia, región documentada como
   compatible. La base y las órdenes actuales siguen en São Paulo.
2. Confirmar disponibilidad efectiva del servicio antes de conectar la tienda.
   Si no está accesible en la cuenta, registrar el bloqueo y no improvisar una
   API ni almacenar imágenes binarias en PostgreSQL.
3. Preparar credenciales limitadas al proyecto/branch de archivos; originales
   privados y versiones web de lectura pública. Las credenciales son exclusivas
   del backend. Los secretos no se imprimen ni se incorporan al repositorio.
4. Probar con archivos sintéticos o fixtures autorizadas. Implementar contrato,
   procesamiento y pruebas antes de la importación definitiva.
5. Migrar catálogo/stock en una etapa posterior, una vez aceptado el almacenamiento.
   Sanity conserva la autoridad y sus archivos durante esta etapa.

## Contrato de imágenes

- PostgreSQL conserva IDs de assets, claves, hash, tamaño, MIME, dimensiones,
  relaciones, estado, recorte/punto focal y orden; no bytes ni base64.
- Claves inmutables derivadas del contenido/versión de procesamiento. Repetir
  una carga no duplica archivos ni sobreescribe una imagen usada por un pedido.
- Validar firma/contenido, tamaño y cantidad de píxeles antes de procesar.
  Rechazar archivos corruptos y formatos no admitidos con errores útiles.
- Conservar el original; normalizar orientación y color en la versión web,
  mantener transparencia y limitar dimensiones. Next/Vercel produce los tamaños
  responsivos usando URLs estables. No transformar reiteradamente derivados.
- Publicar una referencia solo después de verificar el archivo en el almacén.
  Un fallo entre almacenamiento y base no puede publicar un enlace roto.
- Las eliminaciones del editor son recuperables y respetan referencias de otros
  productos y snapshots históricos. No depender del versionado/lifecycle S3,
  que Neon documenta como no ejecutados.
- Export recuperable con manifiesto/hash y originales; probar recuperación.
- Las fotos de compradores del creador siguen procesándose localmente en el
  navegador. Esta etapa no habilita su almacenamiento ni publicación automática.

## Capacidad y criterios para continuar gratis

- Volumen observado: 281.417.444 bytes en 100 originales de Sanity.
- Free: 5 GB de Object Storage por proyecto. Diez veces el volumen actual son
  2.814.174.440 bytes; entran los originales, pero faltan derivados y otros usos.
- El límite es por bytes, no cantidad de fotos. 5 GB equivalen a unas 17,8 veces
  el volumen original observado, sin contar versiones ni cambios de branches.
- Transferencia: 5 GB/mes por proyecto compartidos entre sus servicios. Es un
  límite independiente que puede requerir Launch antes de agotar almacenamiento.
- El proyecto separado evita compartir la cuota de fotos con el de órdenes.
  Verificar caché de Vercel; no prometer gratuidad para cualquier tráfico.
- Bruno acepta evaluar Launch si el uso lo exige. No activar un plan pago en
  esta etapa ni asumir que las franquicias Free se trasladan a Launch.

## Pruebas y aceptación

| Flujo | Prueba | Criterio |
| --- | --- | --- |
| Servicio disponible | Consola/proveedor real | Endpoint y buckets accesibles en el proyecto de medios |
| Carga y descarga | Contrato remoto con fixture | Bytes/hash coinciden; MIME y caché correctos |
| Privacidad | Contrato remoto | Original anónimo rechazado; versión pública accesible |
| Carga inválida | Unitarias de procesamiento | Archivo falso/corrupto/excesivo rechazado sin publicación |
| Calidad | Unitarias + QA visual | Orientación, alfa, recorte y color preservados |
| Reintento/idempotencia | Integración | No duplica ni reemplaza contenido distinto |
| Fallo parcial | Integración | No se publica una referencia a un asset incompleto |
| Entrega | Navegador/Vercel | Tamaños responsivos y caché, sin DNS/CDN adicional |
| Recuperación | Import/export con manifiesto | Original recuperado coincide por hash |
| Aislamiento | Revisión del diff/config | Sin escritura en stock, órdenes o assets existentes |

Los tests aislados no sustituyen la prueba real contra el proveedor. Si esta
última queda bloqueada, registrar qué se verificó y qué falta, sin marcar la
etapa como terminada.

## Fuentes verificadas

- https://neon.com/docs/storage/overview
- https://neon.com/docs/storage/buckets
- https://neon.com/docs/storage/s3-compatibility
- https://neon.com/docs/introduction/plans
- https://vercel.com/docs/image-optimization/managing-image-optimization-costs
