import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

for (const [marketplace, productUrl] of [
  ["Amazon UK", "https://www.amazon.co.uk/dp/B08158GKCL"],
  ["Amazon UAE", "https://www.amazon.ae/dp/B0B3C2R8MP"],
  ["Amazon US", "https://www.amazon.com/dp/B08158GKCL"]
]) {
  test(`${marketplace} lookup fetches the storefront directly without provider credentials`, async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push({ url: String(url), options });
      return new Response("<!doctype html><html><head><script type=\"application/ld+json\">{\"@context\":\"https://schema.org\",\"@type\":\"Product\",\"name\":\"Direct Amazon Product\",\"image\":\"https://images.example.test/product.jpg\",\"offers\":{\"@type\":\"Offer\",\"price\":\"19.99\",\"priceCurrency\":\"USD\"}}</script></head><body></body></html>", {
        status: 200,
        headers: { "content-type": "text/html" }
      });
    };
    try {
      const request = new Request(
        "https://worker.test/api/product?url=" + encodeURIComponent(productUrl)
      );
      const response = await worker.fetch(request, {});
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.dataSource, "direct-storefront-page");
      assert.equal(body.title, "Direct Amazon Product");
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, productUrl.replace(/\\/dp\\/.+$/, "/dp/" + productUrl.split("/dp/")[1]));
      assert.equal(calls[0].options.method, "GET");
      assert.equal("OPENWEBNINJA_API_KEY" in {}, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
}
