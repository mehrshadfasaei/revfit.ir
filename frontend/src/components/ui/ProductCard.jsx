import { Link } from "react-router-dom";
import Stars from "./Stars";
import { formatPrice } from "../../lib/format";

const PLACEHOLDER_RATING = 4.8;

function secondImageOf(product) {
    return product.images && product.images.length > 0 ? product.images[0].image_url : null;
}

/**
 * سه ظاهر متفاوت که کارت محصول امروز داره (هرکدوم توی یه فایل
 * جدا بود، markup واقعاً فرق داره، فقط کلاس ".product-card"
 * مشترکه) با یه prop به اسم variant انتخاب می‌شن:
 *
 *  - "grid"     — products.js's renderGrid (کل کارت لینکه، برند‌بج،
 *                 sold-out overlay)
 *  - "featured" — home.js's renderFeaturedProducts (بدون قیمت/امتیاز،
 *                 فقط عنوان + دکمه‌ی «مشاهده محصول»)
 *  - "wishlist" — wishlist.js's renderWishlist (امتیاز+تعداد نظر،
 *                 دکمه‌ی حذف از علاقه‌مندی + افزودن به سبد)
 */
export default function ProductCard({ product, variant = "grid", onRemoveFromWishlist, onAddToCart, className }) {
    const rating = product.rating ?? PLACEHOLDER_RATING;
    const isOutOfStock = product.in_stock === false;
    const secondImage = secondImageOf(product);
    const href = `/product/${product.id}`;
    const rootClass = `product-card${className ? ` ${className}` : ""}`;

    if (variant === "featured") {
        return (
            <div className={rootClass}>
                <div className="product-image">
                    <Link to={href}>
                        <img src={product.image} alt={product.title} className="product-image-main" />
                        {secondImage && <img src={secondImage} alt={product.title} className="product-image-hover" />}
                    </Link>
                    {isOutOfStock && <span className="out-of-stock-badge">ناموجود</span>}
                </div>

                <div className="product-info">
                    <Link to={href}>
                        <h3>{product.title}</h3>
                    </Link>
                    <Link to={href} className="home-view-product">
                        مشاهده محصول
                    </Link>
                </div>
            </div>
        );
    }

    if (variant === "wishlist") {
        const reviews = product.reviews ?? 0; // پورت‌شده از wishlist.js، با رفع باگ PLACEHOLDER_REVIEWS نامعتبر

        return (
            <div className={rootClass}>
                <div className="product-image">
                    <span className="brand-badge">GS</span>
                    <Link to={href}>
                        <img src={product.image} alt={product.title} />
                    </Link>
                </div>

                <div className="product-info">
                    <h3>{product.title}</h3>
                    <div className="product-rating">
                        <span className="stars">
                            <Stars rating={rating} />
                        </span>
                        <span className="review-count">({reviews})</span>
                    </div>
                    <span className="price">{formatPrice(product.price)} تومان</span>
                </div>

                <div className="product-actions">
                    <button
                        className="action-icon card-wishlist-btn active"
                        data-id={product.id}
                        title="حذف از علاقه‌مندی‌ها"
                        onClick={() => onRemoveFromWishlist?.(product.id)}
                    >
                        <i className="fa-solid fa-heart"></i>
                    </button>
                    <button className="add-to-cart-btn" data-id={product.id} onClick={() => onAddToCart?.(product)}>
                        افزودن به سبد خرید
                    </button>
                </div>
            </div>
        );
    }

    // variant === "grid" (products.js)
    return (
        <div className={rootClass}>
            <div className="product-image">
                <span className="brand-badge">GS</span>
                <Link to={href}>
                    <img
                        src={product.image}
                        alt={product.title}
                        className={`product-image-main${isOutOfStock ? " is-out-of-stock" : ""}`}
                    />
                    {secondImage && <img src={secondImage} alt={product.title} className="product-image-hover" />}
                </Link>
                {isOutOfStock && <span className="sold-out-overlay">ناموجود</span>}
            </div>

            <Link to={href} className="product-info">
                <h3>{product.title}</h3>
                <div className="product-rating">
                    <span className="stars">
                        <Stars rating={rating} />
                    </span>
                </div>
                <span className="price">{formatPrice(product.price)} تومان</span>
                {isOutOfStock && <span className="card-out-of-stock-label">ناموجود</span>}
            </Link>
        </div>
    );
}
