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

app.innerHTML = `
  <main class="page">
    <header class="topbar">
      <a class="brand" href="#" aria-label="صفحه اصلی">
        <span class="brand-mark">A</span>
        <span class="brand-copy"><strong>Amazon Shopping Gateway</strong><small>خرید از آمازون، ساده‌تر</small></span>
      </a>
      <nav class="nav" aria-label="ناوبری اصلی">
        <a href="#how">نحوه خرید</a>
        <a href="#faq">سؤالات متداول</a>
        <a class="nav-order" href="#order">پیگیری سفارش</a>
      </nav>
    </header>

    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">خرید از Amazon.com و Amazon.ae</span>
        <h1>محصولت را از آمازون پیدا کن، <em>ما بقیه مسیر را ساده می‌کنیم.</em></h1>
        <p>لینک محصول را وارد کن تا اطلاعات کالا، مدل‌ها، سایزها و قیمت تقریبی آن برای بررسی سفارش آماده شود.</p>
      </div>

      <form id="product-form" class="search-card">
        <label for="amazon-url">لینک محصول آمازون</label>
        <div class="input-row">
          <input id="amazon-url" name="amazon-url" type="url" inputmode="url" placeholder="https://www.amazon.com/dp/..." autocomplete="off" required />
          <button type="submit"><span>بررسی محصول</span><b>←</b></button>
        </div>
        <div class="supported"><span>پشتیبانی از</span><b>Amazon.com</b><b>Amazon.ae</b><b>amzn.to</b><b>a.co</b></div>
        <div id="result" class="result" hidden></div>
      </form>
    </section>

    <section id="product-preview" class="product-shell" hidden>
      <div class="section-kicker"><span>اطلاعات محصول</span><small id="product-source-label">محصول انتخاب‌شده</small></div>
      <div class="product-layout">
        <div class="gallery-panel">
          <div class="demo-badge" id="product-badge">PRODUCT</div>
          <div class="product-visual" id="product-visual" aria-label="تصویر نمونه محصول">
            <div class="shirt shirt-back"></div><div class="shirt shirt-front"><span>BOSS</span></div>
          </div>
          <div class="thumbs"><button class="thumb active" type="button">1</button><button class="thumb" type="button">2</button><button class="thumb" type="button">3</button></div>
        </div>

        <div class="product-info">
          <div class="store-link" id="product-store">Amazon Store</div>
          <h2 id="product-title"></h2>
          <div class="rating"><strong id="product-rating">—</strong><span>★★★★★</span><a id="product-reviews" href="#reviews">(اطلاعات در انتظار است)</a></div>

          <div class="divider"></div>

          <div class="option-block">
            <div class="option-title">مدل‌ها و گزینه‌ها</div>
            <div id="variation-status" class="variation-status">برای نمایش دقیق رنگ، سایز، تصویر، قیمت و Child ASIN باید اطلاعات واقعی محصول دریافت شود.</div>
            <div id="color-options" class="color-options"></div>
            <div id="size-options" class="size-options"></div>
          </div>

          <div class="availability-note"><span class="dot"></span><span id="availability-text">وضعیت موجودی، ارسال و فروشنده پس از دریافت اطلاعات واقعی Amazon بررسی می‌شود.</span></div>

          <div class="detail-grid">
            <div><span>برند</span><strong id="product-brand">—</strong></div>
            <div><span>نوع</span><strong>پوشاک</strong></div>
            <div><span>مبدأ</span><strong>Amazon</strong></div>
          </div>
        </div>

        <aside id="order" class="price-panel">
          <span class="panel-label">محاسبه سفارش</span>
          <div class="sample-price"><small>قیمت Amazon</small><strong id="selected-price">—</strong></div>
          <div class="price-lines">
            <div><span>قیمت کالا</span><b id="line-product">—</b></div>
            <div><span>حمل و خدمات</span><b>پس از استعلام</b></div>
            <div><span>کارمزد خرید</span><b>پس از استعلام</b></div>
          </div>
          <div class="price-total"><span>قیمت نهایی</span><strong>پس از استعلام</strong></div>
          <button class="primary-cta" type="button">ادامه و استعلام قیمت <span>←</span></button>
          <p>در این مرحله پرداختی انجام نمی‌شود.</p>
        </aside>
      </div>
    </section>

    <section id="how" class="steps">
      <div class="section-kicker"><span>فرآیند خرید</span><small>از لینک تا ثبت سفارش</small></div>
      <div class="step-grid">
        <article><b>01</b><h3>لینک را وارد کن</h3><p>لینک مستقیم یا لینک کوتاه Amazon را در سایت قرار بده.</p></article>
        <article><b>02</b><h3>مدل را انتخاب کن</h3><p>رنگ، سایز و سایر Variationهای محصول را انتخاب کن.</p></article>
        <article><b>03</b><h3>قیمت را ببین</h3><p>قیمت کالا، حمل، کارمزد و تبدیل ارز محاسبه می‌شود.</p></article>
        <article><b>04</b><h3>درخواست خرید</h3><p>پس از تأیید، اطلاعات سفارش و پیگیری آن ثبت خواهد شد.</p></article>
      </div>
    </section>

    <footer id="faq"><span>Amazon Shopping Gateway</span><span>نسخه طراحی اولیه</span></footer>
  </main>
`;

function getMarketplace(host) {
  if (host === "amazon.ae" || host.endsWith(".amazon.ae")) return "Amazon UAE";
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
    "Variationهای واقعی محصول هنوز از منبع Amazon دریافت نشده‌اند؛ برای جلوگیری از نمایش اطلاعات اشتباه، گزینه‌های نمونه نمایش داده نمی‌شوند.";
}

function showProduct(asin, marketplace, resolvedUrl = "", sourceUrl = "") {
  const result = document.querySelector("#result");
  const productUrl = resolvedUrl || sourceUrl;
  const parsed = productUrl ? new URL(productUrl) : null;
  const title = parsed ? slugToTitle(parsed.pathname) : "محصول Amazon";
  currentProduct = { asin, marketplace, url: productUrl, title };

  result.hidden = false;
  result.className = "result success";
  result.innerHTML = `<strong>محصول انتخاب‌شده شناسایی شد</strong><span>بازار: ${marketplace}</span><span>ASIN: <code>${asin}</code></span>${productUrl ? `<span><a href="${productUrl}" target="_blank" rel="noreferrer">مشاهده محصول در Amazon</a></span>` : ""}`;

  document.querySelector("#product-title").textContent = title;
  document.querySelector("#product-store").textContent = `Amazon Store · ${marketplace}`;
  document.querySelector("#product-brand").textContent = "در حال دریافت";
  document.querySelector("#product-rating").textContent = "—";
  document.querySelector("#product-reviews").textContent = "(در انتظار اطلاعات)";
  document.querySelector("#selected-price").textContent = "—";
  document.querySelector("#line-product").textContent = "—";
  document.querySelector("#product-source-label").textContent = `ASIN ${asin} · ${marketplace}`;
  document.querySelector("#product-badge").textContent = "SELECTED";
  document.querySelector("#product-preview").hidden = false;
  renderVariations();
  document.querySelector("#product-preview").scrollIntoView({ behavior: "smooth", block: "start" });
}

