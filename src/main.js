import "./style.css";

const app = document.querySelector("#app");

app.innerHTML = `
  <main class="page">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">A</span>
        <div>
          <strong>Amazon Shopping Gateway</strong>
          <small>سامانه واسط خرید</small>
        </div>
      </div>
      <span class="badge">نسخه آزمایشی</span>
    </header>

    <section class="hero">
      <span class="eyebrow">خرید ساده‌تر از آمازون</span>
      <h1>لینک محصول آمازون را وارد کنید</h1>
      <p>
        در این نسخه آزمایشی، لینک محصول را بررسی می‌کنیم و ASIN را از لینک‌های مستقیم
        استخراج می‌کنیم تا برای استعلام قیمت آماده شود.
      </p>

      <form id="product-form" class="card">
        <label for="amazon-url">لینک محصول Amazon</label>
        <div class="input-row">
          <input
            id="amazon-url"
            name="amazon-url"
            type="url"
            inputmode="url"
            placeholder="https://www.amazon.ae/dp/... یا https://www.amazon.com/dp/..."
            autocomplete="off"
            required
          />
          <button type="submit">بررسی محصول</button>
        </div>
        <p class="hint">فعلاً هیچ سفارش یا پرداختی انجام نمی‌شود.</p>
        <p class="hint">لینک‌های کوتاه Amazon مانند amzn.to، amzn.eu و a.co نیز قابل بررسی هستند.</p>
        <div id="result" class="result" hidden></div>
      </form>
    </section>

    <section class="features">
      <article>
        <span>01</span>
        <h2>تشخیص محصول</h2>
        <p>از لینک مستقیم، بازار و ASIN محصول را تشخیص می‌دهیم.</p>
      </article>
      <article>
        <span>02</span>
        <h2>استعلام قیمت</h2>
        <p>در مرحله بعد قیمت کالا، هزینه‌ها و تبدیل ارز به سیستم اضافه می‌شود.</p>
      </article>
      <article>
        <span>03</span>
        <h2>درخواست خرید</h2>
        <p>ثبت درخواست و اطلاع‌رسانی از طریق کانال‌های موردنظر قابل اضافه شدن است.</p>
      </article>
    </section>

    <footer>
      <span>Experimental project</span>
      <span>amazon-test.fayyazzadeh.ir</span>
    </footer>
  </main>
`;

function getMarketplace(host) {
  if (host === "amazon.ae" || host.endsWith(".amazon.ae")) return "Amazon UAE";
  if (host === "amazon.com" || host.endsWith(".amazon.com")) return "Amazon US";
  return "Amazon";
}

function extractAsin(pathname) {
  const patterns = [
    /\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i,
    /\/gp\/product\/([A-Z0-9]{10})(?:[/?]|$)/i,
    /\/gp\/aw\/d\/([A-Z0-9]{10})(?:[/?]|$)/i
  ];

  for (const pattern of patterns) {
    const match = pathname.match(pattern);
    if (match) return match[1].toUpperCase();
  }

  return null;
}

function isShortAmazonLink(host) {
  return host === "amzn.to" || host === "amzn.eu" || host === "a.co";
}

document.querySelector("#product-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const input = document.querySelector("#amazon-url");
  const result = document.querySelector("#result");

  let url;
  try {
    url = new URL(input.value.trim());
  } catch {
    result.hidden = false;
    result.className = "result error";
    result.textContent = "لطفاً یک لینک معتبر وارد کنید.";
    return;
  }

  const host = url.hostname.toLowerCase();
  const supported =
    host === "amazon.com" ||
    host.endsWith(".amazon.com") ||
    host === "amazon.ae" ||
    host.endsWith(".amazon.ae") ||
    isShortAmazonLink(host);

  result.hidden = false;

  if (!supported) {
    result.className = "result error";
    result.textContent = "در نسخه فعلی لینک‌های Amazon.com، Amazon.ae، amzn.to، amzn.eu و a.co پذیرفته می‌شوند.";
    return;
  }

  const asin = extractAsin(url.pathname);

  if (asin) {
    const marketplace = getMarketplace(host);
    result.className = "result success";
    result.innerHTML = `
      <strong>محصول شناسایی شد.</strong>
      <span>بازار: ${marketplace}</span>
      <span>ASIN: <code>${asin}</code></span>
      <span>مرحله بعد: دریافت اطلاعات و استعلام قیمت محصول.</span>
    `;
    return;
  }

  if (isShortAmazonLink(host)) {
    result.className = "result success";
    result.innerHTML = "<strong>در حال شناسایی محصول...</strong><span>لینک کوتاه در حال Resolve شدن است.</span>";

    try {
      const response = await fetch(`/api/resolve-product?url=${encodeURIComponent(url.toString())}`);
      const data = await response.json();

      if (!response.ok || !data.ok) {
        result.className = "result error";
        result.innerHTML = `
          <strong>محصول شناسایی نشد.</strong>
          <span>${data.message || "Resolve لینک کوتاه ناموفق بود."}</span>
        `;
        return;
      }

      result.className = "result success";
      result.innerHTML = `
        <strong>محصول شناسایی شد.</strong>
        <span>بازار: ${data.marketplace}</span>
        <span>ASIN: <code>${data.asin}</code></span>
        <span>لینک نهایی: <a href="${data.resolvedUrl}" target="_blank" rel="noreferrer">مشاهده محصول</a></span>
        <span>مرحله بعد: دریافت اطلاعات و استعلام قیمت محصول.</span>
      `;
    } catch {
      result.className = "result error";
      result.innerHTML = `
        <strong>ارتباط با API برقرار نشد.</strong>
        <span>لطفاً چند لحظه بعد دوباره تلاش کنید.</span>
      `;
    }
    return;
  }

  result.className = "result error";
  result.innerHTML = `
    <strong>لینک Amazon پذیرفته شد، اما ASIN پیدا نشد.</strong>
    <span>لطفاً لینک مستقیم صفحه محصول را وارد کنید.</span>
  `;
});
