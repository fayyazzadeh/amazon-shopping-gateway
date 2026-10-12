# Amazon Shopping Gateway

A standalone shopping gateway for customer-submitted product links and manually confirmed purchase requests.

## Status

Experimental. Marketplace URL resolution is implemented in the current Worker; live product-data access, commercial API permissions, and order workflows must be verified separately.

## Supported storefronts

- Amazon US: `amazon.com`
- Amazon UK: `amazon.co.uk`
- Amazon UAE: `amazon.ae`
- Next UK: `next.co.uk`

Amazon marketplaces share the product-normalization and API integration layer, with per-marketplace configuration. Next uses its own connector and product identifiers.

## Current API routes

- `GET /api/health` — service health check
- `GET /api/resolve-product?url=...` — validate supported Amazon URLs and extract ASINs
- `GET /api/product?url=...` — fetch the public product page directly from Amazon or Next and parse available metadata
- `GET /api/diagnostics/next` — check direct Next UK page access; `?live=1` attempts a live lookup
- `GET /api/diagnostics/next` — report Next connector configuration; `?live=1` attempts a live lookup

## Planned first release

- Next.js + TypeScript application and independent Route Handlers
- English LTR storefront
- Product link validation and variant selection
- Manual purchase request submission
- Admin review of product availability, shipping, fees, and final price
- Customer acceptance before any payment or purchase workflow

## API credentials and marketplace caveats

The direct adapter requests public storefront HTML from the Worker and parses available JSON-LD and metadata. Stores may block or rate-limit automated requests, change their page structure, or omit variation data. The gateway deliberately does not bypass CAPTCHA, bot checks, access controls, or store restrictions. When direct access is blocked, the response reports the failure instead of silently falling back to a third-party provider. Confirm the stores' applicable terms and access rules before commercial use.

Current Worker environment variables include:

- No third-party product-data API key is required for direct storefront fetches.
- Currency conversion and customer-price configuration may use `GBP_TO_IRR`, `USD_TO_IRR`, `CUSTOMER_MARGIN_PERCENT`, and `FIXED_FEE_IRR`.

Do not commit secrets to the repository. Endpoint defaults are configuration assumptions, not proof of API access; confirm them against current official documentation and a live authorized request.

## Development

The existing repository uses Vite and a Cloudflare Worker. The Next.js migration should be performed on a dedicated branch and should preserve useful product-normalization behavior and regression tests. The first release uses manual price confirmation; automated checkout is out of scope.
