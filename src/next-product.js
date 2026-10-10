function firstProduct(payload) {
  if (Array.isArray(payload?.data)) return payload.data[0] ?? null;
  if (payload?.data && typeof payload.data === "object") return payload.data;
  return null;
}

function absoluteNextImage(path) {
  if (!path) return null;
  const value = String(path);
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return value.startsWith("/") ? "https://xcdn.next.co.uk" + value : value;
}

function normalizeMoney(amount, displayAmount = null, currency = "GBP") {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return null;
  return { amount: numeric, currency, displayAmount: displayAmount ?? (currency === "GBP" ? "£" + numeric : String(numeric)) };
}

function normalizeSizeOption(option, product, index) {
  const price = normalizeMoney(option?.price_unformatted ?? product?.price_data?.price?.min_price, option?.price ?? product?.price, product?.currency_code ?? "GBP");
  const id = `${product?.item_number ?? "next-item"}-${option?.value ?? index + 1}`;
  return {
    asin: id, variantId: id, itemNumber: product?.item_number ?? null, title: product?.title ?? null,
    attributes: { Color: product?.colour ?? null, Fit: product?.fit ?? null, Size: option?.name ?? option?.value ?? null },
    image: absoluteNextImage(product?.item_media?.find?.((media) => media?.is_hero_image)?.image_url ?? product?.item_media?.[0]?.image_url),
    price, availability: option?.stock_status ?? null, merchant: "Next", url: product?.url ?? null
  };
}

export function normalizeNextProduct(payload, sourceUrl) {
  const product = firstProduct(payload);
  if (!product) return { asin: null, parentAsin: null, identifierType: "next_item_number", itemNumber: null, styleNumber: null, productCode: null, title: "Next product", brand: "Next", image: null, images: [], price: null, wasPrice: null, salePrice: null, availability: null, merchant: "Next", url: sourceUrl, dimensions: [], variations: [] };
  const currency = product.currency_code ?? "GBP";
  const basePrice = product?.price_data?.price?.min_price;
  const salePrice = product?.price_data?.sale_price;
  const wasPrice = product?.price_data?.was_price ?? product?.was_price;
  const effectivePrice = salePrice != null ? salePrice : basePrice;
  const price = normalizeMoney(effectivePrice, product.price, currency);
  const media = Array.isArray(product.item_media) ? product.item_media : [];
  const images = media.map((item) => absoluteNextImage(item?.image_url)).filter(Boolean);
  const sizeOptions = Array.isArray(product?.options?.options) ? product.options.options : [];
  const variations = sizeOptions.map((option, index) => normalizeSizeOption(option, product, index));
  const colours = Array.isArray(product?.fits_and_colourways?.colourways?.colourways) ? product.fits_and_colourways.colourways.colourways : [];
  const fits = Array.isArray(product?.fits_and_colourways?.fits) ? product.fits_and_colourways.fits : [];
  const colourValues = [...new Set([product.colour, ...colours.map((item) => item?.display_text)].filter(Boolean))];
  const fitValues = [...new Set([product.fit, ...fits.map((item) => item?.display_text)].filter(Boolean))];
  const sizeValues = [...new Set(sizeOptions.map((option) => option?.name ?? option?.value).filter(Boolean))];
  const dimensions = [];
  if (colourValues.length) dimensions.push({ name: "Color", displayName: "Colour", values: colourValues });
  if (fitValues.length) dimensions.push({ name: "Fit", displayName: "Fit", values: fitValues });
  if (sizeValues.length) dimensions.push({ name: "Size", displayName: "Size", values: sizeValues });
  return { asin: product.item_number ?? null, parentAsin: product.style_number ?? null, identifierType: "next_item_number", itemNumber: product.item_number ?? null, styleNumber: product.style_number ?? null, productCode: product.product_code ?? null, title: product.title ?? "Next product", brand: product.brand ?? "Next", image: images[0] ?? null, images, description: product.item_description ?? null, category: product.category ?? null, collection: product.collection ?? null, department: product.department ?? null, gender: product.gender ?? null, colour: product.colour ?? null, fit: product.fit ?? null, rating: null, reviewCount: null, price, wasPrice: normalizeMoney(wasPrice, wasPrice != null ? "£" + wasPrice : null, currency), salePrice: normalizeMoney(salePrice, salePrice != null ? "£" + salePrice : null, currency), availability: sizeOptions.some((option) => option?.stock_status === "InStock") ? "In stock" : "Out of stock", merchant: "Next", url: sourceUrl, dimensions, variations, availableForCollectInStore: Boolean(product.available_for_collect_in_store), offerType: product.offer_type ?? null, fits, colours };
}