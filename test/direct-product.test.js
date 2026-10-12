import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDirectProductHtml } from "../src/direct-product.js";

test("parses a direct Amazon UAE JSON-LD product without third-party API data", () => {
  const html = `<!doctype html><html><head>
    <meta property="og:title" content="Fallback title">
    <script type="application/ld+json">{
      "@context":"https://schema.org",
      "@type":"Product",
      "name":"Linen Shirt",
      "sku":"B0GCZJ74XZ",
      "brand":{"@type":"Brand","name":"Example Brand"},
      "image":["https://images.example.test/shirt.jpg"],
      "offers":{"@type":"Offer","price":"128.00","priceCurrency":"AED","availability":"https://schema.org/InStock"},
      "aggregateRating":{"@type":"AggregateRating","ratingValue":"4.4","reviewCount":"81"},
      "hasVariant":[
        {"@type":"Product","name":"Linen Shirt Black M","sku":"B0GCZJ74X1","color":"Black","size":"M","offers":{"price":"128.00","priceCurrency":"AED"}}
      ]
    }</script>
  </head><body></body></html>`;
  const resolved = {
    asin: "B0GCZJ74XZ",
    host: "www.amazon.ae",
    sourceUrl: "https://www.amazon.ae/dp/B0GCZJ74XZ",
    resolvedUrl: "https://www.amazon.ae/dp/B0GCZJ74XZ"
  };

  const result = normalizeDirectProductHtml(html, resolved, resolved.resolvedUrl);
  assert.equal(result.ok, true);
  assert.equal(result.dataSource, "direct-storefront-page");
  assert.equal(result.marketplace, "Amazon UAE");
  assert.equal(result.title, "Linen Shirt");
  assert.equal(result.price.amount, 128);
  assert.equal(result.price.currency, "AED");
  assert.equal(result.brand, "Example Brand");
  assert.equal(result.rating, 4.4);
  assert.equal(result.reviewCount, 81);
  assert.equal(result.variations.length, 1);
  assert.deepEqual(result.variations[0].attributes, { Color: "Black", Size: "M" });
});

test("parses basic Next UK metadata when structured product JSON-LD is absent", () => {
  const html = `<html><head>
    <meta property="og:title" content="Cotton Dress">
    <meta property="og:image" content="https://images.example.test/dress.jpg">
    <meta property="product:price:amount" content="39.99">
    <meta property="product:price:currency" content="GBP">
  </head></html>`;
  const url = "https://www.next.co.uk/style/su123456/ab1234";
  const result = normalizeDirectProductHtml(html, { sourceUrl: url, resolvedUrl: url, host: "www.next.co.uk", asin: null }, url);
  assert.equal(result.ok, true);
  assert.equal(result.marketplace, "Next UK");
  assert.equal(result.title, "Cotton Dress");
  assert.equal(result.price.amount, 39.99);
  assert.equal(result.price.currency, "GBP");
});

test("rejects HTML that contains no reliable product metadata", () => {
  const url = "https://www.amazon.com/dp/B09G9FPHY6";
  assert.throws(
    () => normalizeDirectProductHtml("<html><head></head><body>Not a product</body></html>", {
      asin: "B09G9FPHY6", sourceUrl: url, resolvedUrl: url, host: "www.amazon.com"
    }, url),
    /DIRECT_PRODUCT_DATA_EMPTY/
  );
});
