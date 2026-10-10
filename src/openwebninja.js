const API_ENDPOINT = "https://api.openwebninja.com/realtime-amazon-data/product-details";
const ASIN_PATTERN = /^[A-Z0-9]{10}$/;

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function readText(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function readMoney(value, currency) {
  if (value && typeof value === "object") {
    const amount = Number(firstDefined(value.amount, value.value, value.price));
    if (Number.isFinite(amount)) {
      return {
        amount,
        currency: readText(value.currency) || currency,
        displayAmount: readText(firstDefined(value.displayAmount, value.display_amount, value.formatted))
      };
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return { amount: value, currency, displayAmount: null };
  }

  if (typeof value !== "string") return null;
  const text = value.trim();
  const match = text.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;

  const amount = Number(match[0]);
  if (!Number.isFinite(amount)) return null;
  return { amount, currency, displayAmount: text };
}

function readImage(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const image = readImage(item);
      if (image) return image;
    }
  }
  if (value && typeof value === "object") {
    return readText(firstDefined(value.url, value.image_url, value.src, value.large, value.medium));
  }
  return null;
}

function getAttributes(item) {
  const attributes = {};
  const candidates = [
    ["Color", firstDefined(item?.color, item?.colour, item?.color_name, item?.variation_attributes?.color)],
    ["Size", firstDefined(item?.size, item?.size_name, item?.variation_attributes?.size)],
    ["Style", firstDefined(item?.style, item?.style_name)]
  ];
  for (const [key, value] of candidates) {
    const text = readText(value);
    if (text) attributes[key] = text;
  }
  if (item?.variationAttributes && Array.isArray(item.variationAttributes)) {
    for (const attribute of item.variationAttributes) {
      const name = readText(attribute?.name);
      const value = readText(attribute?.value);
      if (name && value) attributes[name] = value;
    }
  }
  return attributes;
}

function normalizeVariation(item, currency, marketplaceDomain) {
  const asin = readText(firstDefined(item?.asin, item?.ASIN, item?.child_asin, item?.childASIN));
  if (!asin || !ASIN_PATTERN.test(asin.toUpperCase())) return null;
  const price = readMoney(
    firstDefined(item?.product_price, item?.price, item?.current_price, item?.price_amount),
    currency
  );
  return {
    asin: asin.toUpperCase(),
    title: readText(firstDefined(item?.product_title, item?.title, item?.name)),
    attributes: getAttributes(item),
    image: readImage(firstDefined(item?.product_photo, item?.image, item?.images, item?.product_photos)),
    price,
    availability: readText(firstDefined(item?.availability, item?.product_availability, item?.stock_status)),
    merchant: readText(firstDefined(item?.merchant, item?.seller, item?.sold_by)),
    url: readText(firstDefined(item?.product_url, item?.url)) || `https://${marketplaceDomain}/dp/${asin.toUpperCase()}`
  };
}

export function normalizeOpenWebNinjaProduct(payload, resolved) {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const details = data?.product_details && typeof data.product_details === "object"
    ? data.product_details
    : data;
  const requestedAsin = readText(resolved?.asin)?.toUpperCase();
  if (!requestedAsin || !ASIN_PATTERN.test(requestedAsin)) {
    throw new Error("OPENWEBNINJA_INVALID_REQUEST_ASIN");
  }

  const isUae = resolved?.host === "amazon.ae" || String(resolved?.host || "").endsWith(".amazon.ae");
  const currency = isUae ? "AED" : "USD";
  const marketplace = isUae ? "Amazon UAE" : "Amazon US";
  const marketplaceDomain = isUae ? "www.amazon.ae" : "www.amazon.com";
  const price = readMoney(firstDefined(
    details?.product_price, details?.price, details?.current_price, details?.price_amount
  ), currency);
  const originalPrice = readMoney(firstDefined(
    details?.product_original_price, details?.original_price, details?.list_price
  ), currency);
  const rawVariations = firstDefined(
    data?.all_product_variations, details?.all_product_variations,
    data?.variations, details?.variations, []
  );
  const variations = Array.isArray(rawVariations)
    ? rawVariations.map((item) => normalizeVariation(item, currency, marketplaceDomain)).filter(Boolean)
    : [];
  const rawImages = firstDefined(details?.product_photos, details?.images, details?.product_images, []);
  const images = (Array.isArray(rawImages) ? rawImages : [rawImages]).map(readImage).filter(Boolean);
  const image = readImage(firstDefined(details?.product_photo, details?.main_image, details?.image)) || images[0] || null;
  const title = readText(firstDefined(details?.product_title, details?.title, details?.name));
  if (!title && !price && !image && variations.length === 0) {
    throw new Error("OPENWEBNINJA_PRODUCT_DATA_EMPTY");
  }

  const parentAsin = readText(firstDefined(data?.parent_asin, data?.parentASIN, details?.parent_asin, details?.parentASIN));
  const dimensionValues = new Map();
  for (const variation of variations) {
    for (const [name, value] of Object.entries(variation.attributes)) {
      if (!dimensionValues.has(name)) dimensionValues.set(name, new Set());
      dimensionValues.get(name).add(value);
    }
  }
  const dimensions = [...dimensionValues.entries()].map(([name, values]) => ({
    name,
    displayName: name,
    values: [...values]
  }));

  return {
    ok: true,
    sourceUrl: resolved.sourceUrl,
    resolvedUrl: readText(firstDefined(details?.product_url, data?.product_url, resolved.resolvedUrl)) || resolved.resolvedUrl,
    marketplace,
    marketplaceDomain,
    asin: requestedAsin,
    parentAsin: parentAsin && ASIN_PATTERN.test(parentAsin.toUpperCase()) ? parentAsin.toUpperCase() : null,
    title,
    brand: readText(firstDefined(details?.brand, details?.product_brand)),
    image,
    images,
    rating: readMoney(firstDefined(details?.product_star_rating, details?.rating), null)?.amount ?? null,
    reviewCount: Number.isFinite(Number(firstDefined(details?.product_num_ratings, details?.review_count, details?.reviews_count)))
      ? Number(firstDefined(details?.product_num_ratings, details?.review_count, details?.reviews_count))
      : null,
    price,
    originalPrice,
    availability: readText(firstDefined(details?.product_availability, details?.availability, details?.stock_status)),
    merchant: readText(firstDefined(details?.merchant, details?.seller, details?.sold_by)),
    url: readText(firstDefined(details?.product_url, data?.product_url, resolved.resolvedUrl)) || resolved.resolvedUrl,
    dimensions,
    variations
  };
}

export async function fetchOpenWebNinjaProduct(env, resolved) {
  if (!env?.OPENWEBNINJA_API_KEY) {
    return { error: "OPENWEBNINJA_NOT_CONFIGURED", message: "OpenWeb Ninja API is not configured on this Worker." };
  }

  const isUae = resolved?.host === "amazon.ae" || String(resolved?.host || "").endsWith(".amazon.ae");
  const endpoint = new URL(API_ENDPOINT);
  endpoint.searchParams.set("asin", resolved.asin);
  endpoint.searchParams.set("country", isUae ? "AE" : "US");

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      "x-api-key": env.OPENWEBNINJA_API_KEY,
      "accept": "application/json"
    }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const status = response.status;
    const message = readText(firstDefined(payload?.message, payload?.error)) || `HTTP ${status}`;
    throw new Error(`OPENWEBNINJA_REQUEST_FAILED:${status}:${message}`);
  }

  const product = normalizeOpenWebNinjaProduct(payload, resolved);
  return {
    ...product,
    sourceUrl: resolved.sourceUrl,
    resolvedUrl: product.resolvedUrl || resolved.resolvedUrl,
    asin: resolved.asin
  };
}
