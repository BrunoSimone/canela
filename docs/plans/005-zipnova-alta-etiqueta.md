# Plan: alta y etiqueta sandbox

Contrato: [spec 070](../specs/070-zipnova-alta-etiqueta.md).

- [x] FUL-01/03: destinatario persistido y restricción de bultos en cotización;
   verificar formularios, validación y compatibilidad de pedidos anteriores.
- [x] FUL-02/04/05/08: dominio, repositorio transaccional y servicio; verificar
   invariantes, concurrencia, recotización y recuperación sin duplicados.
- [x] FUL-05/06/07: adaptador Zipnova de alta, búsqueda, detalle y PDF; validar
   contrato real sandbox y errores con fixtures.
- [x] FUL-02/06/07/08: endpoints autenticados y ficha; verificar confirmación y
   recuperación con tests, recuperación real desde UI y descarga administrativa
   sin confundirla con despacho.
- [x] Evidencia: tests, PostgreSQL aislado, contrato sandbox, tipos, lint, build,
   revisión visual y runbook. No migrar ni desplegar producción.

Resultado y límites: [ZIP-02](../evidence/ZIP-02.md).
