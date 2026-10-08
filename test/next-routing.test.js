import test from "node:test";
import assert from "node:assert/strict";

test("routes a next.co.uk product URL to the Next RapidAPI flow", async () => {
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
    const env = {
      RAPIDAPI_KEY: "test-key",
      RAPIDAPI_NEXT_HOST: "next-co-uk-api.p.rapidapi.com",
      RAPIDAPI_NEXT_ENDPOINT: "https://next-co-uk-api.p.rapidapi.com/scrapers/api/next-co-uk/product/get-by-url",
      GBP_TO_IRR: "500000",
      CUSTOMER_MARGIN_PERCENT: "0",
      FIXED_FEE_IRR: "0"
    };

    const response = await worker.fetch(
      new Request("https://example.workers.dev/api/product?url=" + encodeURIComponent("https://www.next.co.uk/style/su624250/f30877#f30877")),
      env
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.itemNumber, "f30877");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, env.RAPIDAPI_NEXT_ENDPOINT);
    assert.equal(calls[0].options.method, "POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
