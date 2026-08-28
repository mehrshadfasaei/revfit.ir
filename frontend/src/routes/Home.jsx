import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useProducts } from "../hooks/useProducts";
import MobileSliderDots, { useMobileItemSlider } from "../components/ui/MobileItemSlider";
import ProductCard from "../components/ui/ProductCard";
import ProductCardSkeleton from "../components/ui/ProductCardSkeleton";
import { showToast } from "../lib/toast";
import { useAuth } from "../context/AuthContext";

const FEATURED_SKELETON_COUNT = 4;

const SLIDES = [
    {
        image: "/images/slider2 (2).png",
        miniTitle: "کالکشن جدید",
        titleClass: "slogan-en",
        title: (
            <>
                REV like a TIGER <br />
                TRAIN like a BEAST
            </>
        ),
        text: "طرح‌های اختصاصی، روی بهترین پارچه‌ی روز بازار",
        ctaHref: "/products?search=تی‌شرت",
        ctaLabel: "مشاهده تی‌شرت‌ها",
    },
    {
        image: "/images/slider2.png",
        miniTitle: "کالکشن جدید",
        titleClass: null,
        title: "تانک‌تاپ‌های موتورسواری",
        text: "سبک، خنک، مناسب روزهای گرم جاده",
        ctaHref: "/products?search=تانک‌تاپ",
        ctaLabel: "مشاهده تانک‌تاپ‌ها",
    },
];

const FEATURES = [
    { icon: "fa-truck-fast", title: "ارسال سریع", text: "ارسال به سراسر ایران" },
    { icon: "fa-shield-heart", title: "کیفیت تضمینی", text: "متریال درجه یک" },
    { icon: "fa-medal", title: "محصول خاص", text: "طراحی منحصر به فرد" },
    { icon: "fa-credit-card", title: "پرداخت امن", text: "پرداخت آنلاین" },
];

const COUNTERS = [
    { value: "+1200", label: "مشتری راضی" },
    { value: "+3500", label: "محصول فروخته شده" },
    { value: "4.9", label: "امتیاز کاربران" },
    { value: "98%", label: "رضایت مشتری" },
];

/* باگ قدیمی: این ۶ تا به instagram1.jpg...instagram6.jpg اشاره می‌کردن که
   اصلاً توی public/images وجود نداشتن (عکس خراب/خالی نشون می‌داد). با
   ۶ تا از عکس‌های محصول خودمون (طرح‌های چاپی روی تیشرت/هودی) جایگزین شد -
   تنها عکس‌هایی توی پوشه که مطمئنیم مال خودمونه، نه از سایت/برند دیگه. */
const INSTAGRAM_IMAGES = [
    "/images/ChatGPT Image Aug 23, 2026, 03_20_55 PM.png",
    "/images/ChatGPT Image Aug 23, 2026, 03_20_57 PM.png",
    "/images/ChatGPT Image Aug 23, 2026, 03_21_00 PM.png",
    "/images/ChatGPT Image Aug 23, 2026, 03_31_27 PM.png",
    "/images/ChatGPT Image Aug 23, 2026, 03_31_41 PM.png",
    "/images/ChatGPT Image Aug 23, 2026, 03_34_08 PM.png",
];

/**
 * پورت‌شده از html/index.html + js/home.js.
 */
export default function Home() {
    return (
        <>
            <HeroSlider />
            <FeaturedProducts />
            <FeaturesSection />

            <section className="banner">
                <div className="container">
                    <div className="banner-content">
                        <div className="banner-image">
                            <img src="/images/ChatGPT Image Aug 23, 2026, 03_20_48 PM.png" alt="" />
                        </div>
                        <div className="banner-text">
                            <span>Ride Safe</span>
                            <h2>استایل تو فقط یه لباس نیست...</h2>
                            <p>نمادی از آزادی، هویت و احترام به فرهنگ موتورسواری.</p>
                            <Link to="/products" className="btn">
                                مشاهده مجموعه
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <section className="about">
                <div className="container">
                    <div className="about-image">
                        <img src="/images/ChatGPT Image Aug 23, 2026, 03_34_00 PM.png" alt="" />
                    </div>
                    <div className="about-content">
                        <span>درباره برند</span>
                        <h2>ما فقط یه محصول برای زیبایی نمیفروشیم.</h2>
                        <p>
                            هر محصول با الهام از فرهنگ موتورسواری طراحی شده است تا علاوه بر زیبایی، نمادی از آزادی،
                            سبک زندگی و تجربه یک سفر متفاوت باشد.
                        </p>
                        <Link to="/about" className="btn">
                            بیشتر بخوانید
                        </Link>
                    </div>
                </div>
            </section>

            <CounterSection />
            <InstagramSection />
            <AccountCta />
            <NewsletterSection />
        </>
    );
}

function HeroSlider() {
    const [current, setCurrent] = useState(0);
    const timerRef = useRef(null);

    function resetTimer() {
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setCurrent((c) => (c + 1) % SLIDES.length);
        }, 4000);
    }

    useEffect(() => {
        resetTimer();
        return () => clearInterval(timerRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function goToSlide(index) {
        setCurrent(index);
        resetTimer();
    }

    return (
        <section className="hero-slider">
            {SLIDES.map((slide, i) => (
                <div
                    key={i}
                    className={`slider-slide${i === current ? " active" : ""}`}
                    style={{ backgroundImage: `url('${slide.image}')` }}
                >
                    <div className="slider-overlay"></div>
                    <div className="slider-content">
                        <span className="mini-title">{slide.miniTitle}</span>
                        <h1 className={slide.titleClass || undefined}>{slide.title}</h1>
                        <p>{slide.text}</p>
                        <Link to={slide.ctaHref} className="btn">
                            {slide.ctaLabel}
                        </Link>
                    </div>
                </div>
            ))}

            <div className="slider-dots">
                {SLIDES.map((_, i) => (
                    <button
                        key={i}
                        className={`slider-dot${i === current ? " active" : ""}`}
                        data-slide={i}
                        aria-label={`اسلاید ${i + 1}`}
                        onClick={() => goToSlide(i)}
                    ></button>
                ))}
            </div>
        </section>
    );
}

function FeaturedProducts() {
    const { products, loading } = useProducts();

    const featured = [...products].sort((a, b) => b.id - a.id).slice(0, 4);
    const { current, goTo } = useMobileItemSlider(featured.length, 5000);

    return (
        <section className="products">
            <div className="container">
                <div className="section-title">
                    <span>جدیدترین‌ها</span>
                    <h2>محصولات ویژه</h2>
                </div>

                <div className="products-grid" id="featuredProductsGrid">
                    {loading &&
                        Array.from({ length: FEATURED_SKELETON_COUNT }).map((_, i) => (
                            <ProductCardSkeleton key={i} variant="featured" />
                        ))}

                    {!loading && featured.length === 0 && (
                        <p style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 20px", color: "var(--secondary)" }}>
                            ⚠️ در حال حاضر اتصال به فروشگاه برقرار نیست. لطفاً چند لحظه دیگه صفحه رو رفرش کن.
                        </p>
                    )}

                    {!loading &&
                        featured.map((product, i) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                variant="featured"
                                className={i === current ? "mobile-slide-active" : undefined}
                            />
                        ))}
                </div>

                <MobileSliderDots count={featured.length} current={current} onSelect={goTo} />
            </div>
        </section>
    );
}

function FeaturesSection() {
    const { current, goTo } = useMobileItemSlider(FEATURES.length);

    return (
        <section className="features">
            <div className="container">
                {FEATURES.map((f, i) => (
                    <div key={i} className={`feature${i === current ? " mobile-slide-active" : ""}`}>
                        <i className={`fa-solid ${f.icon}`}></i>
                        <h3>{f.title}</h3>
                        <p>{f.text}</p>
                    </div>
                ))}
            </div>
            <MobileSliderDots count={FEATURES.length} current={current} onSelect={goTo} />
        </section>
    );
}

function CounterSection() {
    const { current, goTo } = useMobileItemSlider(COUNTERS.length);

    return (
        <section className="counter">
            <div className="container">
                {COUNTERS.map((c, i) => (
                    <div key={i} className={`counter-box${i === current ? " mobile-slide-active" : ""}`}>
                        <h2>{c.value}</h2>
                        <p>{c.label}</p>
                    </div>
                ))}
            </div>
            <MobileSliderDots count={COUNTERS.length} current={current} onSelect={goTo} />
        </section>
    );
}

function InstagramSection() {
    const { current, goTo } = useMobileItemSlider(INSTAGRAM_IMAGES.length);

    return (
        <section className="instagram">
            <div className="container">
                <div className="section-title">
                    <span>اینستاگرام</span>
                    <h2>ما را در اینستاگرام دنبال کنید</h2>
                </div>

                <div className="instagram-grid">
                    {INSTAGRAM_IMAGES.map((src, i) => (
                        <img key={src} src={src} alt="" className={i === current ? "mobile-slide-active" : undefined} />
                    ))}
                </div>
                <MobileSliderDots count={INSTAGRAM_IMAGES.length} current={current} onSelect={goTo} />
            </div>
        </section>
    );
}

/**
 * دکمه‌ی ورود/ثبت‌نام تو هوم‌پیج - فقط برای بازدیدکننده‌ای که
 * لاگین نیست نشون داده می‌شه (کسی که لاگینه، آیکون حساب کاربری
 * رو تو هدر داره، نیازی به بنر تکراری نیست).
 */
function AccountCta() {
    const { isLoggedIn } = useAuth();

    if (isLoggedIn) return null;

    return (
        <section className="about-cta">
            <div className="container">
                <h2>حساب کاربری بساز و سفارش‌هاتو پیگیری کن</h2>
                <Link to="/login" className="cta-btn">
                    وارد حساب کاربری شوید
                </Link>
            </div>
        </section>
    );
}

function NewsletterSection() {
    const formRef = useRef(null);

    function handleSubmit(e) {
        e.preventDefault();

        const emailInput = formRef.current.querySelector('input[type="email"]');

        if (!emailInput.value.trim()) {
            showToast("⚠️ ایمیلتو وارد کن");
            return;
        }

        /* نمادین: فعلاً ایمیل جایی ذخیره نمی‌شه.
           بعداً باید به یه سرویس خبرنامه یا API خودت وصل بشه. */
        showToast("✅ عضویت شما با موفقیت ثبت شد");
        formRef.current.reset();
    }

    return (
        <section className="newsletter">
            <div className="container">
                <h2>از جدیدترین محصولات باخبر شوید</h2>
                <p>ایمیل خود را وارد کنید.</p>
                <form id="newsletterForm" ref={formRef} onSubmit={handleSubmit}>
                    <input type="email" placeholder="ایمیل شما" required />
                    <button type="submit">عضویت</button>
                </form>
            </div>
        </section>
    );
}
