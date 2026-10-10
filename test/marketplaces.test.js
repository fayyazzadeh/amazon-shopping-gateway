import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

async function resolve(url) {
  const request = new Request(
    "https://gateway.example/api/resolve-product?url=" + encodeURIComponent(url)
  );
  const response = await worker.fetch(request, {});
  return { status: response.status, body: await response.json() };
}

test("accepts ASIN links from US, UK, and UAE Amazon storefronts", async () => {
  const cases = [
    ["https://www.amazon.com/dp/B08158GKCL", "B08158GKCL"],
    ["https://www.amazon.co.uk/dp/B08158GKCL", "B08158GKCL"],
    ["https://www.amazon.ae/dp/B08158GKCL", "B08158GKCL"]
  ];

  for (const [url, asin] of cases) {
    const result = await resolve(url);
    assert.equal(result.status, 200, url);
    assert.equal(result.body.ok, true, url);
    assert.equal(result.body.asin, asin, url);
  }
});

test("rejects lookalike hosts that are not Amazon storefronts", async () => {
  const result = await resolve("https://amazon.co.uk.example.org/dp/B08158GKCL");
  assert.equal(result.status, 400);
  assert.equal(result.body.error, "UNSUPPORTED_URL");
});
