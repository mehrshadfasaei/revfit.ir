/**
 * فیچر جدیده، معادل قدیمی نداشت - تا وقتی useProducts() هنوز در
 * حال fetch اولیه‌ست به‌جای گرید خالی، چندتا کارت اسکلتی (shimmer)
 * با اندازه‌ی دقیقاً هم‌شکل ProductCard نشون داده می‌شه که کاربر
 * بفهمه محصولات دارن لود می‌شن، نه اینکه چیزی نیست.
 *
 * فقط استایل (.product-card, .product-image, .product-info) رو از
 * کارت واقعی قرض می‌گیره تا اندازه/چیدمان گرید عوض نشه؛ محتوای
 * داخلیش با چندتا خط/باکس خاکستری shimmer جایگزین شده.
 */
export default function ProductCardSkeleton({ variant = "grid" }) {
    const isFeatured = variant === "featured";

    return (
        <div className={`product-card skeleton-card${isFeatured ? " skeleton-card-featured" : ""}`} aria-hidden="true">
            <div className="product-image">
                <div className="skeleton-shimmer skeleton-image"></div>
            </div>

            <div className="product-info">
                <div className="skeleton-shimmer skeleton-line skeleton-line-title"></div>
                {!isFeatured && <div className="skeleton-shimmer skeleton-line skeleton-line-rating"></div>}
                <div className="skeleton-shimmer skeleton-line skeleton-line-price"></div>
                <div className="skeleton-shimmer skeleton-line skeleton-line-btn"></div>
            </div>
        </div>
    );
}
