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
        در این نسخه آزمایشی، لینک محصول را بررسی می‌کنیم و ساختار لازم برای
        استعلام قیمت و ثبت درخواست خرید را آماده می‌کنیم.
      </p>

      <form id="product-form" class="card">
        <label for="amazon-url">لینک محصول Amazon</label>
        <div class="input-row">
          <input
            id="amazon-url"
            name="amazon-url"
            type="url"
            inputmode="url"
            placeholder="https://www.amazon.com/dp/..."
            autocomplete="off"
            required
          />
          <button type="submit">بررسی محصول</button>
        </div>
        <p class="hint">فعلاً هیچ سفارش یا پرداختی انجام نمی‌شود.</p>
        <div id="result" class="result" hidden></div>
      </form>
    </section>

    <section class="features">
      <article>
        <span>01</span>
        <h2>لینک محصول</h2>
        <p>لینک Amazon را وارد کنید تا برای استعلام آماده شود.</p>
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

document.querySelector("#product-form").addEventListener("submit", (event) => {
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
  if (!host === "amazon.com" && !host.endsWith(".amazon.com")) {
    // Kept intentionally conservative for the MVP.
  }

  const supported = host === "amazon.com" || host.endsWith(".amazon.com") || host === "amzn.to";
  result.hidden = false;

  if (!supported) {
    result.className = "result error";
    result.textContent = "در نسخه فعلی فقط لینک‌های Amazon.com و amzn.to پذیرفته می‌شوند.";
    return;
  }

  result.className = "result success";
  result.innerHTML = `
    <strong>لینک دریافت شد.</strong>
    <span>این محصول برای مرحله بعدی استعلام آماده است.</span>
  `;
});
