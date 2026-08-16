# Affilate

Affiliate product importer and product extraction app. Paste a product URL, extract the real product data from the store, review and edit every field, then save it to your product library.

The workflow is intentionally simple:

**Paste link → Extract → Preview → Edit → Validate → Save**

## Features

- URL-based product extraction with server-side fetching (no browser scraping, no CORS failures)
- Platform detection and provider/adaptor architecture: Amazon, eBay, Walmart, Etsy, AliExpress, Shopify stores (via their public product JSON), plus a generic structured-data adapter (JSON-LD, Open Graph, meta tags)
- Only real data: every field comes from the source or from your manual entry. No fabricated ratings, reviews, prices, discounts, stock or sellers
- Editable product draft: title, description, brand, category, pricing, images (remove / reorder / primary / restore / add by URL or upload), variants, specifications, features
- Live product preview that always reflects your edited data
- Product library with search, filters (platform, category, status, price range), sorting, bulk select / delete / status / category / export (CSV and JSON)
- Product statuses: Draft, Ready, Published, Archived
- Duplicate detection before saving (open existing / update existing / save as separate)
- Refresh/re-extract with a safe dialog when manual edits exist (refresh everything / selected fields / cancel)
- Draft autosave, unsaved-changes warnings and recoverable drafts
- Source integrity: original URL, platform, extraction and refresh dates are preserved; manually edited fields are tracked separately
- Extraction history and recently imported products
- PWA: installable, offline app shell, manifest, service worker, icons (API and product data are never cached)
- Fully responsive: 320 px phones through 1920 px desktops
- Toast notifications, loading overlays, error states with clear next actions, keyboard shortcuts (Ctrl/Cmd+S save, Ctrl/Cmd+Shift+D duplicate, `/` focus search)

## Tech stack

- React 19 + JSX + Vite 6
- External CSS design system (no Tailwind, no UI library)
- Express + Cheerio extraction service
- React Router (hash-based routing for portable deployment)
- localStorage persistence layer (repository pattern, swappable for a real database)
- No TypeScript, no animations frameworks, no heavy dependencies

## Quick start

```bash
npm install
npm run dev
```

- Web app: http://localhost:5173
- Extraction API: http://localhost:8787 (proxied to the app as `/api`)

In development the extraction service allows local/private URLs and a higher rate limit so it can be tested against local mock stores.

## Production

```bash
npm run build   # production frontend into dist/
npm start       # Express serves dist/ + extraction API on :8787
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
| `npm run dev` | Vite dev server + extraction API (concurrently) |
| `npm run dev:web` | Vite only |
| `npm run dev:api` | Extraction API only |
| `npm test` | Extraction pipeline test suite (adapter fixtures + API behavior) |
| `npm run build` | Production frontend build |
| `npm start` | Production server (frontend + API) |
| `npm run serve` | Build then start |

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE` | `/api` | API base path used by the frontend |
| `PORT` | `8787` | Production server port |
| `AFFILATE_RATE_MAX` | `30` (dev: `120`) | Extraction requests per minute per IP |
| `AFFILATE_DEV` | unset | Set to `1` by `npm run dev` to allow local URLs and higher limits |

`VITE_API_BASE` lives in `.env.development` and `.env.production` so local and production configuration stay separate. No API keys are used anywhere.

## Architecture

```
src/
  components/      reusable UI, layout, extractor, product editor, library
  pages/           Dashboard, Library, Editor, NotFound
  state/           AppProvider (products, history, draft) + product factory
  services/        api, storage, export, image helpers
  hooks/           debounce, autosave, api health, keyboard shortcuts, extraction
  extraction/      URL validation, platform detection, error catalog
  validation/      product validation
  constants/       platforms, statuses, currencies
  utils/           ids, formatting, URL handling, product merge (refresh)
  styles/          design tokens + component styles (external CSS)
server/
  index.js         Express API (health, extract, static hosting in prod)
  security.js      SSRF / URL safety checks
  rateLimit.js     in-memory sliding window limiter
  extraction/
    url.js         normalization + tracking-param stripping
    detect.js      platform detection
    fetch.js       fetch with timeout, size cap, error mapping
    parser.js      JSON-LD / Open Graph / meta helpers, price parsing
    normalize.js   raw -> normalized product model, coverage analysis
    adapters/      base + amazon, ebay, walmart, etsy, aliexpress, shopify, generic
    pipeline.js    validation -> fetch -> adapter -> normalize -> result
test/
  fixtures/        mock store HTML for every adapter
  mock-server.mjs  static server + Shopify product JSON endpoint
  run.mjs          extraction test suite (npm test)
```

### Extraction pipeline

```
URL input
  -> normalize (add protocol, strip tracking params)
  -> validate (http/https, host, length, no credentials)
  -> SSRF check (block private/internal addresses and odd ports)
  -> platform detection
  -> fetch page server-side (timeout, size cap, rate limits)
  -> platform adapter (or generic structured-data parser)
  -> normalize into the canonical product model
  -> coverage analysis (partial extraction detection)
  -> editable draft
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

## Development-only sample data

The production app contains no demo data. In development only, a sample-data helper is exposed on the browser console:

```js
window.__seedDemoProducts()
```

It adds a few clearly-labeled sample products so you can try search, filters and bulk actions. It is never part of the production bundle behavior.

## Security notes

- URLs are validated and normalized before any network request
- SSRF protection: private IPv4/IPv6 ranges, localhost, metadata endpoints and non-standard ports are rejected in production
- Credentials in URLs are rejected; `javascript:` and other schemes are blocked
- No secrets or API keys are bundled; environment configuration is separated per environment

## Notes on extraction reality

Different stores have very different protections. Some stores (for example Amazon) may block automated fetches depending on the network, and some pages hide structured data entirely. The app never invents values: when a field cannot be read it stays empty, the extraction is marked partial, and you are told which fields are missing. You can fill them in manually, retry, open the source page, or add the product manually.
