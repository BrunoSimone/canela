# Evidencia MP-02A: adaptador y persistencia de Mercado Pago Orders

## Fecha y entorno

- 2026-09-15.
- Next.js 16.2.9, TypeScript estricto, Vitest 5.
- PostgreSQL 17 en un contenedor efímero local.
- Mercado Pago simulado mediante `fetch` inyectado; no se enviaron requests reales.
- Neon y la aplicación de prueba de Mercado Pago siguen pendientes de conexión.

## Requisito → implementación → prueba → resultado

| Requisito | Implementación | Prueba | Resultado |
| --- | --- | --- | --- |
| Payload Orders candidato | Builder puro con `online`, `manual`, `automatic_async`, `PT10M`, URLs y exclusión de `ticket` | Comparación estructural completa del body | Aprobada localmente; corregida después por la evidencia MP-02B |
| Importes ARS exactos | Conversión entre centavos enteros y decimal textual sin operar dinero con flotantes | Cero, un centavo, montos normales y entradas inválidas | Aprobada |
| Idempotencia del proveedor | `X-Idempotency-Key` proviene del intento y la base impide repetirla por proveedor | Header inspeccionado y restricción única ejecutada en PostgreSQL | Aprobada |
| Consulta autoritativa | Adaptador de `GET /v1/orders/{id}` con credencial solo server-side | Respuesta normalizada sin exponer el token | Aprobada |
| Fallos distinguibles | Error tipado como definitivo, reintentable o ambiguo sin copiar detalles del proveedor | Casos HTTP 400, 423, 500 y error de red | Aprobada |
| Persistencia compatible | Migración 0002 agrega identidad Orders, URL y detalle, conservando columnas heredadas | Ejecución de 0001 y 0002 en una base vacía | Aprobada |
| Concurrencia previa intacta | La migración es aditiva y no altera las restricciones de inventario | Dos reservas paralelas para la última unidad | Exactamente una aprobada |

## Comandos verificados

```text
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
TEST_DATABASE_URL=<postgres-efimero> pnpm test:db
```

Resultados: 22 pruebas unitarias aprobadas, 4 de integración aprobadas, 4 de
integración omitidas en la corrida sin base; TypeScript, ESLint y build de
producción aprobados.

## Límites de esta evidencia

- No demuestra todavía el contrato real de Orders API. MP-02B debe ejecutar la
  matriz con una aplicación de prueba y registrar respuestas redactadas.
- MP-02B comprobó posteriormente que `items[].unit_measure`,
  `items[].total_amount` y `config.notification_url` no son aceptados. La spec,
  las pruebas y el adaptador ya reflejan el contrato real.
- `PT10M`, el ítem de envío y la exclusión efectiva de medios offline siguen
  siendo hipótesis hasta MP-02B.
- No conecta todavía reserva, creación remota y persistencia en un caso de uso;
  eso corresponde a MP-03 después de validar el contrato.
- No se ejecutó la migración sobre Neon. Debe probarse primero en una branch o
  base descartable, nunca directamente en producción.
