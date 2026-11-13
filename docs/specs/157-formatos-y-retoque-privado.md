# PER-157 — Dos formatos y retoque exclusivo del taller

02/11/2026. Misma rama. Mantenimiento de producción conservado.

## Decisiones

- Comprador: foto local, encuadre, tamaño, formato 1×1 o 2×2 y resumen/compra
  separada. Retirar pintura individual y reemplazos globales de color públicos.
- Paletas confirmadas: 1×1, los 29 del PER-156; 2×2, los 36 clásicos sin M24/C50.
- Geometría orientativa: 11 mm / 20 mm, junta 1 mm, marco negro 10 mm por lado;
  grillas 15–90 / 15–45. Medidas físicas y plazo siguen sin confirmar.
- Cada formato conserva configuración, paleta, precios, paquetes y aprobaciones
  propios. Plazo, capacidad y condiciones se comparten. Un documento privado en
  PostgreSQL, con publicación/versionado atómicos; no duplicar la autoridad.
- Identificar el formato en configuración, cotización, resumen, pedido y guía;
  rechazar combinaciones/configuraciones obsoletas en el servidor. No derivar
  tarifas reales ni publicar valores de prueba. Conservar snapshots anteriores.
- Al cambiar formato conservar la foto y encuadre; adaptar grilla a límites. Una
  plantilla se adapta explícitamente a la paleta elegida; explicar la adaptación.
- Mariela retoca pedidos pagos pendientes de fabricación/ en fabricación desde
  la ficha. Persistir una matriz de fabricación separada del diseño aceptado;
  no cambiar precio, pago, geometría, paleta ni consentimiento del comprador.
  Avisar antes de comprar que puede haber pequeños ajustes durante el armado;
  retirar la promesa anterior de igualdad pieza por pieza.
- Guardar exige sesión administrativa, mismo origen, cuerpo acotado, versión
  vigente, estado permitido y colores de la paleta del pedido. Registrar auditoría.
  Guía privada usa el diseño de fabricación; el recibo mantiene el aceptado.
  Exportar a la galería requiere cuadro terminado: así no compite con retoques.

## Pruebas y entrega

- Formatos: selecciones exactas, límites, adaptación, precios/geometrías distintas,
  snapshot inmutable; cambio con foto/template y ida/vuelta al resumen.
- Público: sin acciones de retoque ni editores manuales de colores.
- Panel: pintura, undo/redo, guardar/cancelar; conflictos conservan cambios.
- Servidor/SQL: 401/403, matrices/colores inválidos, pedidos impagos/terminados,
  actualización concurrente, recibo original y guía de fabricación corregida.
- Repetir suite de catálogo/media y pruebas SQL de la migración; documentar rutas
  de QA manual y distinguir evidencia histórica, pruebas actuales y despliegue.
- Nueva migración aditiva para matriz de fabricación; no reescribir migraciones
  aplicadas ni alterar archivos de imágenes. Sin cobros/envíos ni despliegue implícito.
