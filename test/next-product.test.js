import test from "node:test";
import assert from "node:assert/strict";
import { normalizeNextProduct } from "../src/next-product.js";

test("normalizes the documented Next product response", () => {
  const payload = {
    statusCode: 200,
    messageCode: "OK",
    data: [{
      style_number: "su624250",
      item_number: "f30877",
      title: "Lipsy Chocolate Brown Slinky Hardware Top",
      price: "£36",
      price_data: { was_price: null, sale_price: null, price: { min_price: 36, max_price: 36 } },
      product_code: "F30-877",
      brand: "Lipsy",
      item_media: [{ image_url: "/common/items/default/default/itemimages/3_4Ratio/product/lge/F30877s.jpg", is_hero_image: true }],
      category: "T-Shirts", collection: "Casual", department: "Womenswear", gender: "Women", colour: "Chocolate Brown", currency_code: "GBP",
      options: { options: [{ name: "6", value: "07", price: null, price_unformatted: 36, stock_status: "InStock" }], render_method: "chip" },
      fit: "Regular",
      fits_and_colourways: { fits: [{ display_text: "Regular" }], colourways: { colourways: [{ display_text: "Chocolate Brown", item_number: "F30877", is_available: true }] } },
      available_for_collect_in_store: false, offer_type: "none"
    }]
  };
  const result = normalizeNextProduct(payload, "https://www.next.co.uk/style/su624250/f30877#f30877");
  assert.equal(result.itemNumber, "f30877");
  assert.equal(result.styleNumber, "su624250");
  assert.equal(result.price.amount, 36);
  assert.equal(result.price.currency, "GBP");
  assert.equal(result.image, "https://xcdn.next.co.uk/common/items/default/default/itemimages/3_4Ratio/product/lge/F30877s.jpg");
  assert.deepEqual(result.dimensions.map((d) => d.name), ["Color", "Fit", "Size"]);
  assert.equal(result.variations.length, 1);
  assert.equal(result.variations[0].attributes.Size, "6");
  assert.equal(result.variations[0].availability, "InStock");
  assert.equal(result.variations[0].price.amount, 36);
});
