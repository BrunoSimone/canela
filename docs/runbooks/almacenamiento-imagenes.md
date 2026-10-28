# Archivos de Canela — conexión y validación

Referencia: MED-151 y ADR-007. El proyecto de medios usa Neon Free en Virginia,
separado de la base de negocio de São Paulo. No cambiar DNS ni `DATABASE_URL`.

## Configuración

1. En Neon abrir `canela-media` → branch `production` → Object storage.
2. Comprobar `originals` **Private** y `web` **Public**.
3. En Connect → Storage → `.env`, obtener la credencial S3 de este branch.
   Guardar únicamente las variables `CANELA_MEDIA_*` indicadas en `.env.example`.
   No ejecutar un `neon init`/`neon deploy` general desde el repositorio: podría
   reemplazar variables de la base de negocio con las del proyecto de archivos.
4. Conservar secretos fuera de Git y del frontend; no incluirlos en capturas.
   Vercel se configurará durante la integración del panel, después del contrato
   remoto. La preparación actual no activa el proveedor en la tienda.

## Prueba remota

Desde la raíz del repositorio, con las variables locales configuradas:

```sh
CANELA_MEDIA_CONFIRM_BRANCH=br-small-dew-b7f190rq pnpm media:verify
```

Solo escribe una imagen sintética pequeña y su derivado, con claves por hash.
Repetir el comando verifica los mismos objetos. No elimina nada ni crea envíos,
pagos, pedidos o correos. Fallar un permiso/hash/caché debe impedir la aceptación.

El comando genera en `output/media-151/` un original recuperado, su versión web y
un manifiesto sin secretos. Esto prueba descarga íntegra; la restauración del
catálogo y sus referencias requiere el ensayo de migración posterior.

## Uso gratuito y crecimiento

- Se observan bytes almacenados y transferencia mensual por separado.
- 10 veces los originales actuales (~281 MB) son ~2,81 GB, antes de derivados.
  La cuota Free de archivos es 5 GB/proyecto; no es un límite de cantidad de fotos.
- La transferencia Free es 5 GB/mes/proyecto. La caché de Next/Vercel reduce las
  lecturas de Neon pero no elimina consumo ni garantiza una cantidad de visitas.
- La decisión de pasar a Launch se toma antes de agotar la cuota. En planes
  pagos se factura uso y se pueden configurar avisos de gasto; esos avisos no
  son un límite duro de presupuesto.
- El plan se gestiona por organización. Revisar otros proyectos antes de cambiar
  de plan, además del consumo de Canela y sus archivos.

## Antes de retirar Sanity

Exportar originales y manifiesto con hashes; conciliar referencias de borradores,
productos, carruseles, catálogo de cuadros y assets usados desde código. No borrar
archivos por estar fuera de los productos publicados. Validar recortes, foco,
orden, transparencia y proporción con la tienda y el panel reales. Verificar
restauración desde una copia independiente y mantener el mantenimiento activo
durante el cambio de autoridad.
