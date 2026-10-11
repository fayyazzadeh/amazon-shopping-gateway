import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

for (const [marketplace, productUrl] of [
  ["Amazon UK", "https://www.amazon.co.uk/dp/B08158GKCL"],
  ["Amazon UAE", "https://www.amazon.ae/dp/B0B3C2R8MP"],
  ["Amazon US", "https://www.amazon.com/dp/B08158GKCL"]
]) {
  test(`${marketplace} lookup requires OpenWeb Ninja and never requests Creators API`, async () => {
    const request = new Request(
      "https://worker.test/api/product?url=" + encodeURIComponent(productUrl)
    );
    const response = await worker.fetch(request, {});
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.error, "OPENWEBNINJA_NOT_CONFIGURED");
    assert.match(body.message, /OpenWeb Ninja/);
    assert.doesNotMatch(JSON.stringify(body), /CREATORS_API|Creators API/);
  });
}
