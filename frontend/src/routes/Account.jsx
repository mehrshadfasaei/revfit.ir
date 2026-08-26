import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import PageBanner from "../components/ui/PageBanner";
import { useAuth } from "../context/AuthContext";
import { formatPrice } from "../lib/format";
import { STATUS_STEPS, formatOrderDate } from "../lib/orderStatus";

const STATUS_LABELS = Object.fromEntries(STATUS_STEPS.map((s) => [s.step, s.label]));

/**
 * پروفایل + تاریخچه‌ی سفارش‌های حساب کاربری. سفارش‌های مهمانی که
 * قبلاً با همین شماره تماس ثبت شده بودن هم اینجا دیده می‌شن
 * (به‌خاطر لینک خودکار موقع تأیید ایمیل - backend/main.py's
 * verify_email).
 */
export default function Account() {
    const { customer, loading, authFetch, logout } = useAuth();
    const navigate = useNavigate();

    const [orders, setOrders] = useState(null);
    const [ordersError, setOrdersError] = useState("");

    useEffect(() => {
        if (!customer) return;

        let cancelled = false;

        authFetch("/api/account/orders")
            .then((res) => {
                if (!res.ok) throw new Error("خطا در دریافت سفارش‌ها");
                return res.json();
            })
            .then((data) => {
                if (!cancelled) setOrders(data);
            })
            .catch(() => {
                if (!cancelled) setOrdersError("در حال حاضر اتصال به فروشگاه برقرار نیست.");
            });

        return () => {
            cancelled = true;
        };
    }, [customer, authFetch]);

    if (loading) return null;

    if (!customer) {
        return <Navigate to="/login" state={{ from: "/account" }} replace />;
    }

    async function handleLogout() {
        await logout();
        navigate("/");
    }

    return (
        <>
            <PageBanner title="حساب کاربری" />

            <section className="auth-page">
                <div className="container">
                    <div className="account-layout">
                        <div className="account-profile-box">
                            <h3>مشخصات حساب</h3>

                            <div className="account-field">
                                <label>نام و نام خانوادگی</label>
                                <span>{customer.full_name}</span>
                            </div>
                            <div className="account-field">
                                <label>ایمیل</label>
                                <span dir="ltr">{customer.email}</span>
                            </div>
                            <div className="account-field">
                                <label>شماره تماس</label>
                                <span dir="ltr">{customer.phone}</span>
                            </div>

                            <button type="button" className="account-logout-btn" onClick={handleLogout}>
                                خروج از حساب
                            </button>
                        </div>

                        <div>
                            <h3 style={{ marginBottom: 18 }}>تاریخچه‌ی سفارش‌ها</h3>

                            {ordersError && <p className="auth-error">{ordersError}</p>}

                            {orders && orders.length === 0 && (
                                <div className="account-orders-empty">
                                    <i className="fa-solid fa-box-open" style={{ fontSize: 32, marginBottom: 12, display: "block" }}></i>
                                    <p>هنوز سفارشی ثبت نکردی.</p>
                                </div>
                            )}

                            {orders &&
                                orders.map((order) => (
                                    <div className="checkout-box" key={order.order_number} style={{ marginBottom: 20 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                                            <div>
                                                <strong>کد پیگیری: {order.order_number}</strong>
                                                <div style={{ color: "var(--secondary)", fontSize: 13, marginTop: 4 }}>
                                                    {formatOrderDate(order.created_at)} — {STATUS_LABELS[order.status] || order.status}
                                                </div>
                                            </div>
                                            <strong>{formatPrice(order.total)} تومان</strong>
                                        </div>

                                        <div className="checkout-items">
                                            {order.items.map((item, i) => (
                                                <div className="checkout-item" key={i}>
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
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
