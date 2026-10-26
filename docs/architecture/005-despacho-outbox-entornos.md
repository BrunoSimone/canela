# Diseño: despacho, outbox y entornos

Decisión local reversible dentro de OPS-01..10. PostgreSQL ya es la autoridad
para pedidos; usar su transacción para registrar eventos evita la ventana entre
commit y envío de email. No se agrega proveedor de colas ni dependencia nueva.

- Migración aditiva: entorno de pedido (históricos test), despacho por pedido
  con PK/actor/fecha/seguimiento, y outbox con UNIQUE(pedido,tipo), payload congelado,
  estado, intentos, lease, próximo intento y referencia Resend.
- Pago verificado inserta `owner_paid` dentro de la misma transacción del stock.
  Despacho bloquea pedido/envío, comprueba precondiciones y guarda `buyer_shipped`.
- Worker adquiere una notificación con `FOR UPDATE SKIP LOCKED`. Renderiza antes
  del primer POST, persiste payload y momento del primer intento, libera el lock
  durante red. Usa una clave Resend por UUID del aviso. Lease de 60 s supera timeout
  HTTP de 10 s; ack/update exige token del claim para ignorar respuestas tardías.
- Una respuesta perdida puede significar aceptación remota. Recuperar con mismo
  payload y clave antes de 23 h; después revisión manual. Se sacrifica reenvío
  automático tardío para evitar duplicados fuera de la ventana del proveedor.
- `after()` de Next inicia un intento acotado después de respuesta. No es la única
  fuente de recuperación: reintento administrativo, CLI y endpoint con secreto.
  Por decisión de Bruno del 26/10/2026 no se usa scheduler; la [spec 121](../specs/121-recuperacion-manual-sin-cron.md)
  fija supervisión humana, sin promesa de ejecución autónoma. El estado del aviso
  permanece visible en la ficha del pedido; no hay alerta independiente del email.
- Test y producción se aíslan por entorno persistido del pedido y configuración.
  Remitente/destino/cuerpo se congelan por aviso y cambios incompatibles requieren
  revisión. El acceso por email del admin conserva su template y comportamiento.
- La configuración productiva es fail-closed. La aprobación comercial es una flag
  que declara una decisión humana, no evidencia de que los proveedores estén habilitados.
  Un preflight local verifica coherencia/configuración, no certifica apertura comercial.
