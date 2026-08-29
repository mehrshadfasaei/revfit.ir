import { showToast } from "./toast";

/*====================================
        SHARED CART HELPERS

        پورت‌شده از js/shop-data.js + js/common.js —
        همون کلید localStorage ("cart") و همون شکل
        داده، برای سازگاری با سبد خرید فعلی کاربرها.

        تفاوت با نسخه‌ی قدیمی: به‌جای این‌که مستقیم
        DOM رو (".cart-count") آپدیت کنیم، یه custom
        event ("cart:updated") پخش می‌کنیم؛ هوک
        useCartBadge بهش گوش می‌ده و badge رو آپدیت
        می‌کنه. رفتار قابل‌مشاهده (چه‌موقع badge عوض
        می‌شه) دقیقاً همونه.
====================================*/

export const SHIPPING_COST = 250000; // نمادین - بعداً از قوانین ارسال واقعی محاسبه می‌شه

function notifyCartUpdated() {
    window.dispatchEvent(new Event("cart:updated"));
}

export function getCartCount() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    return cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
}

export function addToCart(product, quantity = 1) {
    const cartItem = {
        id: product.id,
        title: product.title,
        // اگه تخفیف فعال باشه، همون قیمت نهایی (final_price) ذخیره
        // می‌شه تا چیزی که تو سبد/تسویه‌حساب نشون داده می‌شه با
        // مبلغی که واقعاً موقع ثبت سفارش از سرور محاسبه می‌شه یکی
        // باشه - سرور همیشه مستقل از این مقدار، از روی دیتابیس
        // دوباره محاسبه می‌کنه، این فقط برای نمایش درسته.
        price: product.final_price ?? product.price,
        image: product.image,
        size: product.size || null,
        quantity: quantity,
    };

    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    cart.push(cartItem);

    localStorage.setItem("cart", JSON.stringify(cart));

    notifyCartUpdated();

    showToast("🛒 محصول به سبد خرید اضافه شد");
}

export function getMergedCart() {
    const raw = JSON.parse(localStorage.getItem("cart")) || [];

    const merged = [];

    raw.forEach((item) => {
        const existing = merged.find((m) => m.id === item.id && (m.size || null) === (item.size || null));

        if (existing) {
            existing.quantity += item.quantity || 1;
        } else {
            merged.push({ ...item, quantity: item.quantity || 1 });
        }
    });

    return merged;
}

export function saveCart(items) {
    localStorage.setItem("cart", JSON.stringify(items));

    notifyCartUpdated();
}

export function getCartTotals(cart) {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const shipping = cart.length > 0 ? SHIPPING_COST : 0;

    return { subtotal, shipping, total: subtotal + shipping };
}
