import { Link, useSearchParams } from "react-router-dom";

/**
 * پورت‌شده از checkout.html's #checkoutSuccessState — با این تفاوت
 * که حالا مسیر واقعی خودش رو داره (/checkout/success?order=...)
 * به‌جای جابه‌جایی درجا، پس رفرش/اشتراک‌گذاری هم کار می‌کنه.
 */
export default function CheckoutSuccess() {
    const [searchParams] = useSearchParams();
    const orderNumber = searchParams.get("order");

    return (
        <section className="checkout-success show" id="checkoutSuccessState">
            <div className="container">
                <div className="success-box">
                    <i className="fa-solid fa-circle-check"></i>
                    <h2>سفارش شما با موفقیت ثبت شد</h2>
                    {orderNumber && (
                        <p>
                            شماره سفارش: <span id="orderNumber">{orderNumber}</span>
                        </p>
                    )}
                    <p className="success-note">
                        این یه تسویه‌حساب نمادینه — وقتی به درگاه پرداخت و بک‌اند واقعی وصل بشیم، این مرحله جایگزین
                        می‌شه.
                    </p>
                    <Link to="/" className="btn-continue-shopping">
                        بازگشت به صفحه اصلی
                    </Link>
                </div>
            </div>
        </section>
    );
}
