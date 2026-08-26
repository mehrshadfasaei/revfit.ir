import { Link } from "react-router-dom";
import PageBanner from "../components/ui/PageBanner";

/**
 * پورت‌شده از html/about.html (استاتیک، بدون JS مخصوص).
 */
export default function About() {
    return (
        <>
            <PageBanner title="درباره ما" />

            <section className="our-story">
                <div className="container">
                    <div className="story-grid">
                        <div className="story-image">
                            <img src="/images/Gemini_Generated_Image_x0wviwx0wviwx0wv.png" alt="Guardian Shop" />
                        </div>
                        <div className="story-content">
                            <span className="mini-title">داستان ما</span>
                            <h2>از عشق به موتورسواری شروع شد</h2>
                            <p>
                                RevFit از دل علاقه‌ی چندساله به دنیای موتورسواری متولد شد. هدف ما ساده بود: پوشاکی
                                بسازیم که هم کیفیت واقعی داشته باشن هم حس و حال واقعی بایکرها رو منتقل کنن.
                            </p>
                            <p>
                                امروز با افتخار تی‌شرت و هودی‌هایی با طرح‌های اختصاصی موتورسواری رو با بهترین متریال
                                روز بازار تولید می‌کنیم و به دست موتورسوارهای سراسر کشور می‌رسونیم.
                            </p>
                            <div className="story-badges">
                                <div className="story-badge">
                                    <i className="fa-solid fa-gem"></i>
                                    <span>ساخت با کیفیت بالا</span>
                                </div>
                                <div className="story-badge">
                                    <i className="fa-solid fa-shield-halved"></i>
                                    <span>ضمانت اصالت کالا</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="counter">
                <div className="container">
                    <div className="counter-box">
                        <h2>+1200</h2>
                        <p>مشتری راضی</p>
                    </div>
                    <div className="counter-box">
                        <h2>+3500</h2>
                        <p>محصول فروخته شده</p>
                    </div>
                    <div className="counter-box">
                        <h2>4.9</h2>
                        <p>امتیاز کاربران</p>
                    </div>
                    <div className="counter-box">
                        <h2>98%</h2>
                        <p>رضایت مشتری</p>
                    </div>
                </div>
            </section>

            <section className="why-us">
                <div className="container">
                    <div className="section-title">
                        <span>چرا ما؟</span>
                        <h2>چرا مشتریان ما را انتخاب می‌کنند؟</h2>
                    </div>

                    <div className="why-grid">
                        <div className="why-card">
                            <i className="fa-solid fa-gem"></i>
                            <h3>کیفیت بالا</h3>
                            <p>استفاده از بهترین متریال</p>
                        </div>
                        <div className="why-card">
                            <i className="fa-solid fa-shield"></i>
                            <h3>ضمانت اصالت</h3>
                            <p>تمام محصولات اورجینال هستند.</p>
                        </div>
                        <div className="why-card">
                            <i className="fa-solid fa-gift"></i>
                            <h3>بسته بندی خاص</h3>
                            <p>مناسب هدیه دادن</p>
                        </div>
                        <div className="why-card">
                            <i className="fa-solid fa-headset"></i>
                            <h3>پشتیبانی</h3>
                            <p>همیشه کنار شما هستیم.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="about-cta">
                <div className="container">
                    <h2>آماده‌ای محصول موردعلاقه‌تو پیدا کنی؟</h2>
                    <Link to="/products" className="cta-btn">
                        مشاهده محصولات
                    </Link>
                </div>
            </section>
        </>
    );
}
