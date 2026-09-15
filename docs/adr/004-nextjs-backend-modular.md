# ADR-004: Next.js como backend modular

## Estado

Aceptado por Bruno el 2026-09-15.

## Contexto

Canela ya funciona en producción con Next.js App Router. El nuevo ecommerce
necesita endpoints de checkout, Webhooks, acceso administrativo y procesos de
reconciliación. Bruno trabaja habitualmente con React, RTK Query y NestJS, por lo
que se evaluó separar un backend NestJS.

## Opciones consideradas

1. Mantener frontend y backend en Next.js, con límites internos explícitos.
2. Mantener Next.js para el frontend y agregar una aplicación NestJS.
3. Reescribir el frontend con Vite y usar NestJS como backend independiente.

## Decisión

Mantener un monolito modular en Next.js. Los Route Handlers se limitan a HTTP,
autenticación y validación. Los casos de uso, reglas de dominio y adaptadores no
dependen de la capa web.

La organización objetivo es:

```text
src/modules/<capacidad>/
  domain/
  application/
  infrastructure/

src/app/api/
  Route Handlers delgados
```

Las dependencias apuntan hacia las reglas del negocio. El dominio no importa
Next.js, Mercado Pago, Correo Argentino ni detalles de PostgreSQL.

## Consecuencias

- Un único repositorio, dominio y despliegue.
- Los secretos permanecen en módulos server-only y variables sin prefijo
  `NEXT_PUBLIC_`.
- Los endpoints públicos aplican autenticación o firma, validación, rate limit e
  idempotencia según su actor.
- No se agrega CORS ni un segundo pipeline sin una necesidad observable.
- NestJS se reconsidera si aparecen varios clientes, equipos independientes,
  workers persistentes, una API pública o escalado separado.

## Convención de código

- Nombres y límites deben hacer visible la responsabilidad de cada archivo.
- Los comentarios explican decisiones no evidentes, invariantes o restricciones
  externas; no repiten lo que el código ya expresa.
- Las listas, enumeraciones y bloques de estilos pueden usar comentarios breves
  cuando mejoren la navegación manual.
