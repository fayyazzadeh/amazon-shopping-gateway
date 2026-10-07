function firstListing(item) {
  return item?.offersV2?.listings?.[0] ?? null;
}

function readPrice(listing) {
  const money = listing?.price?.money;
  if (!money || typeof money.amount !== "number") return null;
  return {
    amount: money.amount,
    currency: money.currency ?? null,
    displayAmount: money.displayAmount ?? null
  };
}

function readImage(item) {
  return item?.images?.primary?.large?.url
    ?? item?.images?.primary?.medium?.url
    ?? item?.images?.primary?.small?.url
    ?? null;
}

function normalizeVariation(item) {
  const listing = firstListing(item);
  return {
    asin: item?.asin ?? null,
    title: item?.itemInfo?.title?.displayValue ?? null,
    attributes: Object.fromEntries(
      (item?.variationAttributes ?? [])
        .filter((attribute) => attribute?.name && attribute?.value != null)
        .map((attribute) => [attribute.name, attribute.value])
    ),
    image: readImage(item),
    price: readPrice(listing),
    availability: listing?.availability?.type ?? null,
    merchant: listing?.merchantInfo?.name ?? null,
    url: item?.detailPageURL ?? null
  };
}

export function normalizeCreatorsProduct(itemResponse, { variationItems = [], variationSummary = null } = {}) {
  const item = itemResponse?.itemsResult?.items?.[0] ?? null;
  if (!item?.asin) throw new Error("CREATORS_API_ITEM_NOT_FOUND");

  const listing = firstListing(item);
  return {
    asin: item.asin,
    parentAsin: item.parentASIN ?? null,
    title: item.itemInfo?.title?.displayValue ?? null,
    brand: item.itemInfo?.byLineInfo?.brand?.displayValue ?? null,
    image: readImage(item),
    rating: null,
    reviewCount: null,
    price: readPrice(listing),
    availability: listing?.availability?.type ?? null,
    merchant: listing?.merchantInfo?.name ?? null,
    url: item.detailPageURL ?? null,
    dimensions: (variationSummary?.variationDimensions ?? []).map((dimension) => ({
      name: dimension.name,
      displayName: dimension.displayName ?? dimension.name,
      values: Array.isArray(dimension.values) ? dimension.values : []
    })),
    variations: variationItems.map(normalizeVariation).filter((variation) => variation.asin)
  };
}
