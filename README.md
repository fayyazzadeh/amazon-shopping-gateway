# Amazon Shopping Gateway

A standalone shopping gateway project for Amazon product links.

## Status

🚧 Experimental / test project.

Initial target:
- Standalone repository
- GitHub Pages compatible frontend
- Custom test subdomain: `amazon-test.fayyazzadeh.ir`
- No dependency on the main `fayyazzadeh.ir` application

## Planned architecture

```
Browser
  |
  +-- Static frontend
  |      |
  |      +-- Product URL input
  |      +-- Product preview
  |      +-- Price estimation
  |      +-- Purchase request
  |
  +-- Future API
         +-- Amazon/product data
         +-- Pricing
         +-- Orders
         +-- Notifications (Telegram / Bale)
```

The frontend will be deployable independently. Backend/API integration can be added later without coupling the project to the main website.

## Development

The project is intentionally initialized as a separate repository so it can be tested, deployed, replaced, or disabled independently of `fayyazzadeh.ir`.
