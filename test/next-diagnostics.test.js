import test from "node:test";
import assert from "node:assert/strict";

const env = {
  RAPIDAPI_KEY: "test-key",
  RAPIDAPI_NEXT_HOST: "next-co-uk-api.p.rapidapi.com",
  RAPIDAPI_NEXT_ENDPOINT: "https://next-co-uk-api.p.rapidapi.com/scrapers/api/next-co-uk/product/get-by-url"
};

test("Next diagnostics identifies direct storefront mode without API credentials", async () => {
  const { default: worker } = await import("../src/index.js");
  const response = await worker.fetch(
    new Request("https://example.workers.dev/api/diagnostics/next"),
    {}
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.configured, true);
  assert.equal(body.liveChecked, false);
  assert.equal(body.provider, "Direct Next UK storefront");
  assert.equal(JSON.stringify(body).includes("RAPIDAPI"), false);
});

test("Next diagnostics live check fetches the Next page directly", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response("<!doctype html><html><head><meta property=\"og:title\" content=\"Direct Store Product\"><meta property=\"og:image\" content=\"https://images.example.test/item.jpg\"><meta property=\"product:price:amount\" content=\"25.50\"><meta property=\"product:price:currency\" content=\"GBP\"></head><body></body></html>", {
      status: 200,
      headers: { "content-type": "text/html" }
    });
  };
  try {
    const { default: worker } = await import("../src/index.js");
    const response = await worker.fetch(
      new Request("https://example.workers.dev/api/diagnostics/next?live=1"),
      {}
    );
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.liveChecked, true);
    assert.equal(body.provider, "Direct Next UK storefront");
    assert.equal(body.testProduct.title, "Direct Store Product");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://www.next.co.uk/style/su624250/f30877#f30877");
    assert.equal(calls[0].options.method, "GET");
    assert.equal(calls[0].options.headers.accept, "text/html,application/xhtml+xml");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
