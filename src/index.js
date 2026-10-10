import { normalizeCreatorsProduct } from "./product-data.js";
import { fetchOpenWebNinjaProduct } from "./openwebninja.js";
import { normalizeNextProduct } from "./next-product.js";

const SHORT_HOSTS = new Set(["amzn.to", "amzn.eu", "a.co"]);
const AMAZON_HOST_PATTERN = /(^|\.)amazon\.(com|ae|co\.uk)$/i;
const ASIN_PATTERNS = [
  /\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /\/gp\/product\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /\/gp\/aw\/d\/([A-Z0-9]{10})(?:[/?]|$)/i
];

let tokenCache = null;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}

function extractAsin(pathname) {
  for (const pattern of ASIN_PATTERNS) {
    const match = pathname.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  return null;
}

const NEXT_HOST_PATTERN = /(^|\.)next\.co\.uk$/i;
const NEXT_DIAGNOSTIC_URL = "https://www.next.co.uk/style/su624250/f30877#f30877";

function isNextUrl(inputUrl) {
  try {
    return NEXT_HOST_PATTERN.test(new URL(inputUrl).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function getNextConfigStatus(env) {
  let endpointValid = false;
  let endpointHost = null;

  try {
    const endpoint = new URL(env?.RAPIDAPI_NEXT_ENDPOINT || "");
    endpointValid = endpoint.protocol === "https:" && Boolean(endpoint.hostname);
    endpointHost = endpoint.hostname || null;
  } catch {
    // Keep diagnostics safe and non-throwing when the endpoint is missing/invalid.
  }

  return {
    rapidApiKeyConfigured: Boolean(env?.RAPIDAPI_KEY),
    rapidApiNextHostConfigured: Boolean(env?.RAPIDAPI_NEXT_HOST),
    rapidApiNextEndpointConfigured: Boolean(env?.RAPIDAPI_NEXT_ENDPOINT),
    rapidApiNextEndpointValid: endpointValid,
    rapidApiNextHost: env?.RAPIDAPI_NEXT_HOST || null,
    rapidApiNextEndpointHost: endpointHost
  };
}

async function getNextDiagnostics(env, liveCheck) {
  const config = getNextConfigStatus(env);

  if (!config.rapidApiKeyConfigured || !config.rapidApiNextHostConfigured || !config.rapidApiNextEndpointConfigured) {
    return {
      ok: false,
      configured: false,
      liveChecked: false,
      ...config,
      message: "RapidAPI for Next has not been fully configured on this Worker."
    };
  }

  if (!config.rapidApiNextEndpointValid) {
    return {
      ok: false,
      configured: false,
      liveChecked: false,
      ...config,
      message: "RAPIDAPI_NEXT_ENDPOINT is not a valid URL."
    };
  }

  if (!liveCheck) {
    return {
      ok: true,
      configured: true,
      liveChecked: false,
      ...config,
      message: "All three RapidAPI settings for Next are present on the Worker. The API key is never displayed."
    };
  }

  try {
    const result = await fetchNextProduct(env, NEXT_DIAGNOSTIC_URL);
    if (!result.ok) {
      return {
        ok: false,
        configured: true,
        liveChecked: true,
        ...config,
        rapidApiError: result.error || "NEXT_PRODUCT_LOOKUP_FAILED",
        message: result.message || "The live Next check failed."
      };
    }

    return {
      ok: true,
      configured: true,
      liveChecked: true,
      ...config,
      rapidApiStatus: 200,
      testProduct: {
        title: result.title || null,
        styleNumber: result.styleNumber || null,
        itemNumber: result.itemNumber || null,
        price: result.price || null,
        variationCount: Array.isArray(result.variations) ? result.variations.length : 0
      },
      message: "The Worker connected to RapidAPI and Next successfully."
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      liveChecked: true,
      ...config,
      rapidApiStatus: null,
      rapidApiError: "LIVE_CHECK_FAILED",
      detail: error instanceof Error ? error.message : String(error),
      message: "Configuration is present, but the live RapidAPI/Next check failed."
    };
  }
}

async function fetchNextProduct(env, inputUrl) {
  if (!env.RAPIDAPI_KEY || !env.RAPIDAPI_NEXT_HOST || !env.RAPIDAPI_NEXT_ENDPOINT) {
    return {
      error: "RAPIDAPI_NEXT_NOT_CONFIGURED",
      message: "RapidAPI for Next has not been configured on this Worker."
    };
  }

  let source;
  try {
    source = new URL(inputUrl);
  } catch {
    return { error: "INVALID_URL", message: "The supplied URL is invalid." };
  }

  if (!NEXT_HOST_PATTERN.test(source.hostname.toLowerCase())) {
    return { error: "UNSUPPORTED_URL", message: "Only next.co.uk product URLs are supported." };
  }

  const endpoint = new URL(env.RAPIDAPI_NEXT_ENDPOINT);

  const response = await fetch(endpoint.toString(), {
    method: "POST",
    headers: {
      "X-RapidAPI-Key": env.RAPIDAPI_KEY,
      "X-RapidAPI-Host": env.RAPIDAPI_NEXT_HOST,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({ url: source.toString() })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.message || payload?.error || ("HTTP " + response.status);
    throw new Error("RAPIDAPI_NEXT_FAILED:" + detail);
  }

  const product = normalizeNextProduct(payload, source.toString());
  product.pricing = buildCustomerPricing(product.price, env);
  product.variations = product.variations.map((variation) => ({
    ...variation,
    pricing: buildCustomerPricing(variation.price, env)
  }));
  if (!product.title && !product.price && !product.variations.length) {
    return {
      error: "NEXT_PRODUCT_NOT_FOUND",
      message: "RapidAPI did not return usable data for this Next product."
    };
  }

  return {
    ok: true,
    sourceUrl: source.toString(),
    resolvedUrl: product.url || source.toString(),
    marketplace: "Next UK",
    marketplaceDomain: "next.co.uk",
    ...product,
    pricing: buildCustomerPricing(product.price, env)
  };
}

function buildCustomerPricing(price, env) {
  if (!price || !Number.isFinite(Number(price.amount))) return null;

  const amount = Number(price.amount);
  const currency = price.currency || "GBP";
  const rateKey = currency === "GBP" ? "GBP_TO_IRR" : currency === "USD" ? "USD_TO_IRR" : null;
  const rate = rateKey ? Number(env?.[rateKey]) : null;
  const marginPercent = Number(env?.CUSTOMER_MARGIN_PERCENT || 0);
  const fixedFee = Number(env?.FIXED_FEE_IRR || 0);

  if (!Number.isFinite(rate) || rate <= 0) {
    return {
      sourceAmount: amount,
      sourceCurrency: currency,
      customerAmount: null,
      customerCurrency: "IRR",
      configured: false
    };
  }

  const customerAmount = Math.ceil((amount * rate * (1 + marginPercent / 100) + fixedFee) / 1000) * 1000;
  return {
    sourceAmount: amount,
    sourceCurrency: currency,
    exchangeRate: rate,
    marginPercent,
    fixedFee,
    customerAmount,
    customerCurrency: "IRR",
    configured: true
  };
}

function marketplaceConfig(host, env) {
  if (host === "amazon.co.uk" || host.endsWith(".amazon.co.uk")) {
    return {
      label: "Amazon UK",
      domain: "www.amazon.co.uk",
      tokenEndpoint: env?.AMAZON_TOKEN_ENDPOINT_UK || "https://api.amazon.co.uk/auth/o2/token",
      partnerTag: env?.AMAZON_PARTNER_TAG_UK || null
    };
  }

  if (host === "amazon.ae" || host.endsWith(".amazon.ae")) {
    return {
      label: "Amazon UAE",
      domain: "www.amazon.ae",
      tokenEndpoint: env?.AMAZON_TOKEN_ENDPOINT_AE || "https://api.amazon.co.uk/auth/o2/token",
      partnerTag: env?.AMAZON_PARTNER_TAG_AE || env?.AMAZON_PARTNER_TAG || null
    };
  }

  if (host === "amazon.com" || host.endsWith(".amazon.com")) {
    return {
      label: "Amazon US",
      domain: "www.amazon.com",
      tokenEndpoint: env?.AMAZON_TOKEN_ENDPOINT_US || "https://api.amazon.com/auth/o2/token",
      partnerTag: env?.AMAZON_PARTNER_TAG_US || env?.AMAZON_PARTNER_TAG || null
    };
  }

  return null;
}

function isAllowedShortUrl(url) {
  return url.protocol === "https:" && SHORT_HOSTS.has(url.hostname.toLowerCase());
}

async function resolveShortUrl(inputUrl) {
  let source;
  try {
    source = new URL(inputUrl);
  } catch {
    return { error: "INVALID_URL", message: "The supplied URL is invalid." };
  }

  if (!isAllowedShortUrl(source)) {
    return {
      error: "UNSUPPORTED_URL",
      message: "Only amzn.to, amzn.eu, and a.co short links can be resolved."
    };
  }

  let response;
  try {
    response = await fetch(source.toString(), {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AmazonShoppingGateway/0.1)" },
      cache: "no-store"
    });
  } catch {
    return { error: "RESOLVE_FAILED", message: "Could not connect to the short link or its destination." };
  }

  const finalUrl = new URL(response.url || source.toString());
  const finalHost = finalUrl.hostname.toLowerCase();

  if (!AMAZON_HOST_PATTERN.test(finalHost)) {
    return {
      error: "UNSAFE_DESTINATION",
      message: "The short link did not redirect to an Amazon domain."
    };
  }

  const asin = extractAsin(finalUrl.pathname);
  if (!asin) {
    return {
      error: "ASIN_NOT_FOUND",
      message: "The link reached Amazon, but an ASIN could not be extracted from the final URL.",
      resolvedUrl: finalUrl.toString()
    };
  }

  return {
    ok: true,
    sourceUrl: source.toString(),
    resolvedUrl: finalUrl.toString(),
    asin
  };
}

async function resolveAmazonInput(inputUrl) {
  let source;
  try {
    source = new URL(inputUrl);
  } catch {
    return { error: "INVALID_URL", message: "The supplied URL is invalid." };
  }

  const host = source.hostname.toLowerCase();

  if (SHORT_HOSTS.has(host)) {
    const resolved = await resolveShortUrl(source.toString());
    if (!resolved.ok) return resolved;
    const finalUrl = new URL(resolved.resolvedUrl);
    return { ...resolved, host: finalUrl.hostname.toLowerCase() };
  }

  if (!AMAZON_HOST_PATTERN.test(host)) {
    return {
      error: "UNSUPPORTED_URL",
      message: "Only Amazon.com, Amazon.co.uk, Amazon.ae, and supported Amazon short links are supported."
    };
  }

  const asin = extractAsin(source.pathname);
  if (!asin) {
    return {
      error: "ASIN_NOT_FOUND",
      message: "Could not extract an ASIN from the Amazon URL."
    };
  }

  return {
    ok: true,
    sourceUrl: source.toString(),
    resolvedUrl: source.toString(),
    asin,
    host
  };
}

function getConfigForHost(host, env) {
  const config = marketplaceConfig(host, env);
  if (!config) {
    return {
      error: "UNSUPPORTED_MARKETPLACE",
      message: "This Amazon marketplace is not supported."
    };
  }

  if (!env.CREATORS_API_CLIENT_ID || !env.CREATORS_API_CLIENT_SECRET || !config.partnerTag) {
    return {
      error: "CREATORS_API_NOT_CONFIGURED",
      message: "Amazon Creators API access has not been configured on this Worker."
    };
  }

  return { ok: true, config };
}

async function getAccessToken(env, tokenEndpoint) {
  const now = Date.now();
  if (tokenCache && tokenCache.endpoint === tokenEndpoint && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.token;
  }

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: env.CREATORS_API_CLIENT_ID,
      client_secret: env.CREATORS_API_CLIENT_SECRET,
      scope: "creatorsapi::default"
    })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) {
    throw new Error("CREATORS_API_TOKEN_FAILED:" + response.status);
  }

  tokenCache = {
    endpoint: tokenEndpoint,
    token: data.access_token,
    expiresAt: now + Math.max(60, Number(data.expires_in || 3600) - 60) * 1000
  };

  return tokenCache.token;
}

async function creatorsRequest(env, config, operation, payload) {
  const token = await getAccessToken(env, config.tokenEndpoint);
  const response = await fetch("https://creatorsapi.amazon/catalog/v1/" + operation, {
    method: "POST",
    headers: {
      "authorization": "Bearer " + token,
      "content-type": "application/json",
      "x-marketplace": config.domain
    },
    body: JSON.stringify({
      ...payload,
      partnerTag: config.partnerTag,
      marketplace: config.domain
    })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.errors?.[0]?.message || ("HTTP " + response.status);
    throw new Error("CREATORS_API_" + operation.toUpperCase() + "_FAILED:" + detail);
  }

  return data;
}

const PRODUCT_RESOURCES = [
  "images.primary.large",
  "itemInfo.title",
  "itemInfo.byLineInfo",
  "itemInfo.productInfo",
  "offersV2.listings.price",
  "offersV2.listings.availability",
  "offersV2.listings.merchantInfo",
  "parentASIN"
];

const VARIATION_RESOURCES = [
  "images.primary.large",
  "itemInfo.title",
  "itemInfo.byLineInfo",
  "itemInfo.productInfo",
  "offersV2.listings.price",
  "offersV2.listings.availability",
  "offersV2.listings.merchantInfo",
  "parentASIN",
  "variationSummary.variationDimension"
];

async function fetchProduct(env, inputUrl) {
  if (isNextUrl(inputUrl)) return fetchNextProduct(env, inputUrl);
  const resolved = await resolveAmazonInput(inputUrl);
  if (!resolved.ok) return resolved;

  const host = resolved.host.toLowerCase();
  const supportsOpenWebNinja =
    host === "amazon.com" ||
    host.endsWith(".amazon.com") ||
    host === "amazon.ae" ||
    host.endsWith(".amazon.ae");

  // Prefer the configured OpenWeb Ninja provider for US and UAE. Keep the
  // existing Creators API path for UK and as a fallback when this key is absent.
  if (env?.OPENWEBNINJA_API_KEY && supportsOpenWebNinja) {
    const product = await fetchOpenWebNinjaProduct(env, resolved);
    product.pricing = buildCustomerPricing(product.price, env);
    product.variations = product.variations.map((variation) => ({
      ...variation,
      pricing: buildCustomerPricing(variation.price, env)
    }));
    return product;
  }

  const configResult = getConfigForHost(resolved.host, env);
  if (!configResult.ok) return configResult;

  const config = configResult.config;
  const itemResponse = await creatorsRequest(env, config, "getItems", {
    itemIds: [resolved.asin],
    itemIdType: "ASIN",
    resources: PRODUCT_RESOURCES
  });

  const firstItem = itemResponse?.itemsResult?.items?.[0];
  if (!firstItem?.asin) {
    return {
      error: "PRODUCT_NOT_FOUND",
      message: "Amazon did not return data for this ASIN.",
      asin: resolved.asin,
      marketplace: config.label
    };
  }

  const variationPages = [];
  let page = 1;
  let pageCount = 1;
  let variationSummary = null;

  do {
    const response = await creatorsRequest(env, config, "getVariations", {
      asin: resolved.asin,
      condition: "New",
      variationPage: page,
      resources: VARIATION_RESOURCES
    });

    const result = response?.variationsResult;
    variationPages.push(...(result?.items || []));
    variationSummary = result?.variationSummary || variationSummary;
    pageCount = Number(variationSummary?.pageCount || 1);
    page += 1;
  } while (page <= pageCount && page <= 100);

  const product = normalizeCreatorsProduct(itemResponse, {
    variationItems: variationPages,
    variationSummary
  });

  return {
    ok: true,
    sourceUrl: resolved.sourceUrl,
    resolvedUrl: resolved.resolvedUrl,
    marketplace: config.label,
    marketplaceDomain: config.domain,
    ...product
  };
}

function withUtf8ContentType(response, pathname) {
  const headers = new Headers(response.headers);
  const lowerPath = pathname.toLowerCase();

  if (lowerPath.endsWith(".html") || lowerPath === "/") {
    headers.set("content-type", "text/html; charset=utf-8");
  } else if (lowerPath.endsWith(".js") || lowerPath.endsWith(".mjs")) {
    headers.set("content-type", "application/javascript; charset=utf-8");
  } else if (lowerPath.endsWith(".css")) {
    headers.set("content-type", "text/css; charset=utf-8");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function fetchAsset(request, env, pathname) {
  const response = await env.ASSETS.fetch(request);
  return withUtf8ContentType(response, pathname);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,OPTIONS",
          "access-control-allow-headers": "content-type"
        }
      });
    }

    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "amazon-shopping-gateway" });
    }

    if (url.pathname === "/api/diagnostics/next") {
      if (request.method !== "GET") {
        return json({ error: "METHOD_NOT_ALLOWED", message: "Only GET requests are supported." }, 405);
      }

      const liveCheck = url.searchParams.get("live") === "1";
      const result = await getNextDiagnostics(env, liveCheck);
      return json(result, result.ok ? 200 : 503);
    }

    if (url.pathname === "/api/resolve-product") {
      if (request.method !== "GET") {
        return json({ error: "METHOD_NOT_ALLOWED", message: "Only GET requests are supported." }, 405);
      }

      const inputUrl = url.searchParams.get("url");
      if (!inputUrl) {
        return json({ error: "MISSING_URL", message: "The url query parameter is required." }, 400);
      }

      const result = await resolveAmazonInput(inputUrl);
      return json(result, result.ok ? 200 : 400);
    }

    if (url.pathname === "/api/product") {
      if (request.method !== "GET") {
        return json({ error: "METHOD_NOT_ALLOWED", message: "Only GET requests are supported." }, 405);
      }

      const inputUrl = url.searchParams.get("url");
      if (!inputUrl) {
        return json({ error: "MISSING_URL", message: "The url query parameter is required." }, 400);
      }

      try {
        const result = await fetchProduct(env, inputUrl);
        const status = result.ok ? 200 : ["CREATORS_API_NOT_CONFIGURED", "RAPIDAPI_NEXT_NOT_CONFIGURED"].includes(result.error) ? 503 : 400;
        return json(result, status);
      } catch (error) {
        return json({
          error: "PRODUCT_LOOKUP_FAILED",
          message: "Could not retrieve live product data.",
          detail: error instanceof Error ? error.message : String(error)
        }, 502);
      }
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const assetRequest = new Request(new URL("/index.html", url), request);
      return fetchAsset(assetRequest, env, "/index.html");
    }

    return fetchAsset(request, env, url.pathname);
  }
};
