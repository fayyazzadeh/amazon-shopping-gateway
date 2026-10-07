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
    visual.innerHTML = '<div class="image-placeholder">تصویر محصول از Amazon برنگردانده شد</div>';
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
      '</strong><span>' + escapeHtml(state.selectedAttributes[dimension.name] || "انتخاب نشده") +
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

    colorRoot.appendChild(wrapper);
  });
}

function updateSelection() {
  const variation = selectedVariation();
  if (!variation) {
    const rootPrice = state.product?.price;
    const price = rootPrice?.displayAmount || (rootPrice ? rootPrice.amount + " " + rootPrice.currency : "—");
    document.querySelector("#selected-price").textContent = price;
    document.querySelector("#line-product").textContent = price;
    document.querySelector("#availability-text").textContent = state.product?.availability || "وضعیت موجودی توسط Amazon اعلام نشده است.";
    renderGallery(state.product);
    return;
  }

  const price = variation.price?.displayAmount ||
    (variation.price ? variation.price.amount + " " + variation.price.currency : "—");

  document.querySelector("#selected-price").textContent = price;
  document.querySelector("#line-product").textContent = price;
  const selectedAsin = document.querySelector("#selected-asin");
  if (selectedAsin) selectedAsin.textContent = variation.asin || "—";
  document.querySelector("#availability-text").textContent =
    variation.availability || "وضعیت موجودی توسط Amazon اعلام نشده است.";
  renderGallery(variation);
}

function renderProduct(product) {
  state.product = product;
  state.selectedAttributes = {};

  const initial = product.variations?.find((variation) => variation.asin === product.asin) ||
    product.variations?.[0];
  if (initial) state.selectedAttributes = { ...initial.attributes };

  document.querySelector("#product-title").textContent = product.title || "محصول Amazon";
  document.querySelector("#product-store").textContent = "Amazon Store · " + product.marketplace;
  document.querySelector("#product-brand").textContent = product.brand || "—";
  document.querySelector("#product-rating").textContent = product.rating || "—";
  document.querySelector("#product-reviews").textContent =
    product.reviewCount ? "(" + product.reviewCount + " نظر)" : "امتیاز در دسترس نیست";
  document.querySelector("#product-source-label").textContent =
    "Parent " + (product.parentAsin || "—") + " · " + (product.variations?.length || 0) + " Child ASIN";
  document.querySelector("#product-badge").textContent = "LIVE";
  document.querySelector("#variation-status").textContent =
    (product.variations?.length || 0) + " Child ASIN از Amazon دریافت شد.";
  document.querySelector("#product-parent-asin").textContent = product.parentAsin || "—";
  document.querySelector("#product-variation-count").textContent =
    String(product.variations?.length || 0);
  document.querySelector("#product-preview").hidden = false;

  renderVariations();
  updateSelection();
}

async function loadProduct(inputUrl) {
  setResult("loading", "<strong>در حال دریافت اطلاعات واقعی محصول…</strong><span>اطلاعات محصول و Variationهای Amazon در حال بررسی است.</span>");

  const response = await fetch("/api/product?url=" + encodeURIComponent(inputUrl), {
    headers: { accept: "application/json" }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    const hint = data.error === "CREATORS_API_NOT_CONFIGURED"
      ? "<span>ابتدا دسترسی Amazon Creators API روی Worker تنظیم شود.</span>"
      : "";
    setResult("error", "<strong>" + escapeHtml(data.message || "دریافت اطلاعات محصول ناموفق بود.") + "</strong>" + hint);
    return;
  }

  setResult(
    "success",
    "<strong>محصول واقعی شناسایی شد</strong>" +
    "<span>بازار: " + escapeHtml(data.marketplace) + "</span>" +
    "<span>Parent ASIN: <code>" + escapeHtml(data.parentAsin || "—") + "</code></span>" +
    "<span>Child ASIN: <code>" + escapeHtml(String(data.variations?.length || 0)) + " مورد</code></span>"
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
      "<strong>ارتباط با سرویس اطلاعات محصول ناموفق بود.</strong><span>" +
      escapeHtml(error instanceof Error ? error.message : String(error)) +
      "</span>"
    );
  }
});
