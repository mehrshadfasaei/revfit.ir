import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageBanner from "../components/ui/PageBanner";
import { getMergedCart, getCartTotals, saveCart } from "../lib/cart";
import { formatPrice } from "../lib/format";
import { showToast } from "../lib/toast";
import { useAuth } from "../context/AuthContext";

/**
 * پورت‌شده از html/checkout.html + js/checkout.js. دو تا تفاوت
 * آگاهانه با نسخه‌ی قدیمی:
 * ۱. به‌جای جابه‌جایی درجا بین #checkoutFormState و
 *    #checkoutSuccessState (که هیچ URL مجزایی نداشت)، بعد از ثبت
 *    موفق به مسیر /checkout/success?order=... هدایت می‌کنیم.
 * ۲. اگه کاربر لاگین باشه، از authFetch (که خودکار هدر Authorization
 *    رو اضافه می‌کنه) استفاده می‌کنیم تا بک‌اند سفارش رو به
 *    حسابش وصل کنه؛ برای مهمون (بدون accessToken) دقیقاً همون
 *    fetch ساده‌ی قبلی اتفاق می‌افته - authFetch بدون توکن هیچ
 *    هدری اضافه نمی‌کنه.
 */
export default function Checkout() {
    const navigate = useNavigate();
    const formRef = useRef(null);
    const { customer, authFetch } = useAuth();
    const [cart] = useState(() => getMergedCart());
    const [shippingType, setShippingType] = useState("prepaid");
    const [submitting, setSubmitting] = useState(false);
    const [errorFields, setErrorFields] = useState(new Set());

    useEffect(() => {
        if (cart.length === 0) navigate("/cart", { replace: true });
    }, [cart, navigate]);

    if (cart.length === 0) return null;

    const { subtotal, shipping } = getCartTotals(cart);
    const isCodShipping = shippingType === "cod";
    const total = isCodShipping ? subtotal : subtotal + shipping;

    async function handleSubmit(e) {
        e.preventDefault();

        const form = formRef.current;
        const requiredFields = form.querySelectorAll("[required]");

        let isValid = true;
        const nextErrors = new Set();

        requiredFields.forEach((field) => {
            if (!field.value.trim()) {
                isValid = false;
                nextErrors.add(field.name);
            }
        });

        if (!isValid) {
            setErrorFields(nextErrors);
            showToast("⚠️ لطفاً همه‌ی فیلدهای اجباری رو پر کن");
            return;
        }

        const phoneField = form.querySelector('[name="phone"]');
        const phone = phoneField.value.trim();

        if (!/^0\d{10}$/.test(phone)) {
            nextErrors.add("phone");
            setErrorFields(nextErrors);
            showToast("⚠️ شماره تماس رو درست وارد کن (مثلاً ۰۹۱۲۳۴۵۶۷۸۹)");
            return;
        }

        setErrorFields(new Set());

        const agreeTermsEl = document.getElementById("agreeTerms");
        if (agreeTermsEl && !agreeTermsEl.checked) {
            showToast("⚠️ برای ثبت سفارش، باید قوانین رو بپذیری");
            return;
        }

        await placeOrder(form);
    }

    async function placeOrder(form) {
        const formData = new FormData(form);
        setSubmitting(true);

        const payload = {
            fullName: formData.get("fullName"),
            phone: formData.get("phone"),
            province: formData.get("province"),
            city: formData.get("city"),
            address: formData.get("address"),
            postalCode: formData.get("postalCode"),
            paymentMethod: formData.get("payment"),
            shippingPaymentType: formData.get("shippingPaymentType") || "prepaid",
            notes: formData.get("notes") || null,
            website: formData.get("website") || "",
            items: cart.map((item) => ({
                id: item.id,
                title: item.title,
                price: item.price,
                size: item.size || null,
                quantity: item.quantity,
            })),
        };

        try {
            const res = await authFetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.detail || "سفارش ثبت نشد");
            }

            const order = await res.json();

            saveCart([]); // پاک کردن سبد + آپدیت badge (مثل updateCartBadge قدیمی)

            navigate(`/checkout/success?order=${encodeURIComponent(order.order_number)}`);
        } catch (err) {
            console.error(err);
            showToast(`⚠️ ${err.message || "ثبت سفارش با مشکل مواجه شد؛ مطمئن شو بک‌اند روشنه"}`);
            setSubmitting(false);
        }
    }

    const errClass = (name) => (errorFields.has(name) ? " field-error" : "");

    return (
        <>
            <PageBanner title="تسویه‌حساب" className="cart-banner" />

            <section className="checkout-section" id="checkoutFormState">
                <div className="container">
                    <div className="checkout-layout">
                        <form className="checkout-form" id="checkoutForm" ref={formRef} onSubmit={handleSubmit}>
                            <input type="text" name="website" id="honeypotField" className="honeypot-field" tabIndex="-1" autoComplete="off" />

                            <div className="checkout-box">
                                <h3>
                                    <i className="fa-solid fa-truck-fast"></i> اطلاعات ارسال
                                </h3>

                                <div className="form-row">
                                    <label>
                                        نام و نام خانوادگی
                                        <input
                                            type="text"
                                            name="fullName"
                                            required
                                            maxLength={100}
                                            placeholder="مثلاً محمد رضایی"
                                            defaultValue={customer?.full_name || ""}
                                            className={errClass("fullName")}
                                        />
                                    </label>
                                    <label>
                                        شماره تماس
                                        <input
                                            type="tel"
                                            name="phone"
                                            required
                                            maxLength={11}
                                            placeholder="09xxxxxxxxx"
                                            defaultValue={customer?.phone || ""}
                                            className={errClass("phone")}
                                        />
                                    </label>
                                </div>

                                <div className="form-row">
                                    <label>
                                        استان
                                        <input type="text" name="province" required maxLength={50} placeholder="مثلاً تهران" className={errClass("province")} />
                                    </label>
                                    <label>
                                        شهر
                                        <input type="text" name="city" required maxLength={50} placeholder="مثلاً تهران" className={errClass("city")} />
                                    </label>
                                </div>

                                <label>
                                    آدرس کامل
                                    <textarea name="address" required rows={3} maxLength={300} placeholder="خیابان، کوچه، پلاک، واحد" className={errClass("address")}></textarea>
                                </label>

                                <label>
                                    کد پستی
                                    <input type="text" name="postalCode" required maxLength={10} placeholder="۱۰ رقمی" className={errClass("postalCode")} />
                                </label>

                                <label>
                                    توضیحات سفارش (اختیاری)
                                    <textarea name="notes" rows={3} maxLength={500} placeholder="مثلاً زمان مناسب تحویل، بسته‌بندی هدیه، یا هر نکته‌ی دیگه..."></textarea>
                                </label>
                            </div>

                            <div className="checkout-box">
                                <h3>
                                    <i className="fa-solid fa-credit-card"></i> روش پرداخت
                                </h3>

                                <label className="payment-option">
                                    <input type="radio" name="payment" value="zarinpal" defaultChecked />
                                    <span className="payment-option-title">
                                        <i className="fa-solid fa-globe"></i> درگاه زرین‌پال
                                    </span>
                                </label>

                                <label className="payment-option">
                                    <input type="radio" name="payment" value="saman" />
                                    <span className="payment-option-title">
                                        <i className="fa-solid fa-credit-card"></i> درگاه بانک سامان
                                    </span>
                                </label>
                            </div>

                            <div className="checkout-box">
                                <h3>
                                    <i className="fa-solid fa-truck-ramp-box"></i> هزینه‌ی ارسال
                                </h3>

                                <label className="payment-option">
                                    <input
                                        type="radio"
                                        name="shippingPaymentType"
                                        value="prepaid"
                                        checked={shippingType === "prepaid"}
                                        onChange={() => setShippingType("prepaid")}
                                    />
                                    <span className="payment-option-title">
                                        <i className="fa-solid fa-money-bill-wave"></i> هزینه‌ی ارسال به مبلغ سفارش اضافه بشه
                                    </span>
                                </label>

                                <label className="payment-option">
                                    <input
                                        type="radio"
                                        name="shippingPaymentType"
                                        value="cod"
                                        checked={shippingType === "cod"}
                                        onChange={() => setShippingType("cod")}
                                    />
                                    <span className="payment-option-title">
                                        <i className="fa-solid fa-truck-fast"></i> پس‌کرایه (خودم موقع تحویل به مأمور پست پرداخت می‌کنم)
                                    </span>
                                </label>
                            </div>
                        </form>

                        <aside className="checkout-summary">
                            <h3>خلاصه سفارش</h3>

                            <div className="checkout-items" id="checkoutItems">
                                {cart.map((item) => (
                                    <div className="checkout-item" key={`${item.id}-${item.size || ""}`}>
                                        <img src={item.image} alt={item.title} />
                                        <div className="checkout-item-info">
                                            <h4>{item.title}</h4>
                                            <span>
                                                {item.size ? `سایز: ${item.size} | ` : ""}تعداد: {item.quantity}
                                            </span>
                                        </div>
                                        <span className="checkout-item-price">{formatPrice(item.price * item.quantity)} تومان</span>
                                    </div>
                                ))}
                            </div>

                            <div className="summary-row">
                                <span>جمع جزء</span>
                                <span id="checkoutSubtotal">{formatPrice(subtotal)} تومان</span>
                            </div>
                            <div className="summary-row">
                                <span>هزینه ارسال</span>
                                <span id="checkoutShipping">{isCodShipping ? "پس‌کرایه" : `${formatPrice(shipping)} تومان`}</span>
                            </div>
                            <div className="summary-row summary-total">
                                <span>مبلغ قابل پرداخت</span>
                                <span id="checkoutTotal">{formatPrice(total)} تومان</span>
                            </div>

                            <label className="terms-agree-row">
                                <input type="checkbox" id="agreeTerms" />
                                <span>
                                    <Link to="/terms" target="_blank" className="terms-link">
                                        قوانین
                                    </Link>{" "}
                                    را خوانده‌ام و می‌پذیرم
                                </span>
                            </label>

                            <button type="submit" form="checkoutForm" className="checkout-btn" disabled={submitting}>
                                {submitting ? "در حال ثبت سفارش..." : (
                                    <>
                                        ثبت سفارش <i className="fa-solid fa-arrow-left"></i>
                                    </>
                                )}
                            </button>

                            <Link to="/cart" className="continue-link">
                                <i className="fa-solid fa-arrow-right"></i> بازگشت به سبد خرید
                            </Link>
                        </aside>
                    </div>
                </div>
            </section>
        </>
    );
}
