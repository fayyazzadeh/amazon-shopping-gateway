import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCreatorsProduct } from "../src/product-data.js";

test("normalizes Amazon item and every child ASIN variation", () => {
  const raw = {
    itemsResult: {
      items: [{
        asin: "B08158GKCL",
        parentASIN: "B08158PARENT",
        detailPageURL: "https://www.amazon.com/dp/B08158GKCL",
        images: {
          primary: { large: { url: "https://example.com/main.jpg" } }
        },
        itemInfo: {
          title: { displayValue: "VEJA Campo Sneaker" },
          byLineInfo: { brand: { displayValue: "VEJA" } }
        },
        offersV2: {
          listings: [{
            price: { money: { amount: 119, currency: "USD", displayAmount: "$119.00" } },
            availability: { type: "IN_STOCK" },
            merchantInfo: { name: "Amazon.com" }
          }]
        }
      }]
    }
  };

  const variations = [
    {
      asin: "CHILD-BLACK-10",
      variationAttributes: [
        { name: "color_name", value: "Black/White" },
        { name: "size_name", value: "10" }
      ],
      images: { primary: { large: { url: "https://example.com/black-10.jpg" } } },
      offersV2: {
        listings: [{
          price: { money: { amount: 129, currency: "USD", displayAmount: "$129.00" } },
          availability: { type: "IN_STOCK" }
        }]
      }
    },
    {
      asin: "CHILD-WHITE-9",
      variationAttributes: [
        { name: "color_name", value: "Extra White/Black" },
        { name: "size_name", value: "9" }
      ],
      offersV2: {
        listings: [{
          price: { money: { amount: 125, currency: "USD", displayAmount: "$125.00" } },
          availability: { type: "OUT_OF_STOCK" }
        }]
      }
    }
  ];

  const result = normalizeCreatorsProduct(raw, {
    variationItems: variations,
    variationSummary: {
      variationCount: 2,
      variationDimensions: [
        { name: "color_name", displayName: "Color", values: ["Black/White", "Extra White/Black"] },
        { name: "size_name", displayName: "Size", values: ["9", "10"] }
      ]
    }
  });

  assert.equal(result.asin, "B08158GKCL");
  assert.equal(result.parentAsin, "B08158PARENT");
  assert.equal(result.title, "VEJA Campo Sneaker");
  assert.equal(result.brand, "VEJA");
  assert.equal(result.variations.length, 2);
  assert.equal(result.variations[0].asin, "CHILD-BLACK-10");
  assert.deepEqual(result.variations[0].attributes, {
    color_name: "Black/White",
    size_name: "10"
  });
  assert.equal(result.variations[0].price.amount, 129);
  assert.equal(result.variations[1].availability, "OUT_OF_STOCK");
  assert.deepEqual(result.dimensions[0].values, ["Black/White", "Extra White/Black"]);
});

test("normalizes an item without offers without inventing price or availability", () => {
  const result = normalizeCreatorsProduct({
    itemsResult: {
      items: [{
        asin: "B000000000",
        itemInfo: { title: { displayValue: "Example Product" } }
      }]
    }
  }, { variationItems: [], variationSummary: null });

  assert.equal(result.price, null);
  assert.equal(result.availability, null);
  assert.deepEqual(result.variations, []);
});
