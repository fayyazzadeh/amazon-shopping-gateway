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
- `GET /api/product?url=...` — attempt a product lookup through configured provider credentials
- `GET /api/diagnostics/next` — report Next connector configuration; `?live=1` attempts a live lookup

## Planned first release

- Next.js + TypeScript application and independent Route Handlers
- English LTR storefront
- Product link validation and variant selection
- Manual purchase request submission
- Admin review of product availability, shipping, fees, and final price
- Customer acceptance before any payment or purchase workflow

## API credentials and marketplace caveats

URL recognition does not mean a marketplace API is configured or authorized. Verify provider availability, account eligibility, marketplace-specific credentials/partner tags, current API terms, and actual responses before relying on live product data.

Current Worker environment variables include:

- Shared Amazon Creators API credentials: `CREATORS_API_CLIENT_ID`, `CREATORS_API_CLIENT_SECRET`
- Partner tags: `AMAZON_PARTNER_TAG_US`, `AMAZON_PARTNER_TAG_UK`, `AMAZON_PARTNER_TAG_AE`
- Optional token endpoint overrides: `AMAZON_TOKEN_ENDPOINT_US`, `AMAZON_TOKEN_ENDPOINT_UK`, `AMAZON_TOKEN_ENDPOINT_AE`
- Next provider: `RAPIDAPI_KEY`, `RAPIDAPI_NEXT_HOST`, `RAPIDAPI_NEXT_ENDPOINT`

Do not commit secrets to the repository. Endpoint defaults are configuration assumptions, not proof of API access; confirm them against current official documentation and a live authorized request.

## Development

The existing repository uses Vite and a Cloudflare Worker. The Next.js migration should be performed on a dedicated branch and should preserve useful product-normalization behavior and regression tests. The first release uses manual price confirmation; automated checkout is out of scope.
