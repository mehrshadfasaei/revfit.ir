import { useRef, useState } from "react";
import PageBanner from "../components/ui/PageBanner";
import { API_BASE_URL } from "../lib/api";
import { formatPrice } from "../lib/format";

const STATUS_ORDER = ["pending", "paid", "shipped", "delivered"];

const STEPS = [
    { step: "pending", icon: "fa-file-circle-check", label: "ثبت سفارش" },
    { step: "paid", icon: "fa-money-check-dollar", label: "در حال پردازش" },
    { step: "shipped", icon: "fa-truck-fast", label: "ارسال شده" },
    { step: "delivered", icon: "fa-box-open", label: "تحویل داده شده" },
];

function formatOrderDate(createdAt) {
    try {
        return new Date(createdAt).toLocaleDateString("fa-IR");
    } catch (err) {
        return new Date(createdAt).toISOString().slice(0, 10);
    }
}

/**
 * پورت‌شده از html/track-order.html + js/track-order.js.
 */
export default function TrackOrder() {
    const formRef = useRef(null);
    const resultRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [order, setOrder] = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();

        setError("");

        const formData = new FormData(formRef.current);
        const orderNumber = formData.get("orderNumber").trim();
        const phone = formData.get("phone").trim();

        setLoading(true);

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/orders/${encodeURIComponent(orderNumber)}?phone=${encodeURIComponent(phone)}`,
            );

            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.detail || "سفارشی با این مشخصات پیدا نشد");
            }

            const data = await res.json();
            setOrder(data);

            // مثل قبل: بعد از رندر نتیجه، به اون بخش اسکرول کن
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
        } catch (err) {
            setError(`⚠️ ${err.message}`);
        } finally {
            setLoading(false);
        }
    }

    const currentIndex = order ? STATUS_ORDER.indexOf(order.status) : -1;

    return (
        <>
            <PageBanner title="پیگیری سفارش" />

            <section className="static-page">
                <div className="container">
                    <div className="track-order-box">
                        <p className="track-order-intro">
                            کد پیگیری سفارشت (که موقع ثبت سفارش و توی پیامک تأییدیه بهت داده شد) و شماره تماسی که موقع
                            ثبت سفارش وارد کردی رو اینجا بزن.
                        </p>

                        <form id="trackOrderForm" className="track-order-form" ref={formRef} onSubmit={handleSubmit}>
                            <label>
                                کد پیگیری
                                <input type="text" name="orderNumber" maxLength={20} placeholder="مثلاً GS-123456" required />
                            </label>

                            <label>
                                شماره تماس
                                <input type="tel" name="phone" maxLength={11} placeholder="۰۹xxxxxxxxx" required />
                            </label>

                            <button type="submit" className="btn track-order-submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <i className="fa-solid fa-spinner fa-spin"></i> در حال جستجو...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-magnifying-glass"></i> پیگیری سفارش
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="track-order-error" id="trackOrderError">
                            {error}
                        </p>
                    </div>

                    <div
                        className="track-order-result"
                        id="trackOrderResult"
                        ref={resultRef}
                        style={{ display: order ? "block" : "none" }}
                    >
                        {order && (
                            <>
                                <div className="track-order-summary">
                                    <div>
                                        <span className="track-order-label">کد پیگیری</span>
                                        <span className="track-order-value" id="resultOrderNumber">
                                            {order.order_number}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="track-order-label">تاریخ ثبت</span>
                                        <span className="track-order-value" id="resultOrderDate">
                                            {formatOrderDate(order.created_at)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="track-order-label">مبلغ کل</span>
                                        <span className="track-order-value" id="resultOrderTotal">
                                            {formatPrice(order.total)} تومان
                                        </span>
                                    </div>
                                </div>

                                <div className="order-timeline" id="orderTimeline">
                                    {STEPS.map(({ step, icon, label }) => {
                                        const stepIndex = STATUS_ORDER.indexOf(step);
                                        const cls =
                                            (stepIndex < currentIndex ? " done" : "") +
                                            (stepIndex === currentIndex ? " current" : "");

                                        return (
                                            <div className={`order-timeline-step${cls}`} data-step={step} key={step}>
                                                <span className="order-timeline-icon">
                                                    <i className={`fa-solid ${icon}`}></i>
                                                </span>
                                                <span className="order-timeline-label">{label}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="track-order-items" id="trackOrderItems">
                                    <h4>اقلام سفارش</h4>
                                    <ul>
                                        {order.items.map((item, i) => (
                                            <li key={i}>
                                                <span>
                                                    {item.title}
                                                    {item.size ? ` (سایز ${item.size})` : ""} × {item.quantity}
                                                </span>
                                                <span>{formatPrice(item.price * item.quantity)} تومان</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </section>
        </>
    );
}
