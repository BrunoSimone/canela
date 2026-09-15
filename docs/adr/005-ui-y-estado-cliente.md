# ADR-005: primitivas de UI y estado cliente

## Estado

Aceptado por Bruno el 2026-09-15.

## Contexto

La interfaz actual usa componentes locales generados con convenciones de shadcn,
primitivas Base UI, iconos Lucide y animaciones Motion. El ecommerce incorporará
carrito global, mutaciones, polling de pagos y una bandeja administrativa.

## Decisión

- Mantener componentes propios en `src/components/ui`, usando shadcn como fuente
  y convención de composición.
- Usar Base UI como única biblioteca de primitivas accesibles. No agregar Radix,
  Material UI u otra capa equivalente.
- Usar Lucide para iconos, Motion para animaciones complejas y CSS/Tailwind para
  transiciones simples.
- Incorporar Redux Toolkit para estado global mutable y RTK Query para requests
  iniciados por componentes cliente a partir de MP-03.
- Los Server Components consultan servicios server-side directamente y no usan
  Redux.
- La búsqueda, el orden y la paginación navegable viven en la URL.
- Los estados autoritativos de stock, pago y fulfillment permanecen en Neon.

## Consecuencias

- El carrito puede persistir entre navegaciones y recargas, pero sus precios son
  solo informativos y el backend siempre los recalcula.
- RTK Query organiza loading, error, polling e invalidación cliente sin convertirse
  en fuente de verdad del negocio.
- Los Route Handlers forman el contrato HTTP para checkout y operaciones
  administrativas; no se duplican esas mutaciones con Server Actions en el MVP.
- El store se crea por request/árbol cliente y nunca como singleton global del
  servidor.
