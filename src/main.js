import "./style.css";

const app = document.querySelector("#app");

const demoProduct = {
  title: "BOSS Men's Logo Embroidered Cotton Tee 3 Pack",
  brand: "BOSS",
  rating: "4.4",
  reviews: "2,467",
  colors: [
    { id: "black", name: "Black", price: "$39.64", available: true },
    { id: "white", name: "Bright White", price: "$42.00", available: true },
    { id: "navy", name: "Navy", price: "$46.00", available: true },
    { id: "gray", name: "Gray", price: "$45.95", available: true },
    { id: "purple", name: "Purple", price: "$37.05", available: false },
  ],
  sizes: ["Small", "Medium", "Large", "X-Large", "XX-Large"],
};

let currentProduct = null;

function sourcePrice(product) {
  const p = product?.price;
  return p?.displayAmount || (p ? p.amount + " " + p.currency : "—");
}

function customerPrice(product) {
  const p = product?.pricing;
  if (!p?.configured) return "Exchange rate not configured";
  return new Intl.NumberFormat("en-US").format(p.customerAmount) + " IRR";
}

function applyGatewayProduct(data) {
  const product = data;
  document.querySelector("#product-origin").textContent = data.marketplace || "—";
  document.querySelector("#selected-price").textContent = sourcePrice(product);
  document.querySelector("#line-product").textContent = sourcePrice(product);
  const total = document.querySelector(".price-total strong");
  if (total) total.textContent = customerPrice(product);
  const cta = document.querySelector(".primary-cta");
  if (cta) cta.textContent = "Continue to price estimate →";
}

app.innerHTML = `
  <main class="page">
    <header class="topbar">
      <a class="brand" href="#" aria-label="Home">
        <span class="brand-mark">A</span>
        <span class="brand-copy"><strong>Amazon Shopping Gateway</strong><small>Shopping from Amazon and Next, made simpler</small></span>
      </a>
      <nav class="nav" aria-label="Main navigation">
        <a href="#how">How it works</a>
        <a href="#faq">FAQ</a>
        <a class="nav-order" href="#order">Order inquiry</a>
      </nav>
    </header>

    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">Shop Amazon.com, Amazon.co.uk, Amazon.ae, and Next.co.uk</span>
        <h1>Find your product on Amazon. <em>We make the rest simple.</em></h1>
        <p>Paste a product link to review item details, variants, sizes, and an estimated price before placing an order.</p>
      </div>

      <form id="product-form" class="search-card">
        <label for="amazon-url">Amazon or Next product URL</label>
        <div class="input-row">
          <input id="amazon-url" name="amazon-url" type="url" inputmode="url" placeholder="https://www.amazon.com/dp/... or https://www.next.co.uk/style/..." autocomplete="off" required />
          <button type="submit"><span>Check product</span><b>←</b></button>
        </div>
        <div class="supported"><span>Supported stores:</span><b>Amazon.com</b><b>Amazon.ae</b><b>Next.co.uk</b><b>amzn.to</b><b>a.co</b></div>
        <div id="result" class="result" hidden></div>
      </form>
    </section>

    <section id="product-preview" class="product-shell" hidden>
      <div class="section-kicker"><span>Product details</span><small id="product-source-label">Selected product</small></div>
      <div class="product-layout">
        <div class="gallery-panel">
          <div class="demo-badge" id="product-badge">PRODUCT</div>
          <div class="product-visual" id="product-visual" aria-label="Product image">
            <div class="shirt shirt-back"></div><div class="shirt shirt-front"><span>BOSS</span></div>
          </div>
          <div class="thumbs"><button class="thumb active" type="button">1</button><button class="thumb" type="button">2</button><button class="thumb" type="button">3</button></div>
        </div>

        <div class="product-info">
          <div class="store-link" id="product-store">Amazon Store</div>
          <h2 id="product-title"></h2>
          <div class="rating"><strong id="product-rating">—</strong><span>★★★★★</span><a id="product-reviews" href="#reviews">(Reviews pending)</a></div>

          <div class="divider"></div>

          <div class="option-block">
            <div class="option-title">Variants and options</div>
            <div id="variation-status" class="variation-status">Live product data is required to show accurate colors, sizes, images, prices, and Child ASINs.</div>
            <div id="color-options" class="color-options"></div>
            <div id="size-options" class="size-options"></div>
          </div>

          <div class="availability-note"><span class="dot"></span><span id="availability-text">Availability, shipping, and seller details will be checked when live Amazon data is available.</span></div>

          <div class="detail-grid">
            <div><span>Brand</span><strong id="product-brand">—</strong></div>
            <div><span>Category</span><strong>Apparel</strong></div>
            <div><span>Marketplace</span><strong id="product-origin">—</strong></div>
          </div>
        </div>

        <aside id="order" class="price-panel">
          <span class="panel-label">Order estimate</span>
          <div class="sample-price"><small>Amazon price</small><strong id="selected-price">—</strong></div>
          <div class="price-lines">
            <div><span>Item price</span><b id="line-product">—</b></div>
            <div><span>Shipping and service</span><b>Quote required</b></div>
            <div><span>Purchase service fee</span><b>Quote required</b></div>
          </div>
          <div class="price-total"><span>Estimated total</span><strong>Quote required</strong></div>
          <button class="primary-cta" type="button">Continue to price estimate <span>→</span></button>
          <p>No payment is taken at this stage.</p>
        </aside>
      </div>
    </section>

    <section id="how" class="steps">
      <div class="section-kicker"><span>How it works</span><small>From product link to order request</small></div>
      <div class="step-grid">
        <article><b>01</b><h3>Paste a link</h3><p>Paste a direct Amazon product link or a supported short link.</p></article>
        <article><b>02</b><h3>Choose options</h3><p>Select available colors, sizes, and other product variations.</p></article>
        <article><b>03</b><h3>Review the estimate</h3><p>Item price, shipping, service fees, and currency conversion are estimated.</p></article>
        <article><b>04</b><h3>Request a purchase</h3><p>After confirmation, your purchase request can be recorded for follow-up.</p></article>
      </div>
    </section>

    <footer id="faq"><span>Amazon Shopping Gateway</span><span>Initial design preview</span></footer>
  </main>
`;

function getMarketplace(host) {
  if (host === "amazon.ae" || host.endsWith(".amazon.ae")) return "Amazon UAE";
  if (host === "amazon.co.uk" || host.endsWith(".amazon.co.uk")) return "Amazon UK";
  if (host === "amazon.com" || host.endsWith(".amazon.com")) return "Amazon US";
  return "Amazon";
}

function extractAsin(pathname) {
  for (const pattern of [/\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i, /\/gp\/product\/([A-Z0-9]{10})(?:[/?]|$)/i, /\/gp\/aw\/d\/([A-Z0-9]{10})(?:[/?]|$)/i]) {
    const match = pathname.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  return null;
}

function isShortAmazonLink(host) {
  return host === "amzn.to" || host === "amzn.eu" || host === "a.co";
}

function slugToTitle(pathname) {
  const segment = pathname.split("/").filter(Boolean).pop() || "";
  return decodeURIComponent(segment)
    .replace(/-/g, " ")
    .replace(/\\b\\w/g, char => char.toUpperCase())
    .trim();
}

function renderVariations() {
  const colorRoot = document.querySelector("#color-options");
  const sizeRoot = document.querySelector("#size-options");
  colorRoot.innerHTML = "";
  sizeRoot.innerHTML = "";
  document.querySelector("#variation-status").textContent =
    "Live product variations have not been retrieved from Amazon yet. Sample options are hidden to avoid showing inaccurate information.";
}

function showProduct(asin, marketplace, resolvedUrl = "", sourceUrl = "") {
  const result = document.querySelector("#result");
  const productUrl = resolvedUrl || sourceUrl;
  const parsed = productUrl ? new URL(productUrl) : null;
  const title = parsed ? slugToTitle(parsed.pathname) : "Amazon product";
  currentProduct = { asin, marketplace, url: productUrl, title };

  result.hidden = false;
  result.className = "result success";
  result.innerHTML = `<strong>Product link recognized</strong><span>Marketplace: ${marketplace}</span><span>ASIN: <code>${asin}</code></span>${productUrl ? `<span><a href="${productUrl}" target="_blank" rel="noreferrer">View product on Amazon</a></span>` : ""}`;

  document.querySelector("#product-title").textContent = title;
  document.querySelector("#product-store").textContent = `Amazon Store · ${marketplace}`;
  document.querySelector("#product-brand").textContent = "Loading…";
  document.querySelector("#product-rating").textContent = "—";
  document.querySelector("#product-reviews").textContent = "(Awaiting data)";
  document.querySelector("#selected-price").textContent = "—";
  document.querySelector("#line-product").textContent = "—";
  document.querySelector("#product-source-label").textContent = `ASIN ${asin} · ${marketplace}`;
  document.querySelector("#product-badge").textContent = "SELECTED";
  document.querySelector("#product-preview").hidden = false;
  renderVariations();
  document.querySelector("#product-preview").scrollIntoView({ behavior: "smooth", block: "start" });
}

