import test from "node:test";
import assert from "node:assert/strict";
import { normalizeOpenWebNinjaProduct } from "../src/openwebninja.js";

test("normalizes an Amazon.ae response and keeps the requested ASIN canonical", () => {
  const resolved = {
    asin: "B0GCZJ74XZ",
    host: "www.amazon.ae",
    sourceUrl: "https://www.amazon.ae/dp/B0GCZJ74XZ",
    resolvedUrl: "https://www.amazon.ae/dp/B0GCZJ74XZ"
  };
  const payload = {
    data: {
      asin: "B0GCZJ74XZ",
      parent_asin: "B0GP1KM5W4",
      product_details: {
        ASIN: "B0GP1KM5W4",
        product_title: "Alex Vando Mens Linen Shirt",
        product_price: "AED 128.00",
        product_original_price: "AED 160.00",
        product_star_rating: "4.2",
        product_num_ratings: 67,
        product_photos: ["https://example.com/shirt.jpg"],
        product_availability: "Only 1 left in stock - order soon."
      },
      all_product_variations: [
        { asin: "B0GCZJ74X1", color: "Black", size: "M", product_price: "AED 128.00" },
        { asin: "B0GCZJ74X2", color: "Blue", size: "L", product_price: "AED 130.00" }
      ]
    }
  };

  const result = normalizeOpenWebNinjaProduct(payload, resolved);
  assert.equal(result.asin, "B0GCZJ74XZ");
  assert.equal(result.parentAsin, "B0GP1KM5W4");
  assert.equal(result.marketplace, "Amazon UAE");
  assert.equal(result.price.amount, 128);
  assert.equal(result.price.currency, "AED");
  assert.equal(result.originalPrice.amount, 160);
  assert.equal(result.rating, 4.2);
  assert.equal(result.reviewCount, 67);
  assert.equal(result.variations.length, 2);
  assert.deepEqual(result.variations[0].attributes, { Color: "Black", Size: "M" });
});

test("returns an explicit empty-data error instead of a misleading product", () => {
  assert.throws(
    () => normalizeOpenWebNinjaProduct({ data: { asin: "B0D49VHNBT", product_details: { ASIN: "B0DDY7C3NT" } } }, {
      asin: "B0D49VHNBT", host: "www.amazon.com", sourceUrl: "https://www.amazon.com/dp/B0D49VHNBT", resolvedUrl: "https://www.amazon.com/dp/B0D49VHNBT"
    }),
    /OPENWEBNINJA_PRODUCT_DATA_EMPTY/
  );
});

test("normalizes an Amazon.co.uk response with GBP pricing and UK marketplace metadata", () => {
  const resolved = {
    asin: "B08158GKCL",
    host: "www.amazon.co.uk",
    sourceUrl: "https://www.amazon.co.uk/dp/B08158GKCL",
    resolvedUrl: "https://www.amazon.co.uk/dp/B08158GKCL"
  };
  const payload = {
    data: {
      asin: "B08158GKCL",
      product_details: {
        product_title: "Test UK Product",
        product_price: "£49.99",
        product_original_price: "£59.99",
        product_photo: "https://example.com/uk-product.jpg",
        product_availability: "In Stock"
      },
      all_product_variations: [
        { asin: "B08158GKCL", color: "White", size: "8", product_price: "£49.99" }
      ]
    }
  };

  const result = normalizeOpenWebNinjaProduct(payload, resolved);
  assert.equal(result.marketplace, "Amazon UK");
  assert.equal(result.marketplaceDomain, "www.amazon.co.uk");
  assert.equal(result.price.amount, 49.99);
  assert.equal(result.price.currency, "GBP");
  assert.equal(result.originalPrice.currency, "GBP");
  assert.equal(result.variations[0].price.currency, "GBP");
});
