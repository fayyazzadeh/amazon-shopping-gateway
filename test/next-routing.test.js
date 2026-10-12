import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

test("routes a next.co.uk product URL to direct storefront fetch", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  const html = "<!doctype html><html><head><meta property=\"og:title\" content=\"Direct Store Product\"><meta property=\"og:image\" content=\"https://images.example.test/item.jpg\"><meta property=\"product:price:amount\" content=\"25.50\"><meta property=\"product:price:currency\" content=\"GBP\"></head><body></body></html>";
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
  };
  try {
    const env = { GBP_TO_IRR: "500000", CUSTOMER_MARGIN_PERCENT: "0", FIXED_FEE_IRR: "0" };
    const productUrl = "https://www.next.co.uk/style/su624250/f30877#f30877";
    const response = await worker.fetch(
      new Request("https://example.workers.dev/api/product?url=" + encodeURIComponent(productUrl)),
      env
    );
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.marketplace, "Next UK");
    assert.equal(body.title, "Direct Store Product");
    assert.equal(body.price.amount, 25.5);
    assert.equal(body.price.currency, "GBP");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://www.next.co.uk/style/su624250/f30877#f30877");
    assert.equal(calls[0].options.method, "GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
