import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getProductById, getProducts } from "../lib/api";
import { addToCart } from "../lib/cart";
import { showToast } from "../lib/toast";
import Stars from "../components/ui/Stars";
import Accordion from "../components/ui/Accordion";
import PriceTag from "../components/ui/PriceTag";
import { useInView } from "../hooks/useInView";

const PLACEHOLDER_RATING = 4.8;
const SIZES = ["S", "M", "L", "XL", "2XL"];

/**
 * پورت‌شده از html/product.html + js/product.js.
 */
export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [notFound, setNotFound] = useState(false);
    const [activeThumb, setActiveThumb] = useState(0);
    const [selectedSize, setSelectedSize] = useState(null);
    const [selectedQuantity, setSelectedQuantity] = useState(1);
    const [sizeError, setSizeError] = useState(false);
    const [zoomStyle, setZoomStyle] = useState({});

    // بارگذاری محصول با تغییر id (وقتی از "محصولات مشابه" به یه محصول دیگه می‌ری)
    useEffect(() => {
        let cancelled = false;

        setProduct(null);
        setNotFound(false);
        setActiveThumb(0);
        setSelectedSize(null);
        setSelectedQuantity(1);

        getProductById(id).then((p) => {
            if (cancelled) return;

            if (!p) {
                setNotFound(true);
                return;
            }

            setProduct(p);
        });

        return () => {
            cancelled = true;
        };
    }, [id]);

    // محصولی با این شناسه پیدا نشد؛ برگرد به لیست محصولات (مثل loadProduct() قدیمی)
    useEffect(() => {
        if (notFound) navigate("/products", { replace: true });
    }, [notFound, navigate]);

    useEffect(() => {
        document.title = product ? `${product.title} | Moto Store` : "RevFit";
    }, [product]);

    if (!product) {
        return (
            <section className="product-main">
                <div className="container">
                    <h1>در حال بارگذاری...</h1>
                </div>
            </section>
        );
    }

    const rating = product.rating ?? PLACEHOLDER_RATING;
    const isOutOfStock = product.in_stock === false;

    const hasManualDescription = product.description && product.description.trim() !== "";
    const autoShortDesc = `${product.title} از دسته «${product.category}»، با کیفیت ساخت بالا و طراحی مقاوم — انتخابی مطمئن برای موتورسواران.`;
    const shortDesc = hasManualDescription ? product.description : autoShortDesc;
    const fullDesc = hasManualDescription
        ? product.description
        : `${autoShortDesc} این محصول با بهترین متریال روز بازار تولید شده و تحت تست‌های استاندارد کیفیت و دوام قرار گرفته. مناسب استفاده روزمره و سفرهای طولانی، با دوخت مقاوم و پارچه‌ی باکیفیت.`;

    const galleryUrls = product.images && product.images.length > 0 ? product.images.map((img) => img.image_url) : [];
    const gallery = [product.image, ...galleryUrls];

    const currentStockBySize = {};
    (product.stock || []).forEach((s) => {
        currentStockBySize[s.size] = s.quantity;
    });

    function requireSizeSelected() {
        if (selectedSize) return true;

        showToast("⚠️ لطفاً یه سایز انتخاب کن");
        setSizeError(true);
        setTimeout(() => setSizeError(false), 1200);
        return false;
    }

    function handleSizeSelect(size) {
        setSelectedSize(size);
        setSelectedQuantity(1); // موجودی سایز جدید ممکنه کمتر از تعداد فعلی باشه
    }

    function handleQuantityPlus() {
        const maxQty = selectedSize ? (currentStockBySize[selectedSize] ?? 0) : Infinity;

        if (selectedQuantity >= maxQty) {
            showToast(`⚠️ فقط ${maxQty} عدد از این سایز موجوده`);
            return;
        }

        setSelectedQuantity((q) => q + 1);
    }

    function handleQuantityMinus() {
        setSelectedQuantity((q) => (q > 1 ? q - 1 : q));
    }

    function handleAddToCart() {
        if (!requireSizeSelected()) return;
        addToCart({ ...product, size: selectedSize }, selectedQuantity);
    }

    function handleBuyNow() {
        if (!requireSizeSelected()) return;
        addToCart({ ...product, size: selectedSize }, selectedQuantity);
        navigate("/checkout");
    }

    function handleShare() {
        if (navigator.share) {
            navigator.share({ title: product.title, url: window.location.href });
        } else {
            navigator.clipboard.writeText(window.location.href);
            showToast("🔗 لینک محصول کپی شد");
        }
    }

    function handleMouseMove(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setZoomStyle({ transformOrigin: `${x}% ${y}%`, transform: "scale(2)" });
    }

    function handleMouseLeave() {
        setZoomStyle({ transformOrigin: "center", transform: "scale(1)" });
    }

    return (
        <>
            <section className="product-breadcrumb-section">
                <div className="container">
                    <div className="breadcrumb">
                        <Link to="/">خانه</Link>
                        <i className="fa-solid fa-chevron-left"></i>
                        <Link to="/products">محصولات</Link>
                        <i className="fa-solid fa-chevron-left"></i>
                        <span id="breadcrumbTitle">{product.title}</span>
                    </div>
                </div>
            </section>

            <section className="product-main">
                <div className="container">
                    <div className="product-main-grid">
                        <div className="product-gallery">
                            <div className="main-image" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
                                <img src={gallery[activeThumb]} alt={product.title} style={zoomStyle} />
                            </div>

                            {gallery.length > 1 && (
                                <div className="thumbs" id="productThumbs">
                                    {gallery.map((src, i) => (
                                        <img
                                            key={i}
                                            src={src}
                                            alt={product.title}
                                            className={i === activeThumb ? "active" : ""}
                                            onClick={() => setActiveThumb(i)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="product-details">
                            <h1 id="productTitle">{product.title}</h1>
                            <span className="stock-badge" id="stockBadge" style={{ display: isOutOfStock ? "inline-block" : "none" }}>
                                ناموجود
                            </span>

                            <div className="product-rating">
                                <span className="stars" id="productStars">
                                    <Stars rating={rating} />
                                </span>
                            </div>

                            <PriceTag product={product} id="productPrice" />

                            <p className="product-short-desc" id="productDescription">
                                {shortDesc}
                            </p>

                            <div className="size-row">
                                <span className="size-label">سایز:</span>
                                <div className={`size-options${sizeError ? " size-error" : ""}`} id="sizeOptions">
                                    {SIZES.map((size) => {
                                        const qty = currentStockBySize[size] ?? 0;
                                        const unavailable = qty <= 0;

                                        return (
                                            <button
                                                key={size}
                                                type="button"
                                                className={`size-btn${unavailable ? " size-unavailable" : ""}${selectedSize === size ? " active" : ""}`}
                                                data-size={size}
                                                disabled={unavailable}
                                                title={unavailable ? "این سایز ناموجوده" : qty <= 3 ? `فقط ${qty} عدد باقی مونده` : ""}
                                                onClick={() => handleSizeSelect(size)}
                                            >
                                                {size}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="selected-size-display" id="selectedSizeDisplay">
                                    {selectedSize ? `سایز انتخابی: ${selectedSize} ✓` : ""}
                                </p>
                            </div>

                            <div className="quantity-row">
                                <span className="quantity-label">تعداد:</span>
                                <div className="quantity">
                                    <button type="button" onClick={handleQuantityMinus}>
                                        −
                                    </button>
                                    <input type="text" value={selectedQuantity} readOnly />
                                    <button type="button" onClick={handleQuantityPlus}>
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className="product-actions-row">
                                <button className="add-cart" disabled={isOutOfStock} onClick={handleAddToCart}>
                                    {isOutOfStock ? (
                                        <>
                                            <i className="fa-solid fa-ban"></i> ناموجود
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-cart-shopping"></i> افزودن به سبد خرید
                                        </>
                                    )}
                                </button>
                                <button className="share-btn" title="اشتراک‌گذاری" onClick={handleShare}>
                                    <i className="fa-solid fa-share-nodes"></i>
                                </button>
                            </div>

                            {!isOutOfStock && (
                                <button className="buy-now-btn" id="buyNowBtn" onClick={handleBuyNow}>
                                    خرید سریع <i className="fa-solid fa-bolt"></i>
                                </button>
                            )}

                            <div className="product-accordion">
                                <div className="accordion-item">
                                    <Accordion title="مشخصات محصول" defaultOpen={true}>
                                        <ul className="product-specs" id="productSpecs">
                                            <li>
                                                <span>دسته‌بندی</span>
                                                <span>{product.category}</span>
                                            </li>
                                            <li>
                                                <span>کد محصول</span>
                                                <span>GS-{String(product.id).padStart(4, "0")}</span>
                                            </li>
                                            <li>
                                                <span>وضعیت</span>
                                                <span className={isOutOfStock ? "spec-out-of-stock" : "spec-in-stock"}>
                                                    {isOutOfStock ? "ناموجود" : "موجود"}
                                                </span>
                                            </li>
                                        </ul>
                                    </Accordion>
                                </div>

                                <div className="accordion-item">
                                    <Accordion title="ارسال و بازگشت کالا">
                                        <p className="accordion-text">
                                            ارسال به سراسر کشور از طریق پست پیشتاز، معمولاً بین ۲ تا ۵ روز کاری. در
                                            صورت وجود هرگونه مشکل یا عدم رضایت، تا ۷ روز پس از دریافت کالا امکان
                                            بازگشت و مرجوعی وجود داره.
                                        </p>
                                    </Accordion>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="product-tabs-section">
                <div className="container">
                    <div className="tab-buttons">
                        <button className="tab-btn active" data-tab="desc">
                            توضیحات محصول
                        </button>
                    </div>
                    <div className="tab-content active" id="desc">
                        <p id="productFullDescription">{fullDesc}</p>
                    </div>
                </div>
            </section>

            <PaymentBadges />
            <RelatedProducts productId={product.id} />
        </>
    );
}

function PaymentBadges() {
    const badges = [
        { icon: "fa-truck-fast", text: "ارسال سریع به سراسر کشور" },
        { icon: "fa-rotate-left", text: "۷ روز ضمانت بازگشت" },
        { icon: "fa-shield-halved", text: "ضمانت اصالت کالا" },
    ];

    return (
        <section className="payment-section">
            <div className="container">
                {badges.map((b) => (
                    <PaymentBox key={b.icon} icon={b.icon} text={b.text} />
                ))}
            </div>
        </section>
    );
}

function PaymentBox({ icon, text }) {
    const [ref, inView] = useInView();

    return (
        <div className={`payment-box${inView ? " show" : ""}`} ref={ref}>
            <i className={`fa-solid ${icon}`}></i>
            <span>{text}</span>
        </div>
    );
}

function RelatedProducts({ productId }) {
    const [related, setRelated] = useState([]);

    useEffect(() => {
        let cancelled = false;

        getProducts().then((all) => {
            if (cancelled) return;
            setRelated(all.filter((p) => p.id !== productId).slice(0, 3));
        });

        return () => {
            cancelled = true;
        };
    }, [productId]);

    return (
        <section className="related-section">
            <div className="container">
                <span className="mini-title">محصولات مشابه</span>
                <h2>شاید این‌ها هم بپسندی</h2>
                <div className="related-grid" id="relatedGrid">
                    {related.map((p) => (
                        <RelatedCard key={p.id} product={p} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function RelatedCard({ product }) {
    const [ref, inView] = useInView();

    return (
        <Link to={`/product/${product.id}`} className={`related-card${inView ? " show" : ""}`} ref={ref}>
            <img src={product.image} alt={product.title} />
            <h4>{product.title}</h4>
            <PriceTag product={product} />
        </Link>
    );
}
