# PER-134 — Paleta del catálogo Murvi

2026-10-27 · Rama `codex/creador-cuadros-personalizados`.
Reemplaza la paleta sintética de PER-131. Geometría, precios y compra siguen siendo de prueba.

## Alcance

Bruno aporta el catálogo que usará Mariela y solicita fidelidad entre el generador
y los materiales. Se incorporan exclusivamente las 62 referencias enlazadas en el
PDF: 38 Clásico, 17 Vitro y 7 Nuevo. El último recuadro se identifica como DI99 por
su enlace, aunque no tiene rótulo visible. No se incorporan otros colores del sitio.

La referencia digital se estima a partir de las texturas originales del fabricante.
No se dispone de medición física ni perfil ICC: no son HEX oficiales ni colores
calibrados. Vitro es transparente y su aspecto depende de la base. El fabricante
advierte variaciones entre partidas. La interfaz comunica estos límites junto a la
previsualización, sin prometer igualdad física ni un porcentaje de fidelidad.

## Reglas

- IDs estables por código Murvi, nombres con línea y código. No inventar nombres
  comerciales ni mantener los colores sintéticos como opciones de fabricación.
- JSON versionado con fuentes, hash de cada textura, método y estado de calibración.
  El repositorio del servidor entrega únicamente el DTO de colores usado por la UI.
- Generación, reemplazo global, retoques, galería y resumen usan la misma paleta.
- Plantillas sintéticas se recolorean explícitamente con códigos nuevos. Un diseño
  anterior incompatible sigue rechazándose; no migrar en silencio pedidos existentes.
- Límite de paleta de 128 colores para admitir el catálogo manteniendo validación
  y trabajo acotados. No cambiar el algoritmo de cuantización OKLab.
- Sin descargas del fabricante en tiempo de ejecución. Sin habilitar pagos reales.
- Fotos de origen no se publican en la tienda. Comparativa de fuentes disponible
  como material local de investigación.

## Aceptación

| ID | Resultado verificable |
| --- | --- |
| 134-01 | Las 62 referencias son únicas, poseen fuente y estado no calibrado, y los colores del DTO corresponden al catálogo. |
| 134-02 | Cada muestra plana convierte al código correspondiente; cualquier foto produce exclusivamente IDs permitidos y las transparencias de la foto se componen sobre B.34. |
| 134-03 | Galería, retoques/deshacer y resumen preservan códigos y HEX; un diseño con paleta vieja incompatible falla explícitamente. |
| 134-04 | Aviso de tonos orientativos y transparencia visible; los 62 colores son alcanzables con teclado, en móvil y escritorio. |
| 134-05 | Los precios continúan provisionales y los recorridos simulados mantienen sus barreras de cobro. |

La calibración física posterior debe contrastar muestras sobre la base real del
cuadro, con iluminación controlada y referencia de color. Cambiar los HEX implica
una nueva versión; no alterar snapshots de diseños ya confirmados.
