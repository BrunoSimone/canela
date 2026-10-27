# Canela — Artisan Ecommerce

Inventario vigente: Sanity es la fuente única de cantidades/reservas y se gestiona
con **Producto → Stock** en Studio. Ver [spec 100](docs/specs/100-inventario-sanity.md)
y [guía del cliente](docs/runbooks/carga-cliente.md).

Estado al 26/10/2026: tienda con mantenimiento activo y checkout deshabilitado.
Cierre de implementación, regresión y pendientes de aceptación en
[FIN-120](docs/evidence/FIN-120.md); revisión de tienda/panel en
[UX-110](docs/evidence/UX-110.md). La apertura requiere completar los gates del
[runbook](docs/runbooks/despacho-avisos-apertura.md).


An ecommerce for **Canela**, a studio that makes handcrafted glass, ceramics,
mirrors and framed art. Customers browse the Sanity-managed catalog, build a
cart and pay through Mercado Pago Checkout Pro. Neon PostgreSQL is authoritative
for orders, payment attempts, shipping records and the durable email outbox.
Sanity is authoritative for physical stock and reservations; PostgreSQL keeps
the order-side references and recovery intents.

Direct-sale products use the online checkout. Made-to-order pieces may remain in
the cart but cannot enter payment until removed; their separate flow is pending.
Production checkout stays disabled until shipping is validated from quotation
through fulfillment. Zipnova quotation and checkout selection are implemented
and deployed behind explicit gates. Shipment creation, recovery and private PDF labels are also implemented
and validated against Zipnova sandbox after the owner confirms the packaged order.
Explicit dispatch, durable order emails and guarded production configuration are now
deployed with the storefront closed. Test acceptance does not open real sales.

> **Flow:** browse → inspect → add to cart → review products and shipping → pay
> in Mercado Pago → confirm the result from Canela's server-side payment state.

---

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | **Next.js 16** — App Router, React Server Components |
| Language | **TypeScript** (strict) |
| UI runtime | **React 19** |
| Styling | **Tailwind CSS v4** (`@theme` tokens, no config file) |
| Components | **shadcn** (`base-nova` style) on **Base UI** primitives |
| CMS | **Sanity** (`next-sanity`), content lake + self-hosted Studio |
| Stock and reservations | **Sanity** — private operational documents, atomic version checks |
| Transactional data | **Neon PostgreSQL** — orders, payments, shipping, email outbox and recovery intents |
| Shipping | **Zipnova** — quotations, one shared parcel, private labels; account currently sandbox |
| Email | **Resend + React Email** — access, paid-order and dispatch notices |
| Payments | **Mercado Pago Checkout Pro** through Orders API |
| Client state | **Redux Toolkit + RTK Query** |
| Animation | **motion** (Framer Motion successor) |
| Carousel | **React state** — hero rotation and product photo navigation |
| Icons | **lucide-react** |
| Package manager | **pnpm** (Node ≥ 22) |

The stack intentionally mirrors a sibling project (`Guild`) so both share the same conventions, component patterns, and CMS setup.

---

## Architecture

The public catalog is rendered from Sanity in React Server Components. Client
islands handle filters, lightbox, cart and checkout requests. Next.js route
handlers form the server-side boundary for Mercado Pago and Neon; provider
credentials and payment validation never reach the browser.

```
src/
├─ app/
│  ├─ (marketing)/
│  │  ├─ layout.tsx        # marketing shell (navbar + floating actions + footer)
│  │  └─ page.tsx          # home: fetches products + hero slides, composes sections
│  ├─ layout.tsx           # root: fonts, metadata, JSON-LD
│  ├─ globals.css          # Tailwind v4 theme tokens + brand palette
│  ├─ icon.png             # favicon (client logo)
│  ├─ robots.ts / sitemap.ts
├─ components/
│  ├─ brand/canela-badge   # logo (next/image), full + circular-crop variants
│  ├─ home/                # hero, navbar, footer, nosotros, como-comprar
│  ├─ catalog/             # category-section, catalog-grid (filters), product-card, image-lightbox
│  ├─ cart/                # floating cart for direct-sale products
│  ├─ seo/json-ld          # Store structured data
│  └─ ui/                  # button and dialog (Base UI)
├─ content/catalog.ts      # canonical section metadata (copy, filter chips, nav links)
├─ modules/                # cart, catalog, checkout, payments, shipping, inventory, admin, notifications
├─ db/                     # PostgreSQL client, migrations and transactional operations
├─ store/                  # Redux store and browser persistence
├─ lib/                    # GROQ queries, config, types, product-status and utilities
└─ sanity/                 # client, env (projectId/dataset), schema
```

### Data model (Sanity)

The editorial product and hero documents are **drag-and-drop orderable** in the
Studio (`@sanity/orderable-document-list`):

- **`producto`** — `name`, `category` (`vidrio` / `ceramica` / `espejos`), `sub` (subcategory / filter chip), `price` (ARS), optional description/material/display measurements, and `images[]` (min 1 — the first is the card cover, the rest feed the lightbox carousel).
- **`heroSlide`** — `name`, `caption`, `category` (link target), `image`. Powers the rotating featured-piece carousel in the hero.
- **Product shipping profile** — protected-unit weight/dimensions, classification,
  rotation and stacking constraints; separate from display measurements.
- **`shippingBox`** — inner/outer dimensions, tare, weight limit and availability.
- **Private inventory documents** — quantities, reservations and audited operations.
  Managed from the product's **Stock** tab; editorial publishing cannot reset a
  quantity consumed by checkout. See [spec 100](docs/specs/100-inventario-sanity.md).

The Studio (`sanity.config.ts`) presents a **Hero** list, products grouped by
category, shipping boxes and the product stock view.
The product form separates **Datos del producto** and **Envío**, with uncommon
details and packing options collapsed. Display measurements are optional;
protected-unit measurements remain necessary for shipping. See
[spec 123](docs/specs/123-carga-simple-productos.md).
Availability is computed from Sanity stock minus reservations. Legacy `tone` and
`statusNote` are hidden and ignored. Offered products with zero available units
show **Agotado** and cannot be added; cart eligibility is refreshed on store and
checkout visits. See [spec 124](docs/specs/124-disponibilidad-por-stock.md).

Content is fetched in `src/lib/api.ts` via GROQ with a 60s revalidation window. Queries fail-soft: on a transient Sanity outage they return `[]` so the page still renders (empty sections show a friendly message) instead of erroring.

---

## Key features & engineering notes

- **Filterable catalog** — three sections (Glass, Ceramics, Mirrors & Framed Art), each with subcategory filter chips. Filtering is client-side and in-memory (no refetch), chosen over separate pages for a smoother browse UX.
- **Fullscreen image lightbox** — Base UI dialog with keyboard arrows, photo
  thumbnails and quantity controls; focus returns to the product when closed.
- **Persistent cart** — Redux Toolkit keeps the selection across navigation and
  reloads. RTK Query starts checkout without trusting client-side prices.
- **Checkout Pro** — the backend rereads Sanity, reserves stock atomically in
  Sanity and creates a ten-minute Mercado Pago order. PostgreSQL stores order
  snapshots and recovery intents. Signed Webhooks and an
  authoritative provider query confirm payment independently from the browser.
- **Made-to-order catalog** — pieces remain visible and may be kept in the cart,
  but are excluded from direct checkout until their separate flow is defined.
- **Data-driven hero** — the featured-piece carousel is content-managed (Sanity), with auto-advance, manual dots, and a decorative rotating ring.
- **Accessibility & motion** — respects `prefers-reduced-motion` (entrance/float/spin animations are gated); dialog and carousel are built on accessible Base UI primitives.
- **SEO** — per-route metadata, Open Graph, canonical URL, `robots.ts`, `sitemap.ts`, and `Store` JSON-LD structured data.

---

## Design system

The visual language derives from the client's hand-painted watercolor logo: a warm, earthy, pastel palette that reads as handmade but professional.

**Palette** (CSS custom properties in `globals.css`):

| Token | Value | Use |
| --- | --- | --- |
| `--canela-cream` | `#f6efe1` | page background |
| `--canela-cream-card` | `#fbf7ee` | cards / surfaces |
| `--canela-ochre` | `#8a621d` | primary accent / CTAs |
| `--canela-ochre-dark` | `#8a621d` | prices, hover |
| `--canela-brown` | `#4a3527` | headings |
| `--canela-green` | `#5e8c4e` | success accent |
| `--canela-footer` | `#3e2c20` | footer |

**Typography** — `Grand Hotel` (script display, for headings and the wordmark, echoing the logo) paired with `Mulish` (clean sans for body), loaded via `next/font`.

**Layout** — mobile-first, fluid type with `clamp()`, gallery-style grids with generous whitespace to let the pieces breathe.

---

## Getting started

```bash
pnpm install

pnpm dev            # site → http://localhost:3000
pnpm studio         # Sanity Studio → http://localhost:3333
pnpm build          # production build
pnpm start          # serve the build
pnpm lint
pnpm test           # unit tests; DB integration tests skip without TEST_DATABASE_URL
pnpm test:db        # PostgreSQL concurrency/integrity tests
pnpm test:mp        # Mercado Pago contract tests; creates expiring test orders
pnpm db:migrate     # apply migrations to DATABASE_URL_UNPOOLED (or DATABASE_URL)
pnpm notifications:process # bounded mail queue worker (loads .env.local)
pnpm commerce:preflight    # read-only configuration/migration checks
```

### Creador de cuadros — rama de desarrollo

Primera versión en `codex/creador-cuadros-personalizados`:
`/crear-cuadro` permite cargar/recortar una imagen local, ajustar tamaño y colores
y recorrer una compra separada simulada (resumen, domicilio, envío, pago y resultado);
`/cuadros` ofrece ejemplos reutilizables. El creador vacío no muestra precios ni medidas
y mantiene deshabilitado el tamaño hasta tener un diseño.
La paleta provisional tiene 32 colores. El creador público no exporta guías de fabricación.
Ver [spec PER-130](docs/specs/130-creador-cuadros-demo.md),
[ampliación PER-131](docs/specs/131-cuadros-paleta-cotizacion.md),
[compra simulada PER-132](docs/specs/132-cuadros-compra-simulada.md),
[editor de venecitas PER-133](docs/specs/133-editor-venecitas.md) y
[evidencia actual](docs/evidence/PER-133.md).

«Retocar venecitas» abre un editor para seleccionar y cambiar una pieza, con zoom
1–8×, arrastre, pellizco, deshacer/rehacer y restauración del color generado.
Paleta lateral en escritorio e inferior desplazable en móvil. Los retoques se
conservan al revisar/comprar y al reabrir el editor. Cambiar imagen, tamaño, encuadre
o reiniciar requiere confirmación si hay retoques. Flechas y Enter permiten editar
con teclado; Ctrl/Cmd+Z deshace y Shift+Z rehace. Sin nuevas dependencias.

```bash
SITE_MAINTENANCE_MODE=0 CUADROS_PREVIEW_ENABLED=1 pnpm dev --port 3000
pnpm exec vitest run src/modules/customization
```

Estas variables afectan solo ese proceso local. Las rutas están bloqueadas en
Vercel Production. La configuración y los ejemplos vienen del repositorio de
servidor `src/modules/customization/infrastructure/demo-catalog.ts`; medidas,
límites, paleta y precios son provisionales y se cambian allí, sin modificar el motor.
La estimación separa venecitas, mano de obra e insumos. El envío usa fixtures de
`demo-purchase-config.ts`: no son tarifas de Zipnova. Para probar, subí una imagen,
revisá y aceptá el diseño, continuá al domicilio y usá «Completar con datos ficticios».
Cotizá y elegí aprobado, pendiente o rechazado antes de «Simular pago».

`/api/cuadros/prueba` solo funciona con `NODE_ENV=development`, sin `VERCEL_ENV`
y con la función habilitada. Producción y despliegues preview rechazan las operaciones.
No se conecta con Mercado Pago, Zipnova, Sanity, emails ni el carrito de stock.
El backend valida el diseño y calcula los importes; las cotizaciones vencen a los
15 minutos. Guarda únicamente snapshots temporales en memoria (hasta 30 minutos,
100 cotizaciones, 10 intentos por cotización y 5 pedidos de prueba activos).
Reiniciar el servidor descarta todas las simulaciones; la limpieza es por solicitud.
Para una prueba de capacidad nueva se puede reiniciar el servidor local.

Las fotos se procesan en memoria del navegador y se pierden al salir/recargar.
Solo la grilla aceptada llega al backend; no hay subida de originales ni borradores
persistentes. La simulación no crea pedidos en el panel de Mariela. La venta real
requiere otra iteración con datos confirmados, persistencia durable y proveedores.
La publicación de diseños de compradores en Sanity pertenece a la etapa de venta.

### Environment

Copy `.env.example` → `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CHECKOUT_MODE=disabled
SITE_MAINTENANCE_MODE=1
CHECKOUT_SIGNING_SECRET=
```

Sanity identifiers are public. `NEXT_PUBLIC_SANITY_DATASET` selects the catalog,
`SANITY_STUDIO_DATASET` selects Studio, both default to `production`. Vercel
Production rejects an alternate catalog. Inventory credentials and its dataset
selector are private; use `inventory_test` and a separate local database for QA.

Orders and operational records use a private PostgreSQL database. The selected managed
provider is Neon through Vercel; use its pooled connection string as
`DATABASE_URL` and its direct connection string as `DATABASE_URL_UNPOOLED` for
migrations. Integration tests require a separate disposable database through
`TEST_DATABASE_URL` and must never target production.

The owner order panel lives at `/admin`. Its read-only screens can be reviewed
locally with `ADMIN_DEMO_MODE=1` at `/admin?demo=1`; demo records come from the
backend and are disabled in production. Real orders require database migrations,
an authorized email and a verified transactional sender. See
[`docs/runbooks/panel-pedidos.md`](docs/runbooks/panel-pedidos.md).

Mercado Pago test traffic uses `MP_TEST_ACCESS_TOKEN`. Signed Order Webhooks
add `MP_TEST_WEBHOOK_SECRET`, `MP_TEST_SELLER_USER_ID` and
`MP_TEST_APPLICATION_ID`; all four are server-only and must never use the
`NEXT_PUBLIC_` prefix. The production environment needs its own matching HTTPS webhook configuration.

`CHECKOUT_MODE=test` enables development payments only. `SHIPPING_PROVIDER` selects
the controlled test tariff or Zipnova quotations; Zipnova requires explicit account
mode, dispatch type and real packaged-product profiles. Production mode is implemented behind explicit gates and remains inactive. See the [Zipnova runbook](docs/runbooks/zipnova.md) for configuration,
the required database migrations and remaining launch conditions, and the
[quotation evidence](docs/evidence/ZIP-01.md) and
[shipment/label evidence](docs/evidence/ZIP-02.md) for verified behavior.

Shipping estimates include a small box-level margin (5% of weight, capped at 200 g,
and 1 cm per exterior dimension). Buyers see the resulting shipping price, including
any tariff-band increase. There is no automatic fallback to unpadded measurements.
Measured preparation drives the final label.
See [spec 125](docs/specs/125-margen-embalaje.md) and [evidence](docs/evidence/MAR-125.md).
`ZIPNOVA_FULFILLMENT_MODE=sandbox` explicitly enables shipment creation only for
the sandbox account with carrier dropoff. It defaults to disabled.

Order emails use React Email and Resend with a durable PostgreSQL outbox. Test
mode redirects both messages to one authorized test address. Dispatch requires
explicit confirmation after the package is handed to the carrier. See the
[dispatch/mail/launch runbook](docs/runbooks/despacho-avisos-apertura.md),
[spec 080](docs/specs/080-despacho-avisos-apertura.md) and
[OPS evidence](docs/evidence/OPS-01.md). Recovery follows
[spec 121](docs/specs/121-recuperacion-manual-sin-cron.md): immediate attempts after
payment/dispatch events, an authenticated retry in the order panel, and technical
recovery on demand through GitHub Actions (`workflow_dispatch`) or the protected
endpoint. Operators must check orders and notices; there is no background schedule
or independent email-failure alarm. Preflight checks actual pending work, not the
age of the last worker run. See [manual recovery evidence](docs/evidence/MAN-121.md).

### Content

Products, protected-unit measurements, shipping boxes and hero slides are managed
in [Sanity Studio](https://canela-artesanal.sanity.studio/) (`pnpm studio`).
Physical stock is managed in the same Studio, under **Producto → Stock**, with
reservations, optimistic concurrency and an audit trail. `/admin/inventario`
redirects to Studio. Orders share one suitable box; packaging
changes are quoted and approved by the operator before label creation.
See the [client guide](docs/runbooks/carga-cliente.md) and [spec 090](docs/specs/090-apertura-caja-compartida.md). Images are uploaded there by the shop owner and served through Sanity's image CDN via `next/image`.

---

## Deployment

- **Site** — Vercel (Next.js server rendering + on-demand revalidation).
- **CI** — GitHub Actions: lint, TypeScript, unit/HTTP/UI tests, isolated SQL tests
  and production build. External contracts are opt-in and use test accounts only.
- **Studio** — `pnpm studio:deploy` hosts it at `*.sanity.studio`, or it can be embedded in the app.

---

## License

Private client project. Not licensed for reuse.
