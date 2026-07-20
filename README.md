# Canela — Artisan Catalog

A catalog website for **Canela**, a studio that makes handcrafted glass, ceramics, and mirrors & framed art. The site showcases the pieces and drives conversions to **WhatsApp**, where the sale is closed and payment is coordinated manually (a Mercado Pago link/QR is sent in-chat — there is no integrated checkout).

The scope is deliberate: for one-of-a-kind and made-to-order artisan pieces, a conversational, human-in-the-loop flow fits the product far better than a self-serve cart with instant payment (which would risk overselling unique items). The site is optimized to get an interested visitor into a WhatsApp conversation with as little friction as possible.

> **Flow:** browse → filter → inspect in a fullscreen lightbox → add pieces to an *inquiry list* → send the whole list to WhatsApp as a pre-filled message.

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
| Animation | **motion** (Framer Motion successor) |
| Carousel | **embla-carousel-react** |
| Icons | **lucide-react** |
| Package manager | **pnpm** (Node ≥ 22) |

The stack intentionally mirrors a sibling project (`Guild`) so both share the same conventions, component patterns, and CMS setup.

---

## Architecture

Single-page marketing site rendered as **static content** (SSG) with server-side data fetching from Sanity. All product/hero content is fetched in React Server Components; only the interactive islands (filters, lightbox, inquiry cart, hero carousel) are client components.

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
│  ├─ consulta/            # inquiry-cart provider + floating actions (cart panel + WhatsApp)
│  ├─ seo/json-ld          # Store structured data
│  └─ ui/                  # button, dialog, carousel (Base UI + embla)
├─ content/catalog.ts      # canonical section metadata (copy, filter chips, nav links)
├─ lib/                    # api (GROQ queries), config, types, product-status, utils
└─ sanity/                 # client, env (projectId/dataset), schema
```

### Data model (Sanity)

Two document types, both **drag-and-drop orderable** in the Studio (`@sanity/orderable-document-list`):

- **`producto`** — `name`, `category` (`vidrio` / `ceramica` / `espejos`), `sub` (subcategory / filter chip), `price` (ARS), `tone` (status: unique / in-stock / made-to-order), optional `statusNote`, and `images[]` (min 1 — the first is the card cover, the rest feed the lightbox carousel).
- **`heroSlide`** — `name`, `caption`, `category` (link target), `image`. Powers the rotating featured-piece carousel in the hero.

The Studio (`sanity.config.ts`) presents a custom desk structure: a **Hero** list plus one orderable list **per category**, so the shop owner manages everything visually without touching code.

Content is fetched in `src/lib/api.ts` via GROQ with a 60s revalidation window. Queries fail-soft: on a transient Sanity outage they return `[]` so the page still renders (empty sections show a friendly message) instead of erroring.

---

## Key features & engineering notes

- **Filterable catalog** — three sections (Glass, Ceramics, Mirrors & Framed Art), each with subcategory filter chips. Filtering is client-side and in-memory (no refetch), chosen over separate pages for a smoother browse UX.
- **Fullscreen image lightbox** — clicking a piece opens it centered with an embla carousel when it has multiple photos. Notable fix: embla mis-measures when mounted inside a dialog (it initializes at zero size), so the component calls `api.reInit()` once the dialog is open.
- **Inquiry cart → WhatsApp** — instead of a checkout, visitors accumulate pieces in a lightweight "inquiry list" (React context), then send the full list as a single pre-filled WhatsApp message via a `wa.me` deep link (`whatsappLink()` in `lib/config.ts`). A direct per-product WhatsApp button covers single-item inquiries.
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
| `--canela-ochre` | `#b8842a` | primary accent / CTAs |
| `--canela-ochre-dark` | `#8a621d` | prices, hover |
| `--canela-brown` | `#4a3527` | headings |
| `--canela-green` | `#5e8c4e` | WhatsApp accent |
| `--canela-footer` | `#3e2c20` | footer |

**Typography** — `Grand Hotel` (script display, for headings and the wordmark, echoing the logo) paired with `Mulish` (clean sans for body), loaded via `next/font`.

**Layout** — mobile-first, fluid type with `clamp()`, gallery-style grids with generous whitespace to let the pieces breathe. Persistent, recognizable WhatsApp CTA.

---

## Getting started

```bash
pnpm install

pnpm dev            # site → http://localhost:3000
pnpm studio         # Sanity Studio → http://localhost:3333
pnpm build          # production build (SSG)
pnpm start          # serve the build
pnpm lint
```

### Environment

Copy `.env.example` → `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_WHATSAPP_NUMBER=549XXXXXXXXXX   # international format, no "+"
```

Sanity `projectId` / `dataset` are **public** (public-read dataset) and live as constants in `src/sanity/env.ts` — not env vars — because the Studio bundle only inlines `SANITY_STUDIO_*` variables.

### Content

Products and hero slides are managed in the Sanity Studio (`pnpm studio`). Images are uploaded there by the shop owner and served through Sanity's image CDN via `next/image`.

---

## Deployment

- **Site** — Vercel (Next.js SSG + on-demand revalidation).
- **Studio** — `pnpm studio:deploy` hosts it at `*.sanity.studio`, or it can be embedded in the app.

---

## License

Private client project. Not licensed for reuse.
