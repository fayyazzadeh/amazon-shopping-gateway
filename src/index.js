import { fetchDirectProduct } from "./direct-product.js";

const SHORT_HOSTS = new Set(["amzn.to", "amzn.eu", "a.co"]);
const AMAZON_HOST_PATTERN = /(^|\.)amazon\.(com|ae|co\.uk)$/i;
const ASIN_PATTERNS = [
  /\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /\/gp\/product\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /\/gp\/aw\/d\/([A-Z0-9]{10})(?:[/?]|$)/i
];


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

async function getNextDiagnostics(_env, liveCheck) {
  if (!liveCheck) {
    return {
      ok: true,
      configured: true,
      liveChecked: false,
      provider: "Direct Next UK storefront",
      message: "Next lookup uses direct storefront requests and does not require RapidAPI credentials."
    };
  }

  const result = await fetchDirectProduct({
    sourceUrl: NEXT_DIAGNOSTIC_URL,
    resolvedUrl: NEXT_DIAGNOSTIC_URL,
    host: "www.next.co.uk",
    asin: null
  });
  return result.ok
    ? {
        ok: true,
        configured: true,
        liveChecked: true,
        provider: "Direct Next UK storefront",
        testProduct: {
          title: result.title || null,
          price: result.price || null,
          variationCount: result.variations.length
        },
        message: "The Worker fetched product metadata directly from Next UK."
      }
    : {
        ok: false,
        configured: true,
        liveChecked: true,
        provider: "Direct Next UK storefront",
        error: result.error,
        upstreamStatus: result.upstreamStatus || null,
        message: result.message
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

async function fetchProduct(env, inputUrl) {
  let resolved;
  if (isNextUrl(inputUrl)) {
    let source;
    try {
      source = new URL(inputUrl);
    } catch {
      return { error: "INVALID_URL", message: "The supplied URL is invalid." };
    }
    if (!NEXT_HOST_PATTERN.test(source.hostname.toLowerCase())) {
      return { error: "UNSUPPORTED_URL", message: "Only next.co.uk product URLs are supported." };
    }
    resolved = {
      ok: true,
      sourceUrl: source.toString(),
      resolvedUrl: source.toString(),
      host: source.hostname.toLowerCase(),
      asin: null
    };
  } else {
    resolved = await resolveAmazonInput(inputUrl);
    if (!resolved.ok) return resolved;
  }

  const product = await fetchDirectProduct(resolved);
  if (!product.ok) return product;
  product.pricing = buildCustomerPricing(product.price, env);
  product.variations = (product.variations || []).map((variation) => ({
    ...variation,
    pricing: buildCustomerPricing(variation.price, env)
  }));
  return product;
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
        const status = result.ok ? 200 : result.upstreamStatus ? 502 : ["DIRECT_FETCH_NETWORK_ERROR", "DIRECT_FETCH_BLOCKED", "DIRECT_FETCH_CHALLENGE"].includes(result.error) ? 503 : 400;
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
