import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

test("Amazon UK lookup requires OpenWeb Ninja instead of Creators API", async () => {
  const request = new Request(
    "https://worker.test/api/product?url=" +
      encodeURIComponent("https://www.amazon.co.uk/dp/B08158GKCL")
  );

  const response = await worker.fetch(request, {});
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.error, "OPENWEBNINJA_NOT_CONFIGURED");
  assert.match(body.message, /OpenWeb Ninja/);
  assert.doesNotMatch(JSON.stringify(body), /CREATORS_API|Creators API/);
});
