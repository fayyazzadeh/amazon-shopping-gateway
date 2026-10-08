import test from "node:test";
import assert from "node:assert/strict";

const env = {
  RAPIDAPI_KEY: "test-key",
  RAPIDAPI_NEXT_HOST: "next-co-uk-api.p.rapidapi.com",
  RAPIDAPI_NEXT_ENDPOINT: "https://next-co-uk-api.p.rapidapi.com/scrapers/api/next-co-uk/product/get-by-url"
};

test("Next diagnostics reports configured state without exposing the API key", async () => {
  const { default: worker } = await import("../src/index.js");

  const response = await worker.fetch(
    new Request("https://example.workers.dev/api/diagnostics/next"),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.configured, true);
  assert.equal(body.liveChecked, false);
  assert.equal(body.rapidApiKeyConfigured, true);
  assert.equal(body.rapidApiNextHostConfigured, true);
  assert.equal(body.rapidApiNextEndpointConfigured, true);
  assert.equal(body.rapidApiNextEndpointValid, true);
  assert.equal("RAPIDAPI_KEY" in body, false);
  assert.equal("rapidApiKey" in body, false);
});

test("Next diagnostics live check verifies the RapidAPI request without exposing the API key", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({
      statusCode: 200,
      messageCode: "OK",
      data: [{
        item_number: "f30877",
        style_number: "su624250",
        title: "Lipsy Chocolate Brown Slinky Hardware Top",
        price: "£36",
        price_data: { price: { min_price: 36, max_price: 36 } },
        currency_code: "GBP",
        colour: "Chocolate Brown",
        fit: "Regular",
        item_media: [],
        options: { options: [] }
      }]
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const { default: worker } = await import("../src/index.js");
    const response = await worker.fetch(
      new Request("https://example.workers.dev/api/diagnostics/next?live=1"),
      env
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.configured, true);
    assert.equal(body.liveChecked, true);
    assert.equal(body.rapidApiStatus, 200);
    assert.equal(body.testProduct.itemNumber, "f30877");
    assert.equal(body.testProduct.styleNumber, "su624250");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[0].options.headers["X-RapidAPI-Key"], env.RAPIDAPI_KEY);
    assert.equal("RAPIDAPI_KEY" in body, false);
    assert.equal(body.detail, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
