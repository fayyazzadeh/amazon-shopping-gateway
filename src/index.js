const SHORT_HOSTS = new Set(["amzn.to", "amzn.eu", "a.co"]);
const AMAZON_HOST_PATTERN = /(^|\.)amazon\.(com|ae)$/i;
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

function marketplace(host) {
  if (host === "amazon.ae" || host.endsWith(".amazon.ae")) return "Amazon UAE";
  if (host === "amazon.com" || host.endsWith(".amazon.com")) return "Amazon US";
  return "Amazon";
}

function isAllowedShortUrl(url) {
  return url.protocol === "https:" && SHORT_HOSTS.has(url.hostname.toLowerCase());
}

async function resolveShortUrl(inputUrl) {
  let source;
  try {
    source = new URL(inputUrl);
  } catch {
    return { error: "INVALID_URL", message: "لینک واردشده معتبر نیست." };
  }

  if (!isAllowedShortUrl(source)) {
    return {
      error: "UNSUPPORTED_URL",
      message: "فقط لینک‌های کوتاه amzn.to، amzn.eu و a.co قابل Resolve هستند."
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
    return { error: "RESOLVE_FAILED", message: "اتصال به لینک کوتاه یا مقصد آن ناموفق بود." };
  }

  const finalUrl = new URL(response.url || source.toString());
  const finalHost = finalUrl.hostname.toLowerCase();

  if (!AMAZON_HOST_PATTERN.test(finalHost)) {
    return {
      error: "UNSAFE_DESTINATION",
      message: "لینک کوتاه به یک دامنه Amazon هدایت نشد."
    };
  }

  const asin = extractAsin(finalUrl.pathname);
  if (!asin) {
    return {
      error: "ASIN_NOT_FOUND",
      message: "لینک به Amazon رسید، اما ASIN از آدرس نهایی قابل استخراج نبود.",
      resolvedUrl: finalUrl.toString()
    };
  }

  return {
    ok: true,
    sourceUrl: source.toString(),
    resolvedUrl: finalUrl.toString(),
    marketplace: marketplace(finalHost),
    asin
  };
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

    if (url.pathname === "/api/resolve-product") {
      if (request.method !== "GET") {
        return json({ error: "METHOD_NOT_ALLOWED", message: "فقط GET پشتیبانی می‌شود." }, 405);
      }

      const inputUrl = url.searchParams.get("url");
      if (!inputUrl) {
        return json({ error: "MISSING_URL", message: "پارامتر url الزامی است." }, 400);
      }

      const result = await resolveShortUrl(inputUrl);
      return json(result, result.ok ? 200 : 400);
    }

    return env.ASSETS.fetch(request);
  }
};
