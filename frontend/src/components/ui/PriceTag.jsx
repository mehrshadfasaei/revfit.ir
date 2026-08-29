import { formatPrice, isDiscounted } from "../../lib/format";

/**
 * فیچر جدیده، معادل قدیمی نداشت - قیمت محصول رو نشون می‌ده؛
 * اگه تخفیف فعال باشه (product.discount_active) قیمت اصلی
 * خط‌خورده + قیمت نهایی (final_price، همونی که واقعاً موقع
 * سفارش از مشتری گرفته می‌شه) رو کنار هم نشون می‌ده.
 *
 * تو سه جا استفاده می‌شه: کارت محصول (ProductCard)، صفحه‌ی
 * جزئیات محصول، و کارت «محصولات مشابه».
 */
export default function PriceTag({ product, id, className = "price" }) {
    if (isDiscounted(product)) {
        return (
            <span className={`${className} price-discounted`} id={id}>
                <span className="price-old">{formatPrice(product.price)} تومان</span>
                <span className="price-new">{formatPrice(product.final_price)} تومان</span>
            </span>
        );
    }

    return (
        <span className={className} id={id}>
            {formatPrice(product.price)} تومان
        </span>
    );
}
