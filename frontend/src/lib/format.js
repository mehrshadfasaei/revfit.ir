/*====================================
        SHARED HELPERS
        (پورت‌شده از js/shop-data.js)
====================================*/

/**
 * تشخیص این‌که یه محصول واقعاً الان تخفیف‌خورده نشون داده بشه یا
 * نه - هم فعال بودن تخفیف رو چک می‌کنه هم اینکه final_price
 * واقعاً کمتر از price باشه (محض احتیاط، اگه بک‌اند final_price
 * رو نفرستاده باشه - مثلاً یه پاسخ mock قدیمی - چیزی نشکنه).
 */
export function isDiscounted(product) {
    return Boolean(
        product &&
        product.discount_active &&
        product.final_price != null &&
        product.final_price < product.price
    );
}

export function formatPrice(number) {
    try {
        return number.toLocaleString("fa-IR");
    } catch (err) {
        // بعضی گوشی‌های اندرویدی (مخصوصاً ارزون‌قیمت یا نسخه‌ی
        // قدیمی مرورگر) دیتای زبان فارسی رو کامل ندارن و این
        // تابع خطا می‌ده - اگه اینجا throw کنه، چون formatPrice
        // برای هر محصول صدا زده می‌شه، کل لیست محصولات لود نمی‌شه.
        // برای همین یه فرمت دستی جایگزین (با کاما) داریم که همیشه
        // کار می‌کنه، فارغ از این‌که مرورگر چی پشتیبانی می‌کنه.
        return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
}
