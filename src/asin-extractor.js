const ASIN_PATTERN = /^[A-Z0-9]{10}$/;

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeAsin(value) {
  const candidate = text(value)?.toUpperCase();
  return candidate && ASIN_PATTERN.test(candidate) ? candidate : null;
}

function money(price) {
  if (!price || typeof price !== "object") return null;
  const amount = Number(price.amount);
  if (!Number.isFinite(amount)) return null;
  return {
    amount,
    currency: text(price.currency),
    displayAmount: text(price.displayAmount)
  };
}

function normalizeVariant(variant, index, marketplaceDomain) {
  const asin = normalizeAsin(variant?.asin ?? variant?.ASIN ?? variant?.childAsin);
  if (!asin) return null;

  const attributes = {};
  if (variant.attributes && typeof variant.attributes === "object" && !Array.isArray(variant.attributes)) {
    for (const [key, value] of Object.entries(variant.attributes)) {
      const cleanKey = text(key);
      const cleanValue = text(String(value ?? ""));
      if (cleanKey && cleanValue) attributes[cleanKey] = cleanValue;
    }
  }

  const price = money(variant.price);
  const domain = text(marketplaceDomain);
  return {
    asin,
    index,
    title: text(variant.title),
    attributes,
    color: text(attributes.Color ?? attributes.Colour ?? attributes.color),
    size: text(attributes.Size ?? attributes.size),
    image: text(variant.image),
    price,
    pricing: variant.pricing && typeof variant.pricing === "object" ? variant.pricing : null,
    availability: text(variant.availability),
    merchant: text(variant.merchant),
    url: text(variant.url) || (domain ? `https://${domain}/dp/${asin}` : null)
  };
}

/**
 * Turn a provider-normalized product into a stable ASIN/variant inventory.
 * This does not discover variants itself; it faithfully normalizes the variants
 * actually returned by the configured provider.
 */
export function extractAsinInventory(product) {
  if (!product || typeof product !== "object") {
    throw new TypeError("PRODUCT_REQUIRED");
  }

  const parentAsin = normalizeAsin(product.parentAsin);
  const requestedAsin = normalizeAsin(product.asin);
  const seen = new Set();
  const variants = [];

  for (const raw of Array.isArray(product.variations) ? product.variations : []) {
    const variant = normalizeVariant(raw, variants.length + 1, product.marketplaceDomain);
    if (!variant || seen.has(variant.asin)) continue;
    seen.add(variant.asin);
    variants.push(variant);
  }

  // Some provider responses omit the variation list even when the requested ASIN
  // itself is valid. Preserve that item as a single known item, without claiming
  // that the full variation family was discovered.
  if (variants.length === 0 && requestedAsin) {
    variants.push({
      asin: requestedAsin,
      index: 1,
      title: text(product.title),
      attributes: {},
      color: null,
      size: null,
      image: text(product.image),
      price: money(product.price),
      pricing: product.pricing && typeof product.pricing === "object" ? product.pricing : null,
      availability: text(product.availability),
      merchant: text(product.merchant),
      url: text(product.url) || (text(product.marketplaceDomain) ? `https://${product.marketplaceDomain}/dp/${requestedAsin}` : null)
    });
    seen.add(requestedAsin);
  }

  return {
    ok: true,
    marketplace: text(product.marketplace),
    marketplaceDomain: text(product.marketplaceDomain),
    title: text(product.title),
    brand: text(product.brand),
    sourceUrl: text(product.sourceUrl),
    productUrl: text(product.url ?? product.resolvedUrl),
    requestedAsin,
    parentAsin,
    variantCount: variants.length,
    variants,
    completeness: variants.length > 1 ? "provider-variants-returned" : "single-item-only",
    note: variants.length > 1
      ? "Only variants returned by the configured provider are included; completeness depends on that provider's response."
      : "The provider returned no usable variant list. This is the requested item only, not proof that no other variants exist."
  };
}
