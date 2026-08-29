/*====================================
        SHARED PRODUCT DATA SOURCE

        از بک‌اند واقعی (FastAPI + SQLite) می‌خونه.

        نکته‌ی مهم درباره‌ی هاست رایگان (Render):
        سرویس رایگان بعد از چند دقیقه بی‌کاری می‌خوابه؛
        اولین درخواست بعد از خواب ممکنه ۳۰-۵۰ ثانیه طول
        بکشه یا حتی یه‌بار fail بشه. برای همین یه‌بار
        دیگه امتحان می‌کنیم قبل از اینکه تسلیم بشیم -
        و اگه واقعاً در دسترس نبود، به‌جای نشون‌دادن
        محصولات ساختگی/قدیمی، صادقانه یه آرایه‌ی خالی
        برمی‌گردونیم تا هر صفحه خودش پیام «اتصال برقرار
        نشد» رو نشون بده.

        (پورت‌شده از js/shop-data.js و js/common.js —
        رفتار دقیقاً یکسانه)
====================================*/

export const API_BASE_URL = "https://revfit-ir.onrender.com";

export async function getProducts(retryCount = 0) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/products`);

        if (!res.ok) throw new Error("API error");

        return await res.json();
    } catch (err) {
        if (retryCount < 2) {
            console.warn(`⚠️ اتصال به بک‌اند برقرار نشد؛ تلاش دوباره... (${retryCount + 1}/2)`);

            await new Promise((resolve) => setTimeout(resolve, 4000));

            return getProducts(retryCount + 1);
        }

        console.error("❌ اتصال به بک‌اند بعد از چند تلاش هم برقرار نشد.", err);

        logClientError(`getProducts failed after retries: ${err.message}`, { stack: err.stack });

        return [];
    }
}

export async function getProductById(id) {
    const products = await getProducts();

    return products.find((p) => p.id === Number(id)) || null;
}

/**
 * فیچر جدیده، معادل قدیمی نداشت - وقتی تو تسویه‌حساب کاربر یه
 * کد تخفیف وارد می‌کنه و «اعمال کد» رو می‌زنه، این صدا زده
 * می‌شه. فقط برای پیش‌نمایشه - محاسبه‌ی نهایی و امن همیشه سمت
 * سرور، توی create_order، دوباره انجام می‌شه.
 */
export async function validateCoupon(code, subtotal) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/coupons/validate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, subtotal }),
        });

        if (!res.ok) return { valid: false, message: "بررسی کد تخفیف با مشکل مواجه شد", discount_amount: 0 };

        return await res.json();
    } catch (err) {
        return { valid: false, message: "اتصال به سرور برقرار نشد", discount_amount: 0 };
    }
}

/*====================================
        CLIENT ERROR LOGGING

        هر خطای واقعی که توی مرورگر مشتری‌ها اتفاق میفته
        (خطای جاوااسکریپت، fetch شکست‌خورده و...) رو
        می‌فرسته بک‌اند تا توی پنل ادمین ببینیمش.
====================================*/

export function logClientError(message, extra = {}) {
    try {
        fetch(`${API_BASE_URL}/api/log-error`, {
            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({
                message: String(message).slice(0, 1000),

                pageUrl: window.location.href,

                userAgent: navigator.userAgent,

                stack: extra.stack ? String(extra.stack).slice(0, 2000) : null,
            }),

            keepalive: true,
        }).catch(() => {}); // اگه خودِ لاگ‌فرستادن هم fail بشه، دیگه کاری نمی‌کنیم (جلوگیری از حلقه‌ی بی‌نهایت)
    } catch (e) {}
}
