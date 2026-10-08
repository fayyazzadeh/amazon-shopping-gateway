function firstArrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function findFirst(obj, keys) {
  if (!obj || typeof obj !== "object") return null;
  for (const key of keys) {
    if (obj[key] != null) return obj[key];
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const found = findFirst(value, keys);
      if (found != null) return found;
    }
  }
  return null;
}

function normalizeMoney(value) {
  if (typeof value === "number") return { amount: value, currency: "GBP", displayAmount: null };
  if (typeof value === "string") {
    const match = value.replace(/,/g, "").match(/([£$€])?\s*(\d+(?:\.\d{1,2})?)/);
    if (!match) return null;
    const currency = match[1] === "£" ? "GBP" : match[1] === "$" ? "USD" : match[1] === "€" ? "EUR" : "GBP";
    return { amount: Number(match[2]), currency, displayAmount: value };
  }
  if (!value || typeof value !== "object") return null;
  const amount = Number(value.amount ?? value.value ?? value.price ?? value.currentPrice);
  if (!Number.isFinite(amount)) return null;
  return {
    amount,
    currency: value.currency ?? value.currencyCode ?? "GBP",
    displayAmount: value.displayAmount ?? value.formatted ?? value.label ?? null
  };
}

function normalizeVariant(raw, index) {
  const attributes = {};
  const colour = findFirst(raw, ["colour", "color", "colourName", "colorName"]);
  const size = findFirst(raw, ["size", "sizeName"]);
  if (colour != null) attributes.Color = String(colour);
  if (size != null) attributes.Size = String(size);

  const asin = findFirst(raw, ["asin", "sku", "variant_id", "variantId", "item_id", "itemId", "id"]);
  const title = findFirst(raw, ["title", "name", "productName"]);
  const image = findFirst(raw, ["image", "imageUrl", "image_url", "thumbnail"]);
  const price = normalizeMoney(findFirst(raw, ["price", "currentPrice", "sellingPrice", "salePrice", "wasPrice"]));
  const availability = findFirst(raw, ["availability", "stock", "stockStatus", "inStock"]);

  return {
    asin: asin != null ? String(asin) : `next-${index + 1}`,
    title: title != null ? String(title) : null,
    attributes,
    image: image != null ? String(image) : null,
    price,
    availability: typeof availability === "boolean" ? (availability ? "In stock" : "Out of stock") : (availability != null ? String(availability) : null),
    merchant: "Next",
    url: findFirst(raw, ["url", "productUrl", "product_url", "href"]) ?? null
  };
}

export function normalizeNextProduct(payload, sourceUrl) {
  const root = payload?.data ?? payload?.product ?? payload?.result ?? payload;
  const title = findFirst(root, ["title", "name", "productName"]);
  const brand = findFirst(root, ["brand", "brandName"]);
  const image = findFirst(root, ["image", "imageUrl", "image_url", "thumbnail"]);
  const price = normalizeMoney(findFirst(root, ["price", "currentPrice", "sellingPrice", "salePrice", "wasPrice"]));
  const sku = findFirst(root, ["sku", "item_id", "itemId", "productId", "product_id", "id"]);
  const availability = findFirst(root, ["availability", "stock", "stockStatus", "inStock"]);
  const canonicalUrl = findFirst(root, ["url", "productUrl", "product_url", "canonicalUrl"]) ?? sourceUrl;

  let rawVariants = findFirst(root, ["variants", "variations", "products", "items"]);
  if (!Array.isArray(rawVariants)) rawVariants = [];

  const variations = rawVariants.map(normalizeVariant);
  if (!variations.length && sku != null) {
    variations.push(normalizeVariant({
      asin: sku,
      title,
      image,
      price,
      availability,
      url: canonicalUrl
    }, 0));
  }

  const dimensions = [];
  const colors = [...new Set(variations.map(v => v.attributes.Color).filter(Boolean))];
  const sizes = [...new Set(variations.map(v => v.attributes.Size).filter(Boolean))];
  if (colors.length) dimensions.push({ name: "Color", displayName: "رنگ", values: colors });
  if (sizes.length) dimensions.push({ name: "Size", displayName: "سایز", values: sizes });

  return {
    asin: sku != null ? String(sku) : null,
    parentAsin: sku != null ? String(sku) : null,
    title: title != null ? String(title) : "محصول Next",
    brand: brand != null ? String(brand) : "Next",
    image: image != null ? String(image) : null,
    rating: findFirst(root, ["rating", "averageRating"]) ?? null,
    reviewCount: findFirst(root, ["reviewCount", "reviews", "numberOfReviews"]) ?? null,
    price,
    availability: typeof availability === "boolean" ? (availability ? "In stock" : "Out of stock") : (availability != null ? String(availability) : null),
    merchant: "Next",
    url: canonicalUrl,
    dimensions,
    variations
  };
}
