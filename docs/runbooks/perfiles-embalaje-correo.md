# Relevamiento de perfiles embalados para Correo Argentino

## Propósito

Completar en Sanity el perfil de envío de cada producto vendible antes de pedir
tarifas reales. `medidas` describe la pieza al comprador; `shippingProfile`
describe **una unidad ya protegida y lista para despachar**.

## Checklist por producto

- [ ] Embalar físicamente una unidad como saldrá del taller, con protección para
  vidrio, cerámica o marco según corresponda.
- [ ] Pesarla ya embalada y registrar `weightGrams` como entero en gramos.
- [ ] Medir alto, ancho y largo exteriores de ese bulto y registrar `heightCm`,
  `widthCm` y `lengthCm` como enteros en centímetros. Redondear hacia arriba si
  la medición cae entre centímetros enteros.
- [ ] Decidir `shipSeparately`: `true` si esa pieza nunca puede compartir una caja
  exterior con otra; `false` solo si se podría aprobar alguna combinación. Un
  valor `false` **no agrupa automáticamente** productos.
- [ ] Cargar `version: 1` al crear el perfil. Si cambian protección, peso o caja,
  actualizar las medidas y aumentar la versión.
- [ ] Verificar que el perfil publicado coincide con el embalaje que efectivamente
  puede preparar el taller.

Repetir para cada producto vendible publicado. Si falta un perfil, el sistema
rechazará la cotización de un carrito que contenga ese producto. Los productos
por encargo quedan fuera de esta primera integración.

## Cajas compartidas

El lanzamiento puede comenzar sin reglas de agrupación: se cotiza un bulto
exterior por unidad protegida. Para aprobar una caja común más adelante, registrar
la lista exacta de productos y cantidades que caben, el peso total embalado y las
medidas exteriores de esa caja. El dueño debe confirmar que el conjunto es seguro
de preparar; las dimensiones de las piezas sueltas no bastan para deducirlo.

## Datos operativos adicionales

- Confirmar el código postal desde el que saldrán realmente los paquetes.
- Confirmar con Correo los límites efectivos de peso y tamaño del servicio
  habilitado para la cuenta antes de activar la cotización.
- Mantener credenciales API y datos de acceso fuera de Sanity y de este documento.

Relacionado: [spec de cotización](../specs/040-correo-cotizacion.md) y
[plan de implementación](../plans/003-correo-argentino-cotizacion.md).
