const state = {
  product: null,
  selectedAttributes: {}
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setResult(type, html) {
  const result = document.querySelector("#result");
  result.hidden = false;
  result.className = "result " + type;
  result.innerHTML = html;
}

function selectedVariation() {
  const variations = state.product?.variations || [];
  return variations.find((variation) =>
    Object.entries(state.selectedAttributes).every(([name, value]) => variation.attributes?.[name] === value)
  ) || variations.find((variation) => variation.asin === state.product.asin) || variations[0] || null;
}

function optionAvailable(name, value) {
  return (state.product?.variations || []).some((variation) =>
    variation.attributes?.[name] === value &&
    Object.entries(state.selectedAttributes).every(([key, selected]) =>
      key === name || variation.attributes?.[key] === selected
    )
  );
}

function renderGallery(variation) {
  const visual = document.querySelector("#product-visual");
  const image = variation?.image || state.product?.image;

  if (image) {
    visual.innerHTML = '<img class="amazon-product-image" src="' + escapeHtml(image) +
      '" alt="' + escapeHtml(state.product.title || "Amazon product") + '" />';
  } else {
    visual.innerHTML = '<div class="image-placeholder">The store did not return a product image</div>';
  }
}

function renderVariations() {
  const colorRoot = document.querySelector("#color-options");
  const sizeRoot = document.querySelector("#size-options");
  const dimensions = state.product?.dimensions || [];
  colorRoot.innerHTML = "";
  sizeRoot.innerHTML = "";

  dimensions.forEach((dimension) => {
    const wrapper = document.createElement("div");
    wrapper.className = "dimension-block";
    wrapper.innerHTML =
      '<div class="dimension-title"><strong>' + escapeHtml(dimension.displayName) +
      '</strong><span>' + escapeHtml(state.selectedAttributes[dimension.name] || "Not selected") +
      '</span></div><div class="dimension-options"></div>';

    const options = wrapper.querySelector(".dimension-options");
    (dimension.values || []).forEach((value) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dimension-option" +
        (state.selectedAttributes[dimension.name] === value ? " selected" : "");
      button.textContent = value;
      button.disabled = !optionAvailable(dimension.name, value);
      button.addEventListener("click", () => {
        state.selectedAttributes[dimension.name] = value;
        renderVariations();
        updateSelection();
      });
      options.appendChild(button);
    });

    (dimension.name === "Color" ? colorRoot : sizeRoot).appendChild(wrapper);
  });
}

function formatCustomerPrice(product) {
  const pricing = product?.pricing;
  if (!pricing?.configured) return "Exchange rate not configured";
  return new Intl.NumberFormat("en-US").format(pricing.customerAmount) + " IRR";
}

function updateSelection() {
  const variation = selectedVariation();
  if (!variation) {
    const rootPrice = state.product?.price;
    const price = rootPrice?.displayAmount || (rootPrice ? rootPrice.amount + " " + rootPrice.currency : "—");
    document.querySelector("#selected-price").textContent = price;
    document.querySelector("#line-product").textContent = price;
    document.querySelector("#availability-text").textContent = state.product?.availability || "The store has not provided availability information.";
    renderGallery(state.product);
    return;
  }

  const price = variation.price?.displayAmount ||
    (variation.price ? variation.price.amount + " " + variation.price.currency : "—");

  document.querySelector("#selected-price").textContent = price;
  document.querySelector("#line-product").textContent = price;
  const total = document.querySelector(".price-total strong");
  if (total) total.textContent = formatCustomerPrice(variation);
  const selectedAsin = document.querySelector("#selected-asin");
  if (selectedAsin) selectedAsin.textContent = variation.asin || "—";
  document.querySelector("#availability-text").textContent =
    variation.availability || "The store has not provided availability information.";
  renderGallery(variation);
}

function renderProduct(product) {
  state.product = product;
  state.selectedAttributes = {};

  const initial = product.variations?.find((variation) => variation.asin === product.asin) ||
    product.variations?.[0];
  if (initial) state.selectedAttributes = { ...initial.attributes };

  document.querySelector("#product-title").textContent = product.title || "Amazon / Next product";
  document.querySelector("#product-store").textContent = "Store · " + product.marketplace;
  document.querySelector("#product-brand").textContent = product.brand || "—";
  document.querySelector("#product-rating").textContent = product.rating || "—";
  document.querySelector("#product-reviews").textContent =
    product.reviewCount ? "(" + product.reviewCount + " reviews)" : "Rating unavailable";
  const identifierLabel = product.marketplace === "Next UK" ? "Item" : "Child ASIN";
  document.querySelector("#product-source-label").textContent =
    (product.marketplace === "Next UK" ? "Style " : "Parent ") +
    (product.parentAsin || "—") + " · " + (product.variations?.length || 0) + " " + identifierLabel;
  document.querySelector("#product-badge").textContent = "LIVE";
  document.querySelector("#variation-status").textContent =
    (product.variations?.length || 0) + " " + identifierLabel + " options retrieved from the store.";
  document.querySelector("#product-parent-asin").textContent = product.parentAsin || "—";
  document.querySelector("#product-variation-count").textContent =
    String(product.variations?.length || 0);
  document.querySelector("#product-preview").hidden = false;

  renderVariations();
  updateSelection();
}

async function loadProduct(inputUrl) {
  setResult("loading", "<strong>Loading live product data…</strong><span>Retrieving product details and available Amazon variations.</span>");

  const response = await fetch("/api/product?url=" + encodeURIComponent(inputUrl), {
    headers: { accept: "application/json" }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    const hint = data.error === "CREATORS_API_NOT_CONFIGURED"
      ? "<span>Configure Amazon Creators API credentials in the Worker first.</span>"
      : data.error === "RAPIDAPI_NEXT_NOT_CONFIGURED"
        ? "<span>Configure RAPIDAPI_KEY, RAPIDAPI_NEXT_HOST, and RAPIDAPI_NEXT_ENDPOINT in the Worker first.</span>"
        : "";
    setResult("error", "<strong>" + escapeHtml(data.message || "Could not retrieve product information.") + "</strong>" + hint);
    return;
  }

  setResult(
    "success",
    "<strong>Live product found</strong>" +
    "<span>بازار: " + escapeHtml(data.marketplace) + "</span>" +
    "<span>" + escapeHtml(data.marketplace === "Next UK" ? "Style Number" : "Parent ASIN") + ": <code>" + escapeHtml(data.parentAsin || "—") + "</code></span>" +
    "<span>" + escapeHtml(data.marketplace === "Next UK" ? "Size Options" : "Child ASIN") + ": <code>" + escapeHtml(String(data.variations?.length || 0)) + " options</code></span>"
  );

  renderProduct(data);
  document.querySelector("#product-preview").scrollIntoView({ behavior: "smooth", block: "start" });
}

document.querySelector("#product-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.querySelector("#amazon-url").value.trim();
  if (!input) return;

  try {
    await loadProduct(input);
  } catch (error) {
    setResult("error",
      "<strong>Could not connect to the product data service.</strong><span>" +
      escapeHtml(error instanceof Error ? error.message : String(error)) +
      "</span>"
    );
  }
});
