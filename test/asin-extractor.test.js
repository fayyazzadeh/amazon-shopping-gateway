import test from "node:test";
import assert from "node:assert/strict";
import { extractAsinInventory } from "../src/asin-extractor.js";

test("normalizes child ASINs, attributes, prices, and removes duplicate/invalid ASINs", () => {
  const result = extractAsinInventory({
    asin: "B0FSZ17ZRS",
    parentAsin: "B0FSZ17ZRS",
    marketplace: "Amazon UAE",
    marketplaceDomain: "www.amazon.ae",
    title: "Sports top",
    variations: [
      { asin: "B012345678", attributes: { Color: "Black", Size: "S" }, price: { amount: 89.5, currency: "AED", displayAmount: "AED 89.50" } },
      { asin: "B012345678", attributes: { Color: "Black", Size: "S" } },
      { asin: "bad", attributes: { Color: "Red" } },
      { asin: "B087654321", attributes: { Color: "Blue", Size: "M" }, availability: "In Stock" }
    ]
  });

  assert.equal(result.variantCount, 2);
  assert.equal(result.variants[0].asin, "B012345678");
  assert.equal(result.variants[0].color, "Black");
  assert.equal(result.variants[0].size, "S");
  assert.equal(result.variants[0].price.amount, 89.5);
  assert.equal(result.variants[1].url, "https://www.amazon.ae/dp/B087654321");
});

test("falls back to the requested ASIN without claiming the variation family is complete", () => {
  const result = extractAsinInventory({
    asin: "B0FSZ17ZRS",
    title: "Sports top",
    marketplaceDomain: "www.amazon.ae",
    price: { amount: 99, currency: "AED" },
    variations: []
  });

  assert.equal(result.variantCount, 1);
  assert.equal(result.variants[0].asin, "B0FSZ17ZRS");
  assert.equal(result.completeness, "single-item-only");
  assert.match(result.note, /not proof/i);
});

test("requires a product object", () => {
  assert.throws(() => extractAsinInventory(null), /PRODUCT_REQUIRED/);
});
