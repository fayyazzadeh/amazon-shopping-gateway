const AMAZON_HOST = /(^|\\.)amazon\\.(com|ae|co\\.uk)$/i;
const NEXT_HOST = /(^|\\.)next\\.co\\.uk$/i;
const ASIN = /^[A-Z0-9]{10}$/;

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function text(value) {
  if (typeof value === "string" && value.trim()) return decodeEntities(value.trim());
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function readMeta(html, names) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp('<meta[^>]+(?:property|name)\\s*=\\s*["\\']' + escaped + '["\\'][^>]+content\\s*=\\s*["\\']([^"\\']*)["\\'][^>]*>', "i"),
      new RegExp('<meta[^>]+content\\s*=\\s*["\\']([^"\\']*)["\\'][^>]+(?:property|name)\\s*=\\s*["\\']' + escaped + '["\\'][^>]*>', "i")
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return decodeEntities(match[1]);
    }
  }
  return null;
}

function parseJsonLd(html) {
  const items = [];
  const pattern = /<script[^>]+type=["']application\\/ld\\+json["'][^>]*>([\\s\\S]*?)<\\/script>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    try {
      const value = JSON.parse(match[1].trim());
      const queue = Array.isArray(value) ? [...value] : [value];
      while (queue.length) {
        const item = queue.shift();
        if (!item || typeof item !== "object") continue;
        if (Array.isArray(item)) queue.push(...item);
        else {
          if (item["@graph"] && Array.isArray(item["@graph"])) queue.push(...item["@graph"]);
          if (item["@type"] === "Product" || (Array.isArray(item["@type"]) && item["@type"].includes("Product"))) items.push(item);
        }
      }
    } catch {
      // Pages may contain malformed or partial JSON-LD; use other public metadata.
    }
  }
  return items;
}

function amount(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/,/g, "").match(/\\d+(?:\\.\\d{1,2})?/);
  return normalized ? Number(normalized[0]) : null;
}

function currencyFor(host, html) {
  if (host.endsWith("amazon.ae")) return "AED";
  if (host.endsWith("amazon.co.uk") || host.endsWith("next.co.uk")) return "GBP";
  const currency = readMeta(html, ["product:price:currency", "og:price:currency"]);
  return currency || "USD";
}

function normalizeOffer(offer, currency) {
  const current = Array.isArray(offer) ? offer[0] : offer;
  if (!current || typeof current !== "object") return null;
  const value = amount(current.price ?? current.lowPrice ?? current.priceSpecification?.price);
  if (value === null) return null;
  return { amount: value, currency: text(current.priceCurrency) || currency, displayAmount: null };
}

function getBrand(product) {
  return text(typeof product.brand === "object" ? product.brand.name : product.brand);
}

function normalizeVariant(variant, currency, host) {
  if (!variant || typeof variant !== "object") return null;
  const sku = text(variant.sku || variant.productID || variant.mpn);
  const asin = sku && ASIN.test(sku.toUpperCase()) ? sku.toUpperCase() : null;
  const offer = normalizeOffer(variant.offers, currency);
  return {
    asin,
    title: text(variant.name),
    attributes: Object.fromEntries([
      ["Color", text(variant.color)],
      ["Size", text(variant.size)]
    ].filter(([, value]) => value)),
    image: text(Array.isArray(variant.image) ? variant.image[0] : variant.image),
    price: offer,
    availability: text(variant.offers?.availability),
    merchant: null,
    url: asin && AMAZON_HOST.test(host) ? "https://" + host + "/dp/" + asin : text(variant.url)
  };
}

function normalizeProduct(html, resolved, finalUrl) {
  const host = new URL(finalUrl).hostname.toLowerCase();
  const jsonProducts = parseJsonLd(html);
  const product = jsonProducts.find((item) => item.name || item.offers || item.image) || {};
  const currency = currencyFor(host, html);
  const rawTitle = text(product.name) || readMeta(html, ["og:title", "twitter:title"]) ||
    (html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i)?.[1] || "").trim();
  const title = text(rawTitle?.replace(/\\s*:\\s*Amazon\\.(?:com|co\\.uk|ae).*$/i, ""));
  const price = normalizeOffer(product.offers, currency) || (() => {
    const raw = readMeta(html, ["product:price:amount", "og:price:amount"]);
    const value = amount(raw);
    return value === null ? null : { amount: value, currency, displayAmount: raw };
  })();
  const imageValue = Array.isArray(product.image) ? product.image[0] : product.image;
  const image = text(imageValue) || readMeta(html, ["og:image", "twitter:image"]);
  const brand = getBrand(product) || readMeta(html, ["brand"]);
  const description = text(product.description) || readMeta(html, ["og:description", "description"]);
  const availability = text(product.offers?.availability) || readMeta(html, ["product:availability"]);
  const ratingValue = Number(product.aggregateRating?.ratingValue);
  const reviewValue = Number(product.aggregateRating?.reviewCount ?? product.aggregateRating?.ratingCount);
  const variants = Array.isArray(product.hasVariant) ? product.hasVariant : [];
  const variations = variants.map((variant) => normalizeVariant(variant, currency, host)).filter((item) => item && (item.asin || item.title));
  const asin = resolved.asin || null;

  if (!title && !price && !image) {
    throw new Error("DIRECT_PRODUCT_DATA_EMPTY");
  }

  return {
    ok: true,
    sourceUrl: resolved.sourceUrl || finalUrl,
    resolvedUrl: text(product.url) || finalUrl,
    marketplace: host.endsWith("amazon.ae") ? "Amazon UAE" :
      host.endsWith("amazon.co.uk") ? "Amazon UK" :
      host.endsWith("next.co.uk") ? "Next UK" : "Amazon US",
    marketplaceDomain: host,
    asin,
    parentAsin: null,
    title,
    brand,
    description,
    image,
    images: image ? [image] : [],
    rating: Number.isFinite(ratingValue) && ratingValue > 0 ? ratingValue : null,
    reviewCount: Number.isFinite(reviewValue) && reviewValue > 0 ? reviewValue : null,
    price,
    originalPrice: null,
    availability,
    merchant: null,
    variations,
    dimensions: [],
    dataSource: "direct-storefront-page",
    fetchedAt: new Date().toISOString()
  };
}

export async function fetchDirectProduct(resolved) {
  const original = new URL(resolved.resolvedUrl || resolved.sourceUrl);
  const host = original.hostname.toLowerCase();
  const isAmazon = AMAZON_HOST.test(host);
  const isNext = NEXT_HOST.test(host);
  if (!isAmazon && !isNext) {
    return { ok: false, error: "UNSUPPORTED_URL", message: "Only supported Amazon and Next UK storefront URLs are allowed." };
  }

  let target = original;
  if (isAmazon && resolved.asin && ASIN.test(resolved.asin)) {
    target = new URL("/dp/" + resolved.asin, "https://" + host);
  }

  let response;
  try {
    response = await fetch(target.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        "accept": "text/html,application/xhtml+xml",
        "accept-language": "en-GB,en;q=0.9,en-US;q=0.8",
        "user-agent": "AmazonShoppingGateway/1.0 (+product lookup; contact site operator)"
      },
      cf: { cacheTtl: 0, cacheEverything: false }
    });
  } catch {
    return {
      ok: false,
      error: "DIRECT_FETCH_NETWORK_ERROR",
      message: "The Worker could not connect to the store page directly. No third-party data provider was used."
    };
  }

  const finalUrl = response.url || target.toString();
  const finalHost = new URL(finalUrl).hostname.toLowerCase();
  if (!AMAZON_HOST.test(finalHost) && !NEXT_HOST.test(finalHost)) {
    return { ok: false, error: "UNSAFE_REDIRECT", message: "The store redirected the request outside the supported storefront domains." };
  }
  if (response.status === 403 || response.status === 429 || response.status === 503) {
    return {
      ok: false,
      error: "DIRECT_FETCH_BLOCKED",
      upstreamStatus: response.status,
      message: "The storefront refused or rate-limited this direct request. This implementation does not bypass access controls; use an allowed access path or retry later."
    };
  }
  if (!response.ok) {
    return {
      ok: false,
      error: "DIRECT_FETCH_HTTP_ERROR",
      upstreamStatus: response.status,
      message: "The storefront returned an unsuccessful HTTP response."
    };
  }

  const html = await response.text();
  if (/captcha|robot check|automated access|enter the characters you see below/i.test(html.slice(0, 250000))) {
    return {
      ok: false,
      error: "DIRECT_FETCH_CHALLENGE",
      upstreamStatus: response.status,
      message: "The storefront returned an automated-access challenge. The gateway will not attempt to bypass it."
    };
  }

  try {
    return normalizeProduct(html, resolved, finalUrl);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "DIRECT_PRODUCT_PARSE_FAILED",
      message: "The storefront responded, but the gateway could not extract reliable product metadata."
    };
  }
}
