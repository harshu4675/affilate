# Talishh

Affiliate product discovery platform built on the Affilate extraction engine.

The app has three clearly separated surfaces:

| Surface | Route | Who | Purpose |
| --- | --- | --- | --- |
| **Talishh storefront** | `#/` | Public visitors | Browse the catalog, open a product, buy via the affiliate/store link |
| **Admin panel** | `#/admin` | Admin only (session protected) | Dashboard, product management, publish to the storefront |
| **Importer workspace** | `#/import`, `#/library`, `#/products/*` | Admin | The original extraction/import/editor flow, unchanged |

Import workflow (unchanged):

**Paste link → Extract → Preview → Edit → Validate → Save → Publish**

## Storefront (Talishh)

- Products are visible immediately on the homepage - no login, no extra navigation
- Responsive product grid: **2 columns on phones**, 3 at 640 px, 4 at 900 px, 5 at 1200 px+
- Product cards show image, title, brand, price, MRP, discount and store badge; missing fields are hidden rather than faked
- Instant debounced search, store/category/price filters and sorting (latest, price asc/desc, discount, A-Z)
- Product detail page with gallery, highlights, description and specifications
- Purchase flow: **Opening product... → Thanks for shopping with Talishh ❤️ → redirect to the store**
- Missing or invalid store links never redirect: the user gets a clear error and a way back
- Skeleton loaders, empty states, error states, image fallbacks and lazy loading throughout

## Admin panel

- Session-based login (HttpOnly, SameSite cookie, HMAC-signed token, rate-limited)
- Dashboard with catalog statistics (total, visible, hidden, missing link/price/image, stores, average price)
- Product management: search, filter by store/visibility, sort, edit, hide/show, delete, bulk actions
- Edit drawer with live preview; imported source data is shown read-only
- Publish products from the import library to the storefront catalog (selected or all)
- Responsive: table on desktop, cards on mobile
- Toast notifications and confirmation dialogs for destructive actions

## Extraction features

- URL-based product extraction with server-side fetching (no browser scraping or browser CORS failures), including Amazon `/dp/ASIN`, `/gp/product/ASIN`, `amzn.in`, `amzn.to`, `a.co` and tracked links
- Platform detection and provider/adaptor architecture: Amazon, eBay, Walmart, Etsy, AliExpress, Shopify stores (via their public product JSON), plus a generic structured-data adapter (JSON-LD, Open Graph, meta tags)
- Only real data: every field comes from the source or from your manual entry. No fabricated ratings, reviews, prices, discounts, stock or sellers
- Editable product draft: title, description, brand, category, pricing, images (remove / reorder / primary / restore / add by URL or upload), variants, specifications, features
- Live product preview that always reflects your edited data
- Product library with search, filters (platform, category, status, price range), sorting, bulk select / delete / status / category / export (CSV and JSON)
- Product statuses: Draft, Ready, Published, Archived
- Duplicate detection before saving (open existing / update existing / save as separate)
- Refresh/re-extract with a safe dialog when manual edits exist (refresh everything / selected fields / cancel)
- Draft autosave, unsaved-changes warnings and recoverable drafts
- Source integrity: clean source URL, original/affiliate URL, platform, extraction and refresh dates are preserved; manually edited fields are tracked separately
- Atomic versioned browser persistence: draft-to-library saves write once, migrate legacy data, survive reloads and report quota failures instead of corrupting JSON
- Development extraction diagnostics: normalized/final URLs, redirects, HTTP status, attempted/successful methods, timing and field coverage
- Extraction history and recently imported products
- PWA: installable, offline app shell, manifest, service worker, icons (API and product data are never cached)
- Fully responsive: 320 px phones through 1920 px desktops
- Toast notifications, loading overlays, error states with clear next actions, keyboard shortcuts (Ctrl/Cmd+S save, Ctrl/Cmd+Shift+D duplicate, `/` focus search)

## Tech stack

- React 19 + JSX + Vite 6
- External CSS design system (no Tailwind, no UI library)
- Express + Cheerio extraction service
- JSON-file storefront catalog (atomic writes, swappable for a real database)
- React Router (hash-based routing for portable deployment)
- Versioned, atomic localStorage persistence store (repository pattern, swappable for a real database)
- No TypeScript, no animations frameworks, no heavy dependencies

## Quick start

```bash
npm install
npm run dev
```

Client and server are separate packages and can be run independently:

```bash
cd client
npm run dev
```

```bash
cd server
npm run dev
```

- Storefront: http://localhost:5173
- Admin panel: http://localhost:5173/#/admin
- Importer workspace: http://localhost:5173/#/import
- API: http://localhost:8787 (proxied from the Vite app as `/api`)

Default development admin credentials are `admin` / `talishh-admin`. **Set `ADMIN_USERNAME` and
`ADMIN_PASSWORD` before deploying** - the server logs a warning while the default is in use, and the
admin panel shows a banner.

In development the extraction service allows local/private URLs and a higher rate limit so it can be tested against local mock stores.

## Production

```bash
npm run build   # production frontend into client/dist/
npm start       # Express serves client/dist/ + extraction API on :8787
```

Or one shot:

```bash
npm run serve
```

Production hardening is enabled automatically: private/internal IPs are blocked (SSRF protection), only ports 80/443 are allowed, rate limiting (30 req/min by default, override with `AFFILATE_RATE_MAX`), request timeouts and response size caps. `PORT` overrides the server port.

`npm run preview` serves the built frontend for a quick static check (without the API).

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Vite client + extraction API (concurrently) |
| `npm run dev:client` / `npm run dev:web` | Client only (`cd client && npm run dev`) |
| `npm run dev:server` / `npm run dev:api` | API only (`cd server && npm run dev`) |
| `npm test` | Extraction pipeline test suite (adapter fixtures + API behavior) |
| `npm run test:ui` | Storefront + admin UI test suite (real app in jsdom against a live API) |
| `npm run test:all` | Both suites |
| `npm run build` | Production frontend build (`client/dist`) |
| `npm start` | Production server (frontend + API) |
| `npm run serve` | Build then start |

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE` | `/api` | Client-only API base path (Vite). Never use `VITE_*` for secrets |
| `PORT` | `8787` | Production server port |
| `AFFILATE_RATE_MAX` | `30` (dev: `120`) | Extraction requests per minute per IP |
| `AFFILATE_DEV` | unset | Set to `1` by `npm run dev` to allow local URLs and higher limits |
| `AFFILATE_DEBUG` | unset | Set to `1` to retain the latest 100 extraction diagnostics outside development |
| `AFFILATE_ALLOWED_ORIGINS` | unset | Comma-separated origins allowed to call the API cross-origin; same-origin needs no setting |
| `ADMIN_USERNAME` | `admin` | Admin panel username |
| `ADMIN_PASSWORD` | `talishh-admin` (dev default) | Admin panel password. **Always set this in production** |
| `AFFILATE_SESSION_SECRET` | random per boot | HMAC secret for admin sessions. Set it to keep sessions valid across restarts |
| `AFFILATE_DATA_DIR` | `server/data` | Directory holding the storefront catalog file |
| `AFFILATE_LOGIN_RATE_MAX` | `10` | Admin login attempts per minute per IP |
| `AFFILATE_PUBLISH_LIMIT` | `8mb` | Max body size for the publish endpoint |

In development, diagnostics are available at `GET /api/debug/extractions`. The endpoint is disabled in production unless `AFFILATE_DEBUG=1`. Extraction and health responses use `Cache-Control: no-store`.

`VITE_API_BASE` lives in `.env.development` and `.env.production` so local and production configuration stay separate. No API keys are used anywhere.

## Architecture

```
client/
  src/
    components/      reusable UI, layout, extractor, product editor, library
      store/         Talishh storefront: logo, product card, image, redirect overlay, shell
      admin/         admin shell (sidebar) and product edit drawer
    pages/           Dashboard, Library, Editor, NotFound
      store/         storefront home + product detail
      admin/         admin login, dashboard, products, import & publish
    state/           AppProvider (products, history, draft) + product factory
    services/        api, storage, export, image helpers
    hooks/           debounce, autosave, api health, keyboard shortcuts, extraction
    extraction/      URL validation, platform detection, error catalog
    validation/      product validation
    constants/       platforms, statuses, currencies
    utils/           ids, formatting, URL handling, product merge (refresh)
    styles/          design tokens + component styles (external CSS)
  public/            PWA manifest, service worker, icons
  index.html
  vite.config.js     Vite dev server + /api proxy to the backend
  package.json
server/
  index.js         Express API (health, extract, catalog, static hosting in prod)
  auth.js          admin session tokens, cookies and route guard
  catalog/
    model.js       library product -> storefront catalog projection, purchase URL resolution
    store.js       atomic JSON catalog persistence
    routes.js      public catalog + protected admin endpoints
  data/            storefront catalog file (gitignored JSON)
  security.js      SSRF / URL safety checks
  rateLimit.js     in-memory sliding window limiter
  extraction/
    url.js         normalization + tracking-param stripping
    detect.js      platform detection
    fetch.js       fetch with timeout, size cap, error mapping
    parser.js      tolerant JSON-LD / metadata helpers and locale-aware price parsing
    layers.js      JSON-LD, OpenGraph, product schema, platform, embedded-data and HTML layers
    normalize.js   raw -> normalized product model, image cleanup and coverage analysis
    adapters/      base + amazon, ebay, walmart, etsy, aliexpress, shopify, generic
    pipeline.js    validation -> safe redirects -> layered extraction -> normalization -> diagnostics
  package.json
test/
  fixtures/        mock store HTML for every adapter
  mock-server.mjs  static server + Shopify product JSON endpoint
  run.mjs          extraction test suite (npm test)
  ui/              storefront + admin UI suite in jsdom (npm run test:ui)
```

### Storefront data flow

The extraction pipeline is the single source of truth. The storefront is a read-only projection of it:

```
Admin: paste link -> [UNCHANGED extraction pipeline] -> draft -> edit -> save to library (localStorage)
                                                                              |
                                                       Admin -> "Publish" ----+
                                                                              v
                                              POST /api/admin/publish  (session protected)
                                                                              |
                                              projection: pick + sanitize storefront fields
                                                                              v
                                                     server/data/catalog.json (atomic write)
                                                                              |
                                    Visitor: GET /api/products, /api/products/:id, /:id/go
                                                                              v
                                                     Talishh storefront (public, no login)
```

Publishing **never re-extracts**: it copies already-extracted records and adds storefront-only state
(visibility, publish timestamp, admin overrides). Admin edits made in the panel are tracked in
`adminEditedFields` and are preserved when the same product is published again.

Purchase URL priority: `affiliateUrl` -> `source.originalUrl` -> `source.url` -> `source.finalUrl`.
Only `http(s)` URLs are accepted; anything else is dropped and the product is marked as having no
buyable link instead of redirecting somewhere unsafe.

### Extraction pipeline

```
URL input
  -> normalize (add protocol, strip tracking parameters, canonicalize Amazon ASIN links)
  -> validate (http/https, host, length, no credentials)
  -> SSRF check on the target and every redirect
  -> initial platform detection
  -> fetch page server-side (controlled redirects, timeout, size cap, status mapping)
  -> detect platform again after shortened-link redirects
  -> layered extraction (JSON-LD, OpenGraph, product schema, platform selectors, embedded data, HTML fallback)
  -> merge only source-backed fields into the canonical product model
  -> coverage and product-evidence analysis
  -> editable, atomically persisted draft
```

New platforms are added by writing an adapter that implements `match(host, url)` and `extract({ html, url, platform, fetchJson })` and registering it in `server/extraction/adapters/index.js`. The normalized model stays the same regardless of the source.

## Data model

Each product stores: id, title, short/long description, brand, category, subcategory, SKU, source product ID, currency, price, original price, derived discount, availability, condition, seller, images (ordered, primary flag, source flag), variants, specifications, features, tags, source metadata (URL, platform, domain, extraction/refresh timestamps), status, edited-fields list, and created/updated timestamps.

`editedFields` distinguishes data that came from the source from values the user changed manually. Refreshing never silently overwrites manual edits.

## PWA

- Manifest: `public/manifest.webmanifest` (name, theme color, icons 192/512/maskable, standalone display)
- Service worker: `public/sw.js` — precaches the app shell, network-first navigation with offline fallback; API calls and product data are never cached
- Registered automatically in production builds only (no dev interference)
- Apple touch icon and iOS meta tags included

## Security notes

- URLs are validated and normalized before any network request
- SSRF protection: private IPv4/IPv6 ranges, localhost, metadata endpoints and non-standard ports are rejected in production
- Credentials in URLs are rejected; `javascript:` and other schemes are blocked
- No secrets or API keys are bundled; environment configuration is separated per environment
- Admin credentials live only in server environment variables and are never sent to or stored in the frontend
- Admin sessions use HttpOnly, SameSite=Lax cookies with an HMAC-signed, expiring token (Secure over HTTPS)
- Every admin endpoint is guarded server-side; hiding admin UI is never the only protection
- Admin logins are rate limited and credentials are compared in constant time
- Product URLs stored in the catalog are re-validated before they are served to visitors

## Notes on extraction reality

Different stores have very different protections. Some stores (for example Amazon) may block automated fetches depending on the network, and some pages hide structured data entirely. The app never invents values: when a field cannot be read it stays empty, the extraction is marked partial, and you are told which fields are missing. You can fill them in manually, retry, open the source page, or add the product manually.
